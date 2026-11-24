<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { GLTF } from "@threlte/extras";
  import { createEventDispatcher } from "svelte";
  import * as THREE from "three";

  export let modelUrl: string;
  export let animation: string;

  const dispatch = createEventDispatcher();

  let group: THREE.Group;
  let loadedScene: THREE.Group | null = null;
  let t = 0;

  // Primary limb roots
  let leftArmRoot: THREE.Object3D | null = null;
  let rightArmRoot: THREE.Object3D | null = null;
  let leftForeArmRoot: THREE.Object3D | null = null;
  let rightForeArmRoot: THREE.Object3D | null = null;
  let leftLegRoot: THREE.Object3D | null = null;
  let rightLegRoot: THREE.Object3D | null = null;
  let leftKneeRoot: THREE.Object3D | null = null;
  let rightKneeRoot: THREE.Object3D | null = null;
  // Body bones
  let hipsRoot: THREE.Object3D | null = null;
  let spineRoot: THREE.Object3D | null = null;

  let scanned = false;

  function findBone(
    bones: THREE.Object3D[],
    ...names: string[]
  ): THREE.Object3D | null {
    for (const name of names) {
      const n = name.toLowerCase();
      const found = bones.find((b) => b.name.toLowerCase() === n);
      if (found) return found;
    }
    // Partial-match fallback (handles prefix namespaces like "mixamorig:")
    for (const name of names) {
      const n = name.toLowerCase();
      const found = bones.find((b) => b.name.toLowerCase().includes(n));
      if (found) return found;
    }
    return null;
  }

  // Each rig orients its bones differently, so rotations are given in the
  // CHARACTER's frame (the `group`, where the ninja faces +Z and its left
  // is +X) and converted once, at rest, into each bone's parent space:
  //   pitch = about +X: limb swings back (+) / forward (−); spine leans forward (+)
  //   yaw   = about +Y: turn
  //   roll  = about +Z: hanging limb swings toward the character's left (+)
  function storeRest(bone: THREE.Object3D) {
    if (bone.userData.rest || !bone.parent || !group) return;
    const groupQ = group.getWorldQuaternion(new THREE.Quaternion());
    const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    // group frame → bone's parent frame
    const toParent = groupQ.clone().invert().multiply(parentQ).invert();

    // Elbow/knee hinge: perpendicular to the bone and to the character's
    // forward axis, so flexing folds the limb forward (+) toward +Z.
    let hinge: THREE.Vector3 | null = null;
    const child = bone.children.find((c: any) => c.isBone);
    if (child) {
      const a = bone.getWorldPosition(new THREE.Vector3());
      const b = child.getWorldPosition(new THREE.Vector3());
      const dir = b.sub(a).applyQuaternion(groupQ.clone().invert()).normalize();
      const h = dir.cross(new THREE.Vector3(0, 0, 1));
      if (h.lengthSq() > 1e-6) hinge = h.normalize().applyQuaternion(toParent);
    }

    bone.userData.rest = {
      hinge,
      q: bone.quaternion.clone(),
      x: new THREE.Vector3(1, 0, 0).applyQuaternion(toParent),
      y: new THREE.Vector3(0, 1, 0).applyQuaternion(toParent),
      z: new THREE.Vector3(0, 0, 1).applyQuaternion(toParent),
    };
  }

  function resetRot(bone: THREE.Object3D | null) {
    if (!bone?.userData.rest) return;
    bone.quaternion.copy(bone.userData.rest.q);
  }

  const _q = new THREE.Quaternion();

  function scanModel() {
    const root = loadedScene ?? group;
    if (!root) return;

    leftArmRoot = rightArmRoot = leftForeArmRoot = rightForeArmRoot = null;
    leftLegRoot = rightLegRoot = leftKneeRoot = rightKneeRoot = null;
    hipsRoot = spineRoot = null;

    root.updateMatrixWorld(true);

    // Collect all bones from SkinnedMesh skeletons
    const boneSet = new Set<THREE.Object3D>();
    root.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton?.bones) {
        child.skeleton.bones.forEach((b: THREE.Object3D) => {
          if (!boneSet.has(b)) {
            boneSet.add(b);
            storeRest(b);
          }
        });
      }
    });
    // Fallback: isBone traversal
    if (!boneSet.size) {
      root.traverse((child: any) => {
        if (child.isBone && !boneSet.has(child)) {
          boneSet.add(child);
          storeRest(child);
        }
      });
    }

    const allBones = [...boneSet];

    if (!allBones.length) {
      scanned = true;
      return;
    }

    // Direct Mixamo name lookup (most reliable when bones are named)
    leftArmRoot = findBone(allBones,
      "LeftArm", "LeftShoulder", "mixamorig:LeftArm",
      "upperarm_l", "upper_arm_l", "LeftUpperArm", "arm_l",
    );
    rightArmRoot = findBone(allBones,
      "RightArm", "RightShoulder", "mixamorig:RightArm",
      "upperarm_r", "upper_arm_r", "RightUpperArm", "arm_r",
    );
    leftForeArmRoot = findBone(allBones,
      "LeftForeArm", "mixamorig:LeftForeArm",
      "forearm_l", "LeftLowerArm",
    );
    rightForeArmRoot = findBone(allBones,
      "RightForeArm", "mixamorig:RightForeArm",
      "forearm_r", "RightLowerArm",
    );
    leftLegRoot = findBone(allBones, "LeftUpLeg", "mixamorig:LeftUpLeg", "thigh_l", "LeftUpperLeg");
    rightLegRoot = findBone(allBones, "RightUpLeg", "mixamorig:RightUpLeg", "thigh_r", "RightUpperLeg");
    leftKneeRoot = findBone(allBones, "LeftLeg", "mixamorig:LeftLeg", "calf_l", "LeftLowerLeg");
    rightKneeRoot = findBone(allBones, "RightLeg", "mixamorig:RightLeg", "calf_r", "RightLowerLeg");
    hipsRoot = findBone(allBones, "Hips", "Hip", "mixamorig:Hips", "pelvis", "root");
    spineRoot = findBone(allBones, "Spine", "Spine01", "mixamorig:Spine", "spine_01");

    console.log('[ninja] bones found:', {
      leftArm:  leftArmRoot?.name  ?? 'MISSING',
      rightArm: rightArmRoot?.name ?? 'MISSING',
      leftFore: leftForeArmRoot?.name  ?? 'MISSING',
      rightFore: rightForeArmRoot?.name ?? 'MISSING',
      hips: hipsRoot?.name ?? 'MISSING',
      leftLeg: leftLegRoot?.name ?? 'MISSING',
      rightLeg: rightLegRoot?.name ?? 'MISSING',
    });
    if (!leftArmRoot && !rightArmRoot) {
      console.warn('[ninja] ARM BONES MISSING — all bone names:', allBones.map(b => b.name).join(', '));
    }

    scanned = true;
  }

  $: if (modelUrl) {
    scanned = false;
    loadedScene = null;
  }

  // Center the model and normalize its height. GLBs come with an
  // arbitrary origin, so without this the body sits off-center and the
  // BASE_Y rotation swings it sideways.
  function normalizeModel() {
    if (!loadedScene) return;
    // Tripo image-to-3D meshes can come out facing +X (shoulders along Z).
    // If the model is deeper than it is wide, turn it -90° to face the camera.
    const raw = new THREE.Box3().setFromObject(loadedScene).getSize(new THREE.Vector3());
    if (raw.z > raw.x) loadedScene.rotation.y -= Math.PI / 2;
    loadedScene.parent?.updateWorldMatrix(true, false);
    loadedScene.updateMatrixWorld(true);
    // Measure in the PARENT frame (not the model's local frame): GLB
    // roots often carry their own rotation (Z-up exports), so offsets
    // computed in local coords land on the wrong axis.
    const box = new THREE.Box3().setFromObject(loadedScene);
    if (loadedScene.parent) {
      box.applyMatrix4(loadedScene.parent.matrixWorld.clone().invert());
    }
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    if (!size.y) return;
    // ~1.35 parent units tall (×1.5 outer group ≈ 2.0 world, same as the
    // old Tripo framing) keeps the head clear of the top nav; feet at the
    // group origin.
    const s = 1.35 / size.y;
    // Uniform scale about the object's origin moves a point p to
    // t + s·(p − t), where t is the current position.
    const t = loadedScene.position;
    const newCenterX = t.x + s * (center.x - t.x);
    const newCenterZ = t.z + s * (center.z - t.z);
    const newMinY = t.y + s * (box.min.y - t.y);
    loadedScene.scale.multiplyScalar(s);
    loadedScene.position.set(t.x - newCenterX, t.y - newMinY, t.z - newCenterZ);
  }

  function onModelLoad(gltf: any) {
    loadedScene = (gltf?.scene as THREE.Group) ?? null;
    normalizeModel();

    scanned = false;
    requestAnimationFrame(() => requestAnimationFrame(() => scanModel()));
  }

  useTask((delta) => {
    t += delta;
    if (!group) return;
    if (!scanned) scanModel();

    // ── Helpers ────────────────────────────────────────────────────
    // flex(bone, angle): bend at the joint so the limb folds forward/up
    const flex = (bone: THREE.Object3D | null, angle: number) => {
      const r = bone?.userData.rest;
      if (!bone || !r?.hinge) return;
      bone.quaternion.copy(r.q).premultiply(_q.setFromAxisAngle(r.hinge, angle));
    };

    // set(bone, pitch, yaw, roll): rest pose + rotation in the character frame
    const set = (bone: THREE.Object3D | null, pitch = 0, yaw = 0, roll = 0) => {
      const r = bone?.userData.rest;
      if (!bone || !r) return;
      bone.quaternion.copy(r.q);
      if (roll) bone.quaternion.premultiply(_q.setFromAxisAngle(r.z, roll));
      if (yaw) bone.quaternion.premultiply(_q.setFromAxisAngle(r.y, yaw));
      if (pitch) bone.quaternion.premultiply(_q.setFromAxisAngle(r.x, pitch));
    };
    const reset = (...bones: (THREE.Object3D | null)[]) =>
      bones.forEach(resetRot);

    // Base group Y keeps the 3/4 turn set on the T.Group prop.
    // Animations that call group.rotation.set() must include it.
    const BASE_Y = 0.35;

    if (animation === "jump") {
      // ── Flying ninja leap: knees tucked, spine lean, arms spread ──
      const phase = (t * 1.6) % (Math.PI * 2);
      const arc  = Math.max(0, Math.sin(phase));
      const land = Math.max(0, -Math.sin(phase));

      // Y only on group — no X compound tilt. Lean via spine instead.
      group.rotation.set(0, BASE_Y, 0);
      group.position.set(0, arc * 0.18, 0);

      // Tuck: thighs come up in front, lower legs fold back under
      set(rightLegRoot,  -arc * 1.2 + land * 0.15);
      set(leftLegRoot,   -arc * 0.9 + land * 0.12);
      set(rightKneeRoot,  arc * 1.7 + land * 0.3);
      set(leftKneeRoot,   arc * 1.5 + land * 0.3);

      // Arms sweep back and flare out on the rise, forearms trailing
      set(rightArmRoot, arc * 0.6, 0, -arc * 0.35);
      set(leftArmRoot,  arc * 0.6, 0,  arc * 0.35);
      set(rightForeArmRoot, -arc * 0.4);
      set(leftForeArmRoot,  -arc * 0.4);

      // Forward lean from the spine; hips tip back a touch
      set(spineRoot, arc * 0.3);
      set(hipsRoot, -arc * 0.1);
    } else if (animation === "kick") {
      // ── Ninja side kick: chamber → pivot & extend → retract → plant ──
      // Phased timeline instead of raw sines: each seg() eases 0→1 over
      // its window of the cycle, and every pose term sums back to 0 by
      // the end of the loop so the wrap-around doesn't pop.
      const cycle = (t * 0.5) % 1;
      const ease = (x: number) => x * x * (3 - 2 * x);
      const seg = (a: number, b: number) =>
        ease(Math.min(1, Math.max(0, (cycle - a) / (b - a))));

      const wind    = seg(0.05, 0.28); // chamber: knee rises, leg folded
      const snap    = seg(0.28, 0.4);  // lower leg whips out sideways
      const retract = seg(0.58, 0.72); // refold after the held extension
      const plant   = seg(0.72, 0.92); // lower back to stance

      const strike = snap - retract;        // 1 while leg is extended (held)
      const lift   = wind + strike * 0.5 - plant; // thigh height
      const fold   = (wind - snap + retract - plant) * 1.7; // knee bend
      const guard  = wind - plant;          // arms-crossed window

      // Pivot the whole body into the kick (like turning the support
      // foot) so the side profile faces the camera at full extension.
      group.rotation.set(0, BASE_Y + strike * 0.5, 0);
      group.position.set(0, -guard * 0.02 + strike * 0.04, 0);

      // Kicking leg (right): pitch lifts the thigh in front, roll swings
      // it out to the character's right at extension.
      set(rightLegRoot, -lift * 1.15, 0, -strike * 0.9);
      set(rightKneeRoot, fold);

      // Support leg: slight bend for balance
      set(leftLegRoot,  -lift * 0.15);
      set(leftKneeRoot,  lift * 0.25);

      // Torso leans away from the kick (to the character's left) to
      // counterbalance — the diagonal body line that sells a side kick.
      set(spineRoot, strike * 0.1, 0, -strike * 0.35);

      // Guard: upper arms come forward and in, forearms fold up
      set(rightArmRoot, -guard * 0.5, 0,  guard * 0.3);
      set(leftArmRoot,  -guard * 0.5, 0, -guard * 0.3);
      set(rightForeArmRoot, -guard * 1.2);
      set(leftForeArmRoot,  -guard * 1.2);
      reset(hipsRoot);
    } else {
      // ── Battle idle: low fighting stance, guard up, breathing bounce ──
      const breathe = Math.sin(t * 2.2);        // quick, light bounce
      const sway = Math.sin(t * 0.8);           // slow weight shift
      group.rotation.set(0, BASE_Y, 0);
      // Bent knees lower the hips; drop the body so the feet stay planted
      group.position.set(0, -0.08 + breathe * 0.012, 0);

      // Wide stance, knees bent; bounce flexes the knees a little more
      const bend = 0.42 + breathe * 0.04;
      set(leftLegRoot,  -bend - sway * 0.04, 0,  0.14);
      set(rightLegRoot, -bend + sway * 0.04, 0, -0.14);
      set(leftKneeRoot,  bend * 1.7);
      set(rightKneeRoot, bend * 1.7);

      // Lean into the fight and turn the chest slightly toward the lead side
      set(spineRoot, 0.18 + breathe * 0.02, 0.15 + sway * 0.03);

      // Guard: upper arms forward and in from the A-pose, fists up.
      // Lead (left) hand out front, rear (right) hand tucked near the chin.
      set(leftArmRoot,  -0.85 + breathe * 0.03, 0, -0.6);
      set(rightArmRoot, -0.6 + breathe * 0.03, 0,  0.65);
      flex(leftForeArmRoot,  1.6);
      flex(rightForeArmRoot, 2.1);
      reset(hipsRoot);
    }
  });
</script>

<T.Group position.y={-0.9}>
  <T.Group bind:ref={group} scale={1.5} rotation.y={0.35}>
    <GLTF
      url={modelUrl}
      onload={onModelLoad}
      onerror={(e) => dispatch("error", e)}
    />
  </T.Group>
</T.Group>

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

  function storeOrig(obj: THREE.Object3D) {
    if (!obj.userData.origRot) {
      obj.userData.origRot = {
        x: obj.rotation.x,
        y: obj.rotation.y,
        z: obj.rotation.z,
      };
    }
  }

  function resetRot(obj: THREE.Object3D | null) {
    if (!obj?.userData.origRot) return;
    const o = obj.userData.origRot;
    obj.rotation.x = o.x;
    obj.rotation.y = o.y;
    obj.rotation.z = o.z;
  }

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
            storeOrig(b);
          }
        });
      }
    });
    // Fallback: isBone traversal
    if (!boneSet.size) {
      root.traverse((child: any) => {
        if (child.isBone && !boneSet.has(child)) {
          boneSet.add(child);
          storeOrig(child);
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

    // Log origRot for every tracked bone so we can see exact starting rotations
    const fmt = (b: THREE.Object3D | null) => b
      ? `x=${b.userData.origRot.x.toFixed(3)} y=${b.userData.origRot.y.toFixed(3)} z=${b.userData.origRot.z.toFixed(3)}`
      : 'MISSING';
    console.log('[ninja] origRot values:');
    console.log('  rightLeg :', fmt(rightLegRoot));
    console.log('  leftLeg  :', fmt(leftLegRoot));
    console.log('  rightKnee:', fmt(rightKneeRoot));
    console.log('  leftKnee :', fmt(leftKneeRoot));
    console.log('  rightArm :', fmt(rightArmRoot));
    console.log('  leftArm  :', fmt(leftArmRoot));
    console.log('  hips     :', fmt(hipsRoot));
    console.log('  spine    :', fmt(spineRoot));

    scanned = true;
  }

  $: if (modelUrl) {
    scanned = false;
    loadedScene = null;
  }

  // Center the model and normalize its height. Meshy GLBs come with an
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
    const set = (bone: THREE.Object3D | null, dx = 0, dy = 0, dz = 0) => {
      if (!bone?.userData.origRot) return;
      const o = bone.userData.origRot;
      bone.rotation.x = o.x + dx;
      bone.rotation.y = o.y + dy;
      bone.rotation.z = o.z + dz;
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

      // Thighs back, lower legs fold forward (axes are inverted for this model)
      set(rightLegRoot,  -arc * 1.4 + land * 0.15, 0, 0);
      set(leftLegRoot,   -arc * 1.1 + land * 0.12, 0, 0);
      set(rightKneeRoot,  arc * 1.8 - land * 0.3,  0, 0);
      set(leftKneeRoot,   arc * 1.5 - land * 0.3,  0, 0);

      // Arms: small deltas off the rest pose only — absolute targets
      // (setAbs) flip unpredictably across Meshy rigs. They sweep back
      // and flare on the rise like a diving leap, forearms trailing.
      set(rightArmRoot,  arc * 0.55, -arc * 0.2,  arc * 0.3);
      set(leftArmRoot,   arc * 0.55,  arc * 0.2, -arc * 0.3);
      set(rightForeArmRoot, -arc * 0.4, 0, 0);
      set(leftForeArmRoot,   arc * 0.4, 0, 0);

      // Forward lean purely from spine/hips — avoids group compound rotation
      set(spineRoot, -arc * 0.35, 0, 0);
      set(hipsRoot,   arc * 0.12, 0, 0);
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

      // Kicking leg (right): X lifts the thigh, Z swings it out to the
      // side at extension. If the leg swings inward on a given rig,
      // flip the sign of the Z term.
      set(rightLegRoot, -lift * 1.15, 0, strike * 0.55);
      set(rightKneeRoot, fold, 0, 0);

      // Support leg: slight bend for balance
      set(leftLegRoot,  lift * 0.15, 0, 0);
      set(leftKneeRoot, lift * 0.25, 0, 0);

      // Torso leans away from the kick to counterbalance — the diagonal
      // body line that sells a side kick. Hips add a touch of the tilt.
      set(spineRoot, strike * 0.1, -strike * 0.15, -strike * 0.38);
      set(hipsRoot,  0, strike * 0.25, strike * 0.1);

      // Arms crossed tight in front of the chest: forearms fold hard,
      // upper arms come slightly forward/in. Small deltas off the rest
      // pose only — absolute targets flip unpredictably across rigs.
      set(rightArmRoot,  guard * 0.35, 0, 0);
      set(leftArmRoot,  -guard * 0.3,  0, 0);
      set(rightForeArmRoot, -guard * 0.95, 0, 0);
      set(leftForeArmRoot,   guard * 0.9,  0, 0);
    } else {
      // ── Battle idle: weight shift, arms stay near A-pose ─────────
      const bob = Math.sin(t * 1.2);
      const step = Math.sin(t * 0.9);
      group.rotation.set(0, BASE_Y, 0);
      group.position.set(0, Math.abs(bob) * 0.012, 0);

      // Use set() (not setAbs) so origRot.z is preserved → arms stay at natural A-pose angle
      set(leftArmRoot, bob * 0.05, 0, 0);
      set(rightArmRoot, -bob * 0.05, 0, 0);
      set(leftLegRoot, step * 0.05, 0, 0);
      set(rightLegRoot, -step * 0.05, 0, 0);
      set(leftKneeRoot, -Math.max(0, step) * 0.12, 0, 0);
      set(rightKneeRoot, -Math.max(0, -step) * 0.12, 0, 0);
      reset(leftForeArmRoot, rightForeArmRoot, hipsRoot, spineRoot);
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

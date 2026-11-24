<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls, GLTF } from "@threlte/extras";
  import { goto } from "$app/navigation";
  import * as THREE from "three";
  import AnimatedNinja from "./AnimatedNinja.svelte";
  import { animationOptions } from "$lib/ninjaPrompt";
  import "./NinjaScene.css";

  export let modelUrl: string;
  export let animation: string = "idle";
  export let specialty: string = "automation";
  export let provider: string = "tripo";

  let currentAnimation = animation;

  const specialtyAccent: Record<string, string> = {
    automation: "#3b82f6",
    performance: "#f97316",
    security: "#8b5cf6",
    accessibility: "#10b981",
    visual: "#ec4899",
    manual: "#eab308",
    api: "#14b8a6",
  };

  $: accentColor = specialtyAccent[specialty] ?? "#3b82f6";

  let loadError: string | null = null;

  type FbxState = "idle" | "requesting" | "processing" | "ready" | "error";
  let fbxState: FbxState = "idle";
  let fbxError = "";

  function onError(e: unknown) {
    loadError = e instanceof Error ? e.message : String(e);
    console.error("[NinjaScene] GLTF load error:", e);
  }

  function centerTripoModel(gltf: any) {
    const scene = gltf.scene as THREE.Group;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Center on X/Z, place feet just below viewport center
    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= box.min.y + 0.9;
    // Scale so the character fills the view (~2 units tall)
    const scale = 2.0 / size.y;
    scene.scale.setScalar(scale);
  }
</script>

<div class="scene">
  <!-- Navbar matching main site -->
  <nav class="scene-nav">
    <div class="nav-inner">
      <span class="nav-brand">Abi's Testing Dojo</span>
      <span class="nav-title">Ninja Generator</span>
    </div>
  </nav>

  {#if loadError}
    <div class="center">
      <p class="error-msg">Failed to load model: {loadError}</p>
      <a href="/" class="btn-back">Return to Dojo</a>
    </div>
  {:else}
    <Canvas>
      <T.Color args={["#f0f2fb"]} attach="background" />
      <T.PerspectiveCamera makeDefault position={[0, 0, 4.0]} fov={48}>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.8}
        />
      </T.PerspectiveCamera>

      <T.AmbientLight intensity={0.5} color="#fff8f0" />
      <T.DirectionalLight
        position={[-3, 8, 4]}
        intensity={1.4}
        castShadow
        color="#fffaf5"
      />
      <T.PointLight position={[3, 2, 2]} color={accentColor} intensity={1.2} />
      <T.PointLight position={[-4, 1, -3]} color="#ef4444" intensity={0.5} />
      <T.PointLight position={[0, -1, 2]} color="#ffffff" intensity={0.3} />

      {#if provider === "tripo"}
        <T.Group>
          <GLTF url={modelUrl} onload={centerTripoModel} onerror={(e) => onError(e)} />
        </T.Group>
      {:else}
        <AnimatedNinja
          {modelUrl}
          animation={currentAnimation}
          on:error={(e) => onError(e.detail)}
        />
      {/if}
    </Canvas>

    <!-- Animation switcher bar — hidden for Tripo (static pose, no rigged bones) -->
    {#if provider !== "tripo"}
      <div class="anim-bar">
        {#each animationOptions as opt}
          <button
            class="anim-btn"
            class:active={currentAnimation === opt.value}
            on:click={() => (currentAnimation = opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Action buttons -->
    <div class="controls">
      <button class="btn-back" on:click={() => goto("/")}
        >← Generate another</button
      >

      <a href={modelUrl} download="ninja.glb" class="btn-download-glb">
        ⬇ Download GLB
      </a>
    </div>

    {#if fbxError}
      <p class="fbx-error">{fbxError}</p>
    {/if}
  {/if}
</div>


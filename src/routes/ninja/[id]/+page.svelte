<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { dev } from "$app/environment";
  import NinjaScene from "../../../components/NinjaScene.svelte";
  import SmokeAnimation from "../../../components/SmokeAnimation.svelte";
  import type { NinjaAnswers, NinjaAnimation } from "$lib/ninjaPrompt";

  const ninjaId = $page.params.id as string;
  const animation = ($page.url.searchParams.get("animation") ??
    "idle") as NinjaAnimation;
  const specialty = ($page.url.searchParams.get("specialty") ??
    "automation") as NinjaAnswers["specialty"];

  type Status = "pending" | "processing" | "succeeded" | "failed";
  let status: Status = "pending";
  let stage: "model" | "rig" = "model";
  let modelUrl: string | null = null;
  let pendingModelUrl: string | null = null;
  let revealing = false;
  let progress = 0;

  const specialtyColors: Record<
    string,
    { start: string; end: string; ringGlow: string }
  > = {
    automation: {
      start: "#3b82f6",
      end: "#06b6d4",
      ringGlow: "rgba(59,130,246,0.45)",
    },
    performance: {
      start: "#f97316",
      end: "#ef4444",
      ringGlow: "rgba(249,115,22,0.45)",
    },
    security: {
      start: "#8b5cf6",
      end: "#6d28d9",
      ringGlow: "rgba(139,92,246,0.45)",
    },
    accessibility: {
      start: "#10b981",
      end: "#22c55e",
      ringGlow: "rgba(16,185,129,0.45)",
    },
    visual: {
      start: "#ec4899",
      end: "#f43f5e",
      ringGlow: "rgba(236,72,153,0.45)",
    },
    manual: {
      start: "#eab308",
      end: "#ca8a04",
      ringGlow: "rgba(234,179,8,0.45)",
    },
    api: {
      start: "#14b8a6",
      end: "#0891b2",
      ringGlow: "rgba(20,184,166,0.45)",
    },
  };

  $: config = specialtyColors[specialty] ?? specialtyColors.automation;

  // Pipeline steps shown during generation
  const pipelineSteps = [
    { key: "model", label: "Sculpt" },
    { key: "rig", label: "Rig" },
  ];
  $: stepIndex = pipelineSteps.findIndex((s) => s.key === stage);

  function poll(taskId: string, onSucceeded: (data: any) => void) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/status/${taskId}`);
      if (!res.ok) return;

      const data = await res.json();
      const rawStatus = (data.status as string).toLowerCase();
      status = rawStatus as Status;
      progress = data.progress ?? 0;

      if (rawStatus === "succeeded") {
        clearInterval(interval);
        onSucceeded(data);
      } else if (rawStatus === "failed") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }

  async function startRig(modelTaskId: string) {
    stage = "rig";
    status = "pending";
    progress = 0;

    const res = await fetch(`/api/rig/${modelTaskId}`, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      console.warn(
        "[ninja] Rigging API failed, falling back to unrigged model. Response:",
        body,
      );
      const statusRes = await fetch(`/api/status/${modelTaskId}`);
      if (statusRes.ok) setModel(await statusRes.json(), "unrigged-fallback");
      else status = "failed";
      return;
    }

    const { rigTaskId } = await res.json();
    poll(rigTaskId, (data) => setModel(data, "rigged"));
  }

  function setModel(data: any, source = "unknown") {
    const glb = data.model_urls?.glb;
    // Load straight from Tripo's CDN (it sends Access-Control-Allow-Origin: *).
    // Streaming 40–60 MB GLBs through /api/proxy was far slower.
    pendingModelUrl = glb ?? null;
    revealing = true;
  }

  function onRevealed() {
    modelUrl = pendingModelUrl;
  }

  onMount(() => {
    // Dev only: ?glb=<url> loads an existing (rigged) model directly, so
    // animations can be tuned without paying for a new Tripo rig task.
    const testGlb = dev ? $page.url.searchParams.get("glb") : null;
    if (testGlb) {
      setModel({ model_urls: { glb: testGlb } }, "dev-glb");
      return;
    }

    // Tripo: model → rig, then the hand-coded animations play on the rig
    return poll(ninjaId, () => startRig(ninjaId));
  });
</script>

{#if modelUrl}
  <NinjaScene {modelUrl} {animation} {specialty} />
{:else}
  <div
    class="page-container"
    style="--glow-color: {config.ringGlow}; --step-color: {config.start}"
  >
    <nav class="loading-nav">
      <div class="nav-inner">
        <span class="nav-brand">Abi's Testing Dojo</span>
        <span class="nav-title">Ninja Generator</span>
      </div>
    </nav>

    <div class="bg-glow"></div>

    <div class="center-content">
      {#if status === "failed"}
        <div class="card error-card">
          <h2>Mission Failed</h2>
          <p>The dojo could not forge your ninja. Return and try again.</p>
          <a href="/" class="btn-retry">Return to Dojo</a>
        </div>
      {:else}
        <div class="hatching-wrapper">
          <SmokeAnimation
            {progress}
            {revealing}
            {specialty}
            on:revealed={onRevealed}
          />

          {#if pipelineSteps.length > 1}
            <div class="pipeline-steps">
              {#each pipelineSteps as s, i}
                {#if i > 0}
                  <span class="step-line" class:done={i <= stepIndex}></span>
                {/if}
                <div
                  class="pipeline-step"
                  class:done={i < stepIndex}
                  class:current={i === stepIndex}
                >
                  <span class="step-dot">{i < stepIndex ? "✓" : i + 1}</span>
                  <span class="step-name">{s.label}</span>
                </div>
              {/each}
            </div>
          {/if}

          <div class="status-info">
            <p class="status-label">
              {#if stage === "rig"}
                {status === "pending"
                  ? "Preparing rigging pipeline..."
                  : "Binding skeleton to ninja mesh..."}
              {:else if status === "pending"}
                Awakening the dojo...
              {:else if status === "processing"}
                Sculpting high-fidelity ninja mesh...
              {/if}
            </p>
            <small>
              {#if stage === "rig"}
                Adding bone skeleton for animations...
              {:else}
                Usually ready in ~1-2 minutes (Tripo3D)
              {/if}
            </small>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page-container {
    min-height: 100vh;
    background: #f0f2fb;
    color: #1e293b;
    position: relative;
    overflow: hidden;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }

  .loading-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: 56px;
    background: #3f51b5;
    box-shadow: 0 2px 12px rgba(63, 81, 181, 0.45);
    display: flex;
    align-items: center;
  }
  .nav-inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .nav-brand {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(255, 255, 255, 0.65);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    padding-right: 1rem;
  }
  .nav-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.01em;
  }

  .bg-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
    opacity: 0.18;
    pointer-events: none;
    z-index: 0;
  }

  .center-content {
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    max-width: 420px;
    padding: 2rem;
  }

  .hatching-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .status-info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .pipeline-steps {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .pipeline-step {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .step-dot {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    background: #ffffff;
    color: #94a3b8;
    font-size: 0.72rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .pipeline-step.current .step-dot {
    border-color: var(--step-color);
    color: var(--step-color);
    box-shadow: 0 0 0 4px var(--glow-color);
    animation: step-pulse 1.6s ease-in-out infinite;
  }

  .pipeline-step.done .step-dot {
    background: var(--step-color);
    border-color: var(--step-color);
    color: #ffffff;
  }

  .step-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #94a3b8;
  }

  .pipeline-step.current .step-name {
    color: #1e293b;
  }

  .pipeline-step.done .step-name {
    color: #64748b;
  }

  .step-line {
    width: 1.8rem;
    height: 2px;
    border-radius: 1px;
    background: #e2e8f0;
    transition: background 0.3s ease;
  }

  .step-line.done {
    background: var(--step-color);
  }

  @keyframes step-pulse {
    0%, 100% { box-shadow: 0 0 0 4px var(--glow-color); }
    50%      { box-shadow: 0 0 0 7px transparent; }
  }

  .status-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    letter-spacing: -0.01em;
  }

  small {
    color: #64748b;
    font-size: 0.85rem;
  }

  .card {
    background: #ffffff;
    border: 1px solid #dde1f0;
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    box-shadow:
      0 4px 24px rgba(63, 81, 181, 0.07),
      0 1px 4px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .error-card h2 {
    font-size: 1.5rem;
    color: #d32f2f;
    margin: 0;
  }

  .error-card p {
    color: #64748b;
    font-size: 0.95rem;
    margin: 0;
  }

  .btn-retry {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #d32f2f;
    color: white;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
  }

  .btn-retry:hover {
    transform: translateY(-1.5px);
    background: #ef4444;
    box-shadow: 0 6px 16px rgba(211, 47, 47, 0.4);
  }
</style>

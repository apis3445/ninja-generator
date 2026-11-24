<script lang="ts">
  import { goto } from "$app/navigation";
  import { fade } from "svelte/transition";
  import QuestionWizard from "../components/QuestionWizard.svelte";
  import SmokeAnimation from "../components/SmokeAnimation.svelte";
  import { animationOptions } from "$lib/ninjaPrompt";
  import type { NinjaAnswers, NinjaAnimation } from "$lib/ninjaPrompt";
  import "./page.css";

  let state: "wizard" | "generating-2d" | "preview-2d" = "wizard";
  let answers: NinjaAnswers | null = null;
  let previewImageUrl = "";
  let error = "";
  let selectedAnimation: NinjaAnimation = "idle";
  let animPreviewIndex = 0;

  let progress2d = 0;
  let isRevealing2d = false;
  let creating3d = false;

  const loading2dMessages = [
    "Summoning the ninja spirit…",
    "Sketching the silhouette…",
    "Inking shadow techniques…",
    "Sharpening blades and details…",
    "Applying final brush strokes…",
  ];
  $: loading2dMsg =
    loading2dMessages[
      Math.min(
        loading2dMessages.length - 1,
        Math.floor(progress2d / (100 / loading2dMessages.length)),
      )
    ];

  const specialtyColors: Record<
    string,
    { start: string; end: string; glow: string; text: string }
  > = {
    automation: {
      start: "#3b82f6",
      end: "#06b6d4",
      glow: "rgba(59,130,246,0.45)",
      text: "#ffffff",
    },
    performance: {
      start: "#f97316",
      end: "#ef4444",
      glow: "rgba(249,115,22,0.45)",
      text: "#ffffff",
    },
    security: {
      start: "#8b5cf6",
      end: "#6d28d9",
      glow: "rgba(139,92,246,0.45)",
      text: "#ffffff",
    },
    accessibility: {
      start: "#10b981",
      end: "#22c55e",
      glow: "rgba(16,185,129,0.45)",
      text: "#ffffff",
    },
    visual: {
      start: "#ec4899",
      end: "#f43f5e",
      glow: "rgba(236,72,153,0.45)",
      text: "#ffffff",
    },
    manual: {
      start: "#eab308",
      end: "#ca8a04",
      glow: "rgba(234,179,8,0.45)",
      text: "#1a1100",
    },
    api: {
      start: "#14b8a6",
      end: "#0891b2",
      glow: "rgba(20,184,166,0.45)",
      text: "#ffffff",
    },
  };

  const translateVal: Record<string, string> = {
    // Specialties
    automation: "Automation",
    performance: "Performance",
    security: "Security",
    accessibility: "Accessibility",
    visual: "Visual",
    manual: "Manual",
    api: "API",
    // Weapons
    playwright: "Playwright — Twin Blades",
    selenium: "Selenium — Ancient Katana",
    cypress: "Cypress — Twin Daggers",
    k6: "k6 — Thunder Hammer",
    lantern: "Mystic Lantern",
    // Ranks
    junior: "Junior Apprentice",
    mid: "Mid-level Warrior",
    senior: "Senior Ninja",
    lead: "Lead Sensei",
    legend: "Shinobi Legend",
    // Styles
    shadow: "Shadow Black",
    crimson: "Crimson Red",
    jade: "Jade Green",
    royal: "Royal Blue",
    ghost: "Ghost White",
    // Clans
    sprinters: "⚡ The Sprinters",
    phantoms: "🌑 The Phantom Protocol",
    guardians: "🛡️ The Guardians",
    "fast-and-risky": "🔥 Fast And Risky",
    // Gender
    female: "Female",
    male: "Male",
    // Animations
    idle: "Battle Idle",
    slash: "Sword Slash",
    kick: "Roundhouse Kick",
    block: "Defense Block",
    throw: "Shuriken Throw",
  };

  $: specialtyStyle = answers
    ? (specialtyColors[answers.specialty] ?? specialtyColors.automation)
    : specialtyColors.automation;

  async function handleWizardComplete(event: CustomEvent<NinjaAnswers>) {
    answers = event.detail;
    await generate2D();
  }

  async function generate2D() {
    if (!answers) return;
    state = "generating-2d";
    error = "";
    progress2d = 0;
    isRevealing2d = false;

    // Ease toward 92% so the bar keeps moving for the whole wait
    // instead of racing ahead and freezing.
    const interval = setInterval(() => {
      if (progress2d < 92) {
        progress2d += Math.max(1, Math.round((92 - progress2d) * 0.05));
      }
    }, 350);

    try {
      const res = await fetch("/api/generate-2d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      clearInterval(interval);

      if (!res.ok) {
        throw new Error(
          "Failed to generate 2D preview. Check your OPENAI_API_KEY / GEMINI_API_KEY.",
        );
      }

      const data = await res.json();
      progress2d = 100;
      isRevealing2d = true;

      await new Promise((resolve) => setTimeout(resolve, 1800));

      previewImageUrl = data.imageUrl;
      state = "preview-2d";
    } catch (err: any) {
      clearInterval(interval);
      error = err.message || "An unexpected error occurred.";
      state = "wizard";
      answers = null;
    }
  }

  async function handleRegenerate() {
    await generate2D();
  }

  function prevAnim() {
    animPreviewIndex =
      (animPreviewIndex - 1 + animationOptions.length) %
      animationOptions.length;
    selectedAnimation = animationOptions[animPreviewIndex].value;
  }

  function nextAnim() {
    animPreviewIndex = (animPreviewIndex + 1) % animationOptions.length;
    selectedAnimation = animationOptions[animPreviewIndex].value;
  }

  function selectAnim(value: NinjaAnimation, index: number) {
    selectedAnimation = value;
    animPreviewIndex = index;
  }

  async function handleConfirm() {
    if (!answers || creating3d) return;
    creating3d = true;
    error = "";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          imageUrl: previewImageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to start 3D generation.");

      const { taskId } = await res.json();
      // Keep creating3d true through the redirect so the button
      // doesn't flicker back before navigation completes.
      goto(
        `/ninja/${taskId}?animation=${selectedAnimation}&specialty=${answers.specialty}`,
      );
    } catch (err: any) {
      error = err.message || "Something went wrong. Please try again.";
      creating3d = false;
    }
  }

  function handleBackToWizard() {
    state = "wizard";
    answers = null;
    previewImageUrl = "";
    error = "";
    selectedAnimation = "idle";
    animPreviewIndex = 0;
  }
</script>

<nav class="top-nav">
  <div class="nav-inner">
    <span class="nav-brand">Abi's Testing Dojo</span>
    <span class="nav-title">Ninja Generator</span>
  </div>
</nav>

<div
  class="page-container"
  style="--glow-color: {specialtyStyle.glow}; --theme-start: {specialtyStyle.start}; --theme-end: {specialtyStyle.end}"
>
  <div class="bg-glow"></div>

  <div class="page">
    {#if state === "wizard"}
      <div class="header">
        <h1>Forge Your QA Ninja</h1>
        <p class="subtitle">
          Answer the questions to create your unique testing warrior
        </p>
      </div>
      <div class="card wizard-card">
        <QuestionWizard on:complete={handleWizardComplete} />
        {#if error}<p class="error">{error}</p>{/if}
      </div>
    {:else}
      <div class="header">
        <h1>
          {#if state === "generating-2d"}
            Generating Your Ninja...
          {:else}
            Review Your Ninja
          {/if}
        </h1>
        <p class="subtitle">
          {#if state === "generating-2d"}
            Channeling the dojo's visual energy...
          {:else}
            Confirm this ninja, or generate another variant?
          {/if}
        </p>
      </div>

      {#if state === "generating-2d" && answers}
        <div class="loading-container card">
          <SmokeAnimation
            progress={progress2d}
            revealing={isRevealing2d}
            specialty={answers.specialty}
          />
          {#key loading2dMsg}
            <p class="loading-label" in:fade={{ duration: 400 }}>
              {loading2dMsg}
            </p>
          {/key}
          <small class="loading-sub">Usually ready in 10–30 seconds</small>
        </div>
      {:else if state === "preview-2d" && answers}
        <div class="preview-layout card">
          <div class="left-col">
            <div class="image-container">
              <img src={previewImageUrl} alt="Generated 2D Ninja" />
              <div
                class="image-overlay"
                style="box-shadow: inset 0 0 40px {specialtyStyle.glow}"
              ></div>
            </div>
          </div>

          <div class="details-container">
            <h3>Ninja Profile</h3>
            <div class="attributes-grid">
              <div class="attr-item">
                <span class="attr-label">Specialty</span>
                <span
                  class="attr-val badge"
                  style="background: {specialtyStyle.start}; color: {specialtyStyle.text}"
                  >{translateVal[answers.specialty] ?? answers.specialty}</span
                >
              </div>
              <div class="attr-item">
                <span class="attr-label">Weapon</span>
                <span class="attr-val badge-outline"
                  >{translateVal[answers.weapon] ?? answers.weapon}</span
                >
              </div>
              <div class="attr-item">
                <span class="attr-label">Rank</span>
                <span class="attr-val badge-outline"
                  >{translateVal[answers.rank] ?? answers.rank}</span
                >
              </div>
              <div class="attr-item">
                <span class="attr-label">Style</span>
                <span class="attr-val badge-outline"
                  >{translateVal[answers.style] ?? answers.style}</span
                >
              </div>
              <div class="attr-item">
                <span class="attr-label">Clan</span>
                <span class="attr-val badge-outline"
                  >{translateVal[answers.clan] ?? answers.clan}</span
                >
              </div>
              <div class="attr-item">
                <span class="attr-label">Gender</span>
                <span class="attr-val badge-outline"
                  >{translateVal[answers.gender] ?? answers.gender}</span
                >
              </div>
            </div>

            <div class="anim-picker">
              <p class="anim-picker-label">Choose Animation</p>
              <div class="anim-carousel">
                <button
                  class="anim-arrow"
                  on:click={prevAnim}
                  aria-label="Previous animation">‹</button
                >
                <div class="anim-cards">
                  {#each animationOptions as opt, i}
                    <button
                      class="anim-card"
                      class:active={selectedAnimation === opt.value}
                      on:click={() => selectAnim(opt.value, i)}
                    >
                      <span class="anim-name">{opt.label}</span>
                      <span class="anim-desc">{opt.description}</span>
                    </button>
                  {/each}
                </div>
                <button
                  class="anim-arrow"
                  on:click={nextAnim}
                  aria-label="Next animation">›</button
                >
              </div>
            </div>

            <div class="actions">
              <button
                class="btn btn-primary"
                disabled={creating3d}
                on:click={handleConfirm}
              >
                {#if creating3d}
                  <span class="btn-spinner"></span> Forging in 3D…
                {:else}
                  Create Ninja in 3D
                {/if}
              </button>
              <button
                class="btn btn-secondary"
                disabled={creating3d}
                on:click={handleRegenerate}
              >
                Generate Another Variant
              </button>
              <button
                class="btn-text"
                disabled={creating3d}
                on:click={handleBackToWizard}
              >
                ← Restart Questions
              </button>
            </div>
            {#if error}<p class="error">{error}</p>{/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { NinjaAnswers } from '$lib/ninjaPrompt'

  export let progress: number = 0
  export let revealing: boolean = false
  export let specialty: NinjaAnswers['specialty'] = 'automation'

  const dispatch = createEventDispatcher()

  const specialtyColors: Record<string, { primary: string; secondary: string; glow: string }> = {
    automation:    { primary: '#3b82f6', secondary: '#06b6d4', glow: 'rgba(59,130,246,0.6)' },
    performance:   { primary: '#f97316', secondary: '#ef4444', glow: 'rgba(249,115,22,0.6)' },
    security:      { primary: '#8b5cf6', secondary: '#6d28d9', glow: 'rgba(139,92,246,0.6)' },
    accessibility: { primary: '#10b981', secondary: '#22c55e', glow: 'rgba(16,185,129,0.6)' },
    visual:        { primary: '#ec4899', secondary: '#f43f5e', glow: 'rgba(236,72,153,0.6)' },
    manual:        { primary: '#eab308', secondary: '#ca8a04', glow: 'rgba(234,179,8,0.6)' },
    api:           { primary: '#14b8a6', secondary: '#0891b2', glow: 'rgba(20,184,166,0.6)' }
  }

  $: colors = specialtyColors[specialty] ?? specialtyColors.automation

  // SVG progress ring constants
  const R = 72
  const CIRC = 2 * Math.PI * R
  $: dashOffset = CIRC * (1 - progress / 100)

  let revealed = false
  $: if (revealing && !revealed) {
    setTimeout(() => {
      revealed = true
      dispatch('revealed')
    }, 1600)
  }
</script>

<div class="smoke-wrapper" class:revealing class:revealed>
  <!-- Smoke ring particles -->
  <div class="smoke-container" style="--primary: {colors.primary}; --secondary: {colors.secondary}; --glow: {colors.glow}">
    <div class="smoke-orb">
      <div class="smoke-puff p1"></div>
      <div class="smoke-puff p2"></div>
      <div class="smoke-puff p3"></div>
      <div class="smoke-puff p4"></div>
      <div class="smoke-puff p5"></div>
      <div class="smoke-puff p6"></div>
      <div class="core">
        <div class="core-inner"></div>
      </div>
    </div>

    <!-- Progress ring SVG -->
    <svg class="progress-ring" viewBox="0 0 160 160" width="160" height="160">
      <circle
        cx="80" cy="80" r={R}
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        stroke-width="3"
      />
      <circle
        cx="80" cy="80" r={R}
        fill="none"
        stroke="url(#ringGrad)"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray={CIRC}
        stroke-dashoffset={dashOffset}
        transform="rotate(-90 80 80)"
        style="transition: stroke-dashoffset 0.3s ease"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color={colors.primary} />
          <stop offset="100%" stop-color={colors.secondary} />
        </linearGradient>
      </defs>
    </svg>
  </div>

  <p class="percent">{progress}%</p>
</div>

<style>
  .smoke-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .smoke-container {
    position: relative;
    width: 160px;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .smoke-orb {
    position: absolute;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .core {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--primary) 0%, var(--secondary) 100%);
    box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 2s ease-in-out infinite;
    z-index: 2;
  }

  .core-inner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: pulse-inner 2s ease-in-out infinite;
  }

  .smoke-puff {
    position: absolute;
    border-radius: 50%;
    background: var(--primary);
    opacity: 0.18;
    animation: swirl 4s ease-in-out infinite;
  }

  .p1 { width: 28px; height: 28px; top: 0; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
  .p2 { width: 22px; height: 22px; top: 12px; right: 4px; animation-delay: -0.66s; }
  .p3 { width: 24px; height: 24px; bottom: 8px; right: 8px; animation-delay: -1.33s; }
  .p4 { width: 26px; height: 26px; bottom: 2px; left: 50%; transform: translateX(-50%); animation-delay: -2s; }
  .p5 { width: 20px; height: 20px; bottom: 12px; left: 4px; animation-delay: -2.66s; }
  .p6 { width: 22px; height: 22px; top: 12px; left: 4px; animation-delay: -3.33s; }

  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
  }

  .percent {
    font-size: 1rem;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.04em;
    margin: 0;
  }

  /* Reveal: smoke disperses outward */
  .revealing .smoke-puff {
    animation: disperse 1.6s ease-out forwards;
  }
  .revealing .core {
    animation: flash 1.6s ease-out forwards;
  }
  .revealed .smoke-orb,
  .revealed .progress-ring,
  .revealed .percent {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow); }
    50% { transform: scale(1.1); box-shadow: 0 0 30px var(--glow), 0 0 60px var(--glow); }
  }

  @keyframes pulse-inner {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 1; }
  }

  @keyframes swirl {
    0%   { transform: rotate(0deg) translateX(32px) rotate(0deg) scale(1); opacity: 0.18; }
    50%  { transform: rotate(180deg) translateX(32px) rotate(-180deg) scale(1.3); opacity: 0.28; }
    100% { transform: rotate(360deg) translateX(32px) rotate(-360deg) scale(1); opacity: 0.18; }
  }

  .p1 { animation-name: swirl1; }
  .p2 { animation-name: swirl2; }
  .p3 { animation-name: swirl3; }
  .p4 { animation-name: swirl4; }
  .p5 { animation-name: swirl5; }
  .p6 { animation-name: swirl6; }

  @keyframes swirl1 {
    0%   { transform: translateX(-50%) rotate(0deg) translateY(-30px) rotate(0deg); opacity: 0.2; }
    50%  { opacity: 0.35; }
    100% { transform: translateX(-50%) rotate(360deg) translateY(-30px) rotate(-360deg); opacity: 0.2; }
  }
  @keyframes swirl2 {
    0%   { transform: rotate(60deg) translateY(-30px) rotate(-60deg); opacity: 0.15; }
    50%  { opacity: 0.3; }
    100% { transform: rotate(420deg) translateY(-30px) rotate(-420deg); opacity: 0.15; }
  }
  @keyframes swirl3 {
    0%   { transform: rotate(120deg) translateY(-30px) rotate(-120deg); opacity: 0.2; }
    50%  { opacity: 0.35; }
    100% { transform: rotate(480deg) translateY(-30px) rotate(-480deg); opacity: 0.2; }
  }
  @keyframes swirl4 {
    0%   { transform: translateX(-50%) rotate(180deg) translateY(-30px) rotate(-180deg); opacity: 0.15; }
    50%  { opacity: 0.28; }
    100% { transform: translateX(-50%) rotate(540deg) translateY(-30px) rotate(-540deg); opacity: 0.15; }
  }
  @keyframes swirl5 {
    0%   { transform: rotate(240deg) translateY(-30px) rotate(-240deg); opacity: 0.2; }
    50%  { opacity: 0.32; }
    100% { transform: rotate(600deg) translateY(-30px) rotate(-600deg); opacity: 0.2; }
  }
  @keyframes swirl6 {
    0%   { transform: rotate(300deg) translateY(-30px) rotate(-300deg); opacity: 0.15; }
    50%  { opacity: 0.28; }
    100% { transform: rotate(660deg) translateY(-30px) rotate(-660deg); opacity: 0.15; }
  }

  @keyframes disperse {
    0%   { transform: scale(1); opacity: 0.25; }
    60%  { opacity: 0.4; }
    100% { transform: scale(4) translateY(-20px); opacity: 0; }
  }

  @keyframes flash {
    0%   { transform: scale(1); box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow); }
    40%  { transform: scale(1.8); box-shadow: 0 0 60px var(--glow), 0 0 120px var(--glow); }
    100% { transform: scale(0.8); opacity: 0; }
  }
</style>

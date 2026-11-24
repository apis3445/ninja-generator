<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { questions } from '$lib/ninjaPrompt'
  import type { NinjaAnswers } from '$lib/ninjaPrompt'

  const dispatch = createEventDispatcher<{ complete: NinjaAnswers }>()

  let step = 0
  let answers: Partial<NinjaAnswers> = {}

  function select(value: string) {
    answers = { ...answers, [questions[step].id]: value }

    if (step < questions.length - 1) {
      step++
    } else {
      dispatch('complete', answers as NinjaAnswers)
    }
  }

  $: current = questions[step]
  $: progress = (step / questions.length) * 100
</script>

<div class="wizard">
  <div class="progress-bar">
    <div class="fill" style="width: {progress}%"></div>
  </div>

  <p class="counter">{step + 1} de {questions.length}</p>
  <h2>{current.text}</h2>

  <div class="options">
    {#each current.options as option}
      <button
        class="option"
        class:selected={answers[current.id] === option.value}
        on:click={() => select(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .progress-bar {
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    margin-bottom: 2rem;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, #3f51b5, #6366f1);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .counter {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: #94a3b8;
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #1e293b;
    font-weight: 700;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .option {
    padding: 1rem 1.25rem;
    background: #f8faff;
    border: 1px solid #dde1f0;
    border-radius: 0.75rem;
    color: #334155;
    font-size: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .option:hover {
    background: #eef0fb;
    border-color: #3f51b5;
    color: #1e293b;
    transform: translateX(4px);
  }

  .option.selected {
    background: #eef0fb;
    border-color: #3f51b5;
    color: #1e293b;
    box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.15);
  }
</style>

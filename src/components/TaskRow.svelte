<script lang="ts">
  import type { Task } from '../lib/model'
  import Bubble from './Bubble.svelte'

  interface Props {
    task: Task
    done: boolean
    dragging?: boolean
    dy?: number
    locked?: boolean
    checking?: boolean
    onlocked?: () => void
    onpop: (el: HTMLElement, how: 'hold' | 'tap') => void
    onuncheck: () => void
    onedit: () => void
    ongrip?: (e: PointerEvent) => void
  }
  let { task, done, dragging = false, dy = 0, locked = false, checking = false, onlocked, onpop, onuncheck, onedit, ongrip }: Props = $props()
  let progress = $state(0)
  let sprung = $state(false)

  function pop(el: HTMLElement, how: 'hold' | 'tap') {
    sprung = false
    requestAnimationFrame(() => (sprung = true)) // restart the spring-back of the text
    onpop(el, how)
  }
</script>

<div class="row" class:done class:dragging data-row={task.id} style:translate={dragging ? `0 ${dy}px` : undefined}>
  <Bubble {done} title={task.title} bind:progress {locked} {checking} {onlocked} onpop={pop} {onuncheck} />
  <button class="text" class:sprung onclick={onedit} style:font-stretch={progress ? `${100 - 10 * progress ** 0.7}%` : undefined}>
    <span class="label">{task.title}</span>
  </button>
  {#if ongrip && !done}
    <button class="grip" aria-label="„{task.title}“ verschieben" onpointerdown={ongrip}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14" /></svg>
    </button>
  {/if}
</div>

<style>
  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 60px;
    padding: 6px 4px 6px 8px;
    background: var(--row);
  }
  .row.dragging {
    z-index: 2;
    scale: 1.03;
    border-radius: 14px;
    box-shadow: var(--rim), 0 14px 28px -10px #15172640;
    transition: scale 0.2s var(--spring-pop);
  }
  .text {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 8px 4px;
    text-align: left;
    font-size: 1.1875rem;
    font-weight: 560;
    letter-spacing: -0.005em;
    line-height: 1.3;
    overflow-wrap: anywhere;
    hyphens: auto;
    user-select: text;
    -webkit-user-select: text;
    transition:
      font-weight 0.3s,
      color 0.3s;
  }
  .text.sprung {
    animation: spring-back 0.42s var(--spring-pop);
  }
  @keyframes spring-back {
    from {
      font-stretch: 90%;
    }
    60% {
      font-stretch: 106%;
    }
    to {
      font-stretch: 100%;
    }
  }
  .done .text {
    font-weight: 440;
    color: var(--ink-2);
  }
  /* The strike draws left to right when the task pops; done rows just show it. */
  .done .label {
    background: linear-gradient(currentColor, currentColor) no-repeat 0 58% / 100% 1.5px;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .done .sprung .label {
    animation: strike 0.24s var(--draw) 0.06s backwards;
  }
  @keyframes strike {
    from {
      background-size: 0% 1.5px;
    }
  }
  .grip {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: none;
    color: var(--ink-2);
    touch-action: none;
    cursor: grab;
  }
  .grip svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
</style>

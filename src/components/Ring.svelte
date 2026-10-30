<script lang="ts">
  // Small 12-tooth ring for the list overview: how much of the room is done.
  import { TEETH } from '../lib/schedule'

  let { done, total }: { done: number; total: number } = $props()
  const finished = $derived(total > 0 && done === total)
  const lit = $derived(total ? Math.round((TEETH * done) / total) : 0)
  const color = (i: number) => ['var(--gold)', 'var(--magenta)', 'var(--violett)', 'var(--tuerkis)'][Math.floor(i / 3)]

  const R = 9
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)}`
  }
  const teeth = Array.from({ length: TEETH }, (_, i) => `M${pt(i * 30 + 3)}A${R} ${R} 0 0 1 ${pt(i * 30 + 27)}`)
</script>

<svg viewBox="-12 -12 24 24" aria-hidden="true" class:finished>
  {#each teeth as d, i (i)}
    <path {d} style:stroke={finished ? 'var(--silber)' : i < lit ? color(i) : undefined} />
  {/each}
  {#if finished}<circle r="6" /><path class="check" d="M-3 0.2l2 2 4-4.4" />{/if}
</svg>

<style>
  svg {
    width: 36px;
    height: 36px;
    flex: none;
  }
  path {
    fill: none;
    stroke: var(--tooth-off);
    stroke-width: 2.4;
  }
  circle {
    fill: var(--disc);
  }
  .check {
    stroke: var(--disc-ink);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>

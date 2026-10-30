<script lang="ts">
  // A glass sheet at the bottom of the screen: a native <dialog> (focus trap, Esc, top layer).
  import type { Snippet } from 'svelte'

  let { open = $bindable(false), label, children }: { open?: boolean; label: string; children: Snippet } = $props()
  let dialog = $state<HTMLDialogElement>()

  $effect(() => {
    if (open && !dialog!.open) dialog!.showModal()
    else if (!open && dialog!.open) dialog!.close()
  })
</script>

<!-- Clicking the dimmed area outside the card closes it; the dialog itself handles Esc. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class="glass" aria-label={label} onclose={() => (open = false)} onclick={(e) => e.target === dialog && (open = false)}>
  {#if open}
    <div class="body">{@render children()}</div>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
  }
  .body {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
</style>

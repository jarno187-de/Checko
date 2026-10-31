<script lang="ts">
  // A glass sheet at the bottom of the screen: a native <dialog> (focus trap, Esc, top layer).
  import type { Snippet } from 'svelte'
  import { reduced } from '../lib/store.svelte'

  let { open = $bindable(false), label, children }: { open?: boolean; label: string; children: Snippet } = $props()
  let dialog = $state<HTMLDialogElement>()
  // The content stays while the sheet slides away, so closing is the opening played backwards.
  let shown = $state(false)
  let closing = $state(false)
  let leave: Animation | undefined

  $effect(() => {
    if (open) {
      if (closing) {
        // Reopened mid-exit: stop leaving and stay.
        leave?.cancel()
        closing = false
      }
      if (!dialog!.open) {
        shown = true
        dialog!.showModal()
      }
    } else if (dialog!.open && !closing) dismiss()
  })

  function dismiss() {
    closing = true
    if (reduced()) return finish()
    leave = dialog!.animate(
      [
        { translate: '0 -100%', opacity: 1 },
        { translate: '0 calc(-100% + 32px)', opacity: 0 },
      ],
      { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    )
    leave.finished.then(finish, () => {})
  }

  function finish() {
    leave = undefined
    closing = false
    shown = false
    dialog!.close()
  }
</script>

<!-- Clicking the dimmed area outside the card closes it; Esc goes through the same exit animation. -->
<!-- The dialog takes the first focus itself (autofocus): focusing a field inside would scroll the page on iPhone. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_autofocus -->
<dialog
  bind:this={dialog}
  autofocus
  class="glass"
  class:closing
  aria-label={label}
  oncancel={(e) => {
    e.preventDefault()
    open = false
  }}
  onclose={() => {
    shown = false
    open = false
  }}
  onclick={(e) => e.target === dialog && (open = false)}
>
  {#if shown}
    <div class="body">{@render children()}</div>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
  }
  .closing {
    pointer-events: none;
  }
  .body {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
</style>

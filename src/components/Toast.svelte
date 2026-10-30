<script lang="ts">
  import { app } from '../lib/store.svelte'
</script>

<div class="toast-slot" role="status">
  {#if app.toast}
    <div class="toast">
      <span>{app.toast.text}</span>
      {#if app.toast.action}
        <button
          class="action"
          onclick={() => {
            app.toast?.action?.run()
            app.toast = null
          }}>{app.toast.action.label}</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .toast-slot {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(max(16px, env(safe-area-inset-bottom)) + 76px);
    display: grid;
    place-items: center;
    padding: 0 var(--gutter);
    pointer-events: none;
    z-index: 40;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 528px;
    min-height: 48px;
    padding: 12px 18px;
    /* Half the min height: a pill on one line, a rounded card when the text wraps. */
    border-radius: 24px;
    background: var(--disc);
    color: var(--disc-ink);
    font-weight: 560;
    pointer-events: auto;
    animation: toast-in 0.42s var(--spring-pop);
  }
  .toast span {
    flex: 1;
    min-width: 0;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .toast:has(.action) {
    padding: 8px 8px 8px 18px;
  }
  .action {
    flex: none;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--disc-ink) 16%, transparent);
    font-weight: 650;
  }
  @keyframes toast-in {
    from {
      translate: 0 16px;
      opacity: 0;
    }
  }
</style>

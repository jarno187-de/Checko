<script lang="ts">
  // First run. Step 1 is deliberately a tap: it unlocks audio, lets Android vibrate during
  // the next hold, and gives the iPhone its first real tick.
  import { popEffects } from '../lib/celebrate'
  import { TEMPLATES, addList } from '../lib/model'
  import { app, go, save } from '../lib/store.svelte'
  import Bubble from './Bubble.svelte'

  let step = $state<1 | 2 | 3>(1)
  let howTo = $state(false)

  const iosSafari =
    (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))) &&
    !matchMedia('(display-mode: standalone)').matches &&
    !(navigator as Navigator & { standalone?: boolean }).standalone

  function start(template?: (typeof TEMPLATES)[number]) {
    const list = addList(app.data, template?.title ?? 'Neue Liste', Date.now(), template?.kind, template?.tasks)
    app.data.onboarded = true
    save()
    go('list', list.id)
  }
</script>

<section class="onboarding">
  <h1 class="wordmark">Checko</h1>
  <p class="tagline">Jede erledigte Aufgabe macht Plopp.</p>

  {#if step < 3}
    <div class="stage">
      <Bubble
        done={false}
        title="Übungsblase"
        size="stage"
        onpump={() => step === 1 && (step = 2)}
        onpop={(el, how) => {
          popEffects(el, how, 1)
          step = 3
        }}
      />
    </div>
    <p class="say" aria-live="polite">
      {step === 1 ? 'Tipp die Blase an.' : 'Jetzt gedrückt halten, bis es klackt. Oder schnell weiter tippen.'}
    </p>
  {:else}
    <div class="done">
      <p class="title">Genau so.</p>
      <p class="title-2">Womit fängst du an?</p>
      <div class="chips">
        {#each TEMPLATES as t (t.kind)}
          <button class="chip faux" onclick={() => start(t)}>{t.title}</button>
        {/each}
        <button class="chip faux" onclick={() => start()}>Leere Liste</button>
      </div>
      {#if iosSafari}
        <div class="install faux">
          <p>Leg Checko auf den Home-Bildschirm. Dann bleiben deine Listen sicher gespeichert.</p>
          {#if howTo}
            <p class="secondary">Tipp unten auf „Teilen“ und dann auf „Zum Home-Bildschirm“.</p>
          {:else}
            <button class="text-button" onclick={() => (howTo = true)}>So geht's</button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .onboarding {
    display: grid;
    gap: 12px;
    min-height: calc(100dvh - 48px);
    align-content: start;
    padding-top: max(24px, env(safe-area-inset-top));
  }
  .tagline {
    font-size: 1.1875rem;
    font-weight: 560;
  }
  .stage {
    display: grid;
    place-items: center;
    padding: 56px 0 24px;
  }
  .say {
    font-size: 1.1875rem;
    font-weight: 560;
    text-align: center;
  }
  .done {
    display: grid;
    gap: 14px;
    padding-top: 32px;
    animation: rise 0.5s var(--spring-soft);
  }
  @keyframes rise {
    from {
      translate: 0 12px;
      opacity: 0;
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .install {
    display: grid;
    gap: 6px;
    margin-top: 12px;
    padding: 14px 16px;
    border-radius: 18px;
  }
  .install .text-button {
    justify-self: start;
    padding: 0;
  }
</style>

import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/mona-sans/wdth.css'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

// A new version reloads the page as soon as it is installed, instead of waiting for the next launch.
registerSW({ immediate: true })

export default app

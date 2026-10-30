// Safari's native switch (<input type=checkbox switch>); toggling it plays the iPhone's tick.
declare module 'svelte/elements' {
  export interface HTMLInputAttributes {
    switch?: boolean
  }
}
export {}

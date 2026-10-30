import { defineConfig, devices } from '@playwright/test'

// Runs against the production build (the service worker only exists there).
// WebKit here is not iOS Safari: haptics, the Home Screen app and the glass look need a real iPhone.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})

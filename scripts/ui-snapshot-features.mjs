/** Feature scenarios keyed by milestone label (week-1 … week-4). */

export const PAST_FIXTURE_ID = 'NCAAF-2026-030'

/** @typedef {'fixtures-portrait' | 'fixtures-landscape' | 'game-portrait' | 'game-landscape'} SnapshotViewport */

/**
 * @typedef {Object} FeatureScenario
 * @property {string} id
 * @property {string} title
 * @property {string} path
 * @property {SnapshotViewport} viewport
 * @property {(page: import('playwright').Page) => Promise<void>} [prepare]
 * @property {{ fieldDirection?: 'dismiss' | 'keep', errorToast?: 'dismiss' | 'keep' }} [gameSetup]
 */

/** @type {Record<string, FeatureScenario[]>} */
export const WEEK_FEATURES = {
  'week-1': [
    {
      id: 'take-control-confirm',
      title: 'Take Control confirmation',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: 'Take Control' }).first().click()
        await page.getByRole('dialog').waitFor({ state: 'visible' })
      },
    },
    {
      id: 'take-control-active',
      title: 'Take Control active state',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: 'Take Control' }).first().click()
        await page.getByRole('dialog').getByRole('button', { name: 'Take Control' }).click()
        await page.getByRole('button', { name: 'Stop Control' }).waitFor({ state: 'visible' })
      },
    },
    {
      id: 'action-log',
      title: 'Action log',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: /open settings/i }).click()
        const logTab = page.getByRole('tab', { name: 'Log' })
        if (await logTab.isVisible().catch(() => false)) {
          await logTab.click()
        }
        await page.getByRole('dialog').waitFor({ state: 'visible' })
      },
    },
    {
      id: 'risk-challenge-active',
      title: 'Risk toggle (Challenge / Review)',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: 'Challenge / Review' }).click()
      },
    },
    {
      id: 'clock-adjust',
      title: 'Clock pause and ±1 second adjust',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        const decrease = page.getByRole('button', { name: /decrease clock/i })
        if (await decrease.isVisible().catch(() => false)) {
          await decrease.waitFor({ state: 'visible', timeout: 2000 })
        }
      },
    },
  ],
  'week-2': [
    {
      id: 'feature-flags-panel',
      title: 'Feature flags panel',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: /open settings/i }).click()
        await page.getByRole('tab', { name: 'Features' }).click()
        await page.getByRole('dialog').waitFor({ state: 'visible' })
      },
    },
  ],
  'week-3': [
    {
      id: 'field-direction-dialog',
      title: 'Field direction dialog (first open)',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'keep', errorToast: 'dismiss' },
    },
    {
      id: 'clock-editor',
      title: 'Clock wheel editor',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: /edit game clock/i }).click()
        await page.getByRole('button', { name: 'Confirm' }).waitFor({ state: 'visible' })
      },
    },
    {
      id: 'connection-status',
      title: 'Connection status chip',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        const chip = page.getByRole('button', { name: /connection status details/i })
        if (await chip.isVisible().catch(() => false)) {
          await chip.click()
        }
      },
    },
    {
      id: 'error-toast',
      title: 'Fixture error toast',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'keep' },
    },
    {
      id: 'settings-tabs',
      title: 'Settings dialog (Log / Field / Features)',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByRole('button', { name: /open settings/i }).click()
        await page.getByRole('dialog').waitFor({ state: 'visible' })
      },
    },
  ],
  'week-4': [
    {
      id: 'fixtures-filters',
      title: 'Fixtures filters and search',
      path: '/fixtures',
      viewport: 'fixtures-portrait',
      async prepare(page) {
        await page.locator('#fixture-filter-date').waitFor({ state: 'visible' })
      },
    },
    {
      id: 'fixture-status-chips',
      title: 'Scheduled and past fixture chips',
      path: '/fixtures',
      viewport: 'fixtures-portrait',
      async prepare(page) {
        const past = page.getByText('Past', { exact: true }).first()
        try {
          await past.waitFor({ state: 'visible', timeout: 5000 })
          await past.scrollIntoViewIfNeeded()
        } catch {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        }
      },
    },
    {
      id: 'portrait-stack',
      title: 'Portrait game console (stacked panels)',
      path: '/game/NCAAF-2026-001',
      viewport: 'game-portrait',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
    },
    {
      id: 'past-fixture-ended',
      title: 'Past fixture match-ended scoreboard',
      path: `/game/${PAST_FIXTURE_ID}`,
      viewport: 'game-landscape',
      gameSetup: { fieldDirection: 'dismiss', errorToast: 'dismiss' },
      async prepare(page) {
        await page.getByText(/match ended|ended/i).first().waitFor({
          state: 'visible',
          timeout: 5000,
        }).catch(() => {})
      },
    },
  ],
}

import { create } from 'zustand'
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlagId,
  isFeatureEnabled,
} from '@/config/featureFlags'
import {
  fetchDeployedFeatureFlags,
  type FeatureFlagDefaultsFile,
} from '@/lib/featureFlagDeploy'

/**
 * Snapshot capture may seed overrides before navigation (`?snapshot=1`).
 * Same key as the old Features draft — cleared for normal sessions.
 */
const CAPTURE_OVERRIDE_KEY = 'ncaaf-feature-flags-draft'

type FeatureFlagState = Record<FeatureFlagId, boolean>

interface FeatureFlagStore {
  ready: boolean
  flags: FeatureFlagState
  deployedDefaults: FeatureFlagState
  deployVersion: number
  isEnabled: (id: FeatureFlagId) => boolean
}

function mergeWithCodeDefaults(
  partial?: Partial<FeatureFlagState>,
): FeatureFlagState {
  return { ...DEFAULT_FEATURE_FLAGS, ...partial }
}

function loadCaptureOverrides(): FeatureFlagState | null {
  try {
    const raw = localStorage.getItem(CAPTURE_OVERRIDE_KEY)
    if (!raw) return null
    return mergeWithCodeDefaults(JSON.parse(raw) as Partial<FeatureFlagState>)
  } catch {
    return null
  }
}

function clearCaptureOverrides(): void {
  localStorage.removeItem(CAPTURE_OVERRIDE_KEY)
}

function applyDeployedDefaults(
  deployed: FeatureFlagDefaultsFile,
  allowCaptureOverrides: boolean,
): void {
  const overrides = allowCaptureOverrides ? loadCaptureOverrides() : null
  if (!allowCaptureOverrides) clearCaptureOverrides()

  useFeatureFlagStore.setState({
    ready: true,
    deployedDefaults: deployed.flags,
    deployVersion: deployed.version,
    flags: overrides ?? deployed.flags,
  })
}

export async function initFeatureFlags(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const allowCaptureOverrides = params.get('snapshot') === '1'

  // Drop leftover operator drafts from the removed Features UI.
  if (!allowCaptureOverrides) clearCaptureOverrides()

  try {
    const deployed = await fetchDeployedFeatureFlags()
    applyDeployedDefaults(deployed, allowCaptureOverrides)
  } catch {
    applyDeployedDefaults(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        flags: { ...DEFAULT_FEATURE_FLAGS },
      },
      allowCaptureOverrides,
    )
  }
}

export const useFeatureFlagStore = create<FeatureFlagStore>((_set, get) => ({
  ready: false,
  flags: { ...DEFAULT_FEATURE_FLAGS },
  deployedDefaults: { ...DEFAULT_FEATURE_FLAGS },
  deployVersion: 1,

  isEnabled: (id) => isFeatureEnabled(get().flags, id),
}))

export function useDeployedFeatureFlagsReady(): boolean {
  return useFeatureFlagStore((state) => state.ready)
}

import { create } from 'zustand'
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  LOCKED_ON_FEATURE_FLAGS,
  type FeatureFlagId,
  isFeatureEnabled,
} from '@/config/featureFlags'
import {
  deployFeatureFlags,
  fetchDeployedFeatureFlags,
  type FeatureFlagDefaultsFile,
} from '@/lib/featureFlagDeploy'

const STORAGE_KEY = 'ncaaf-feature-flags-draft'

const LOCKED_ON_FLAGS: FeatureFlagId[] = LOCKED_ON_FEATURE_FLAGS

type FeatureFlagState = Record<FeatureFlagId, boolean>

interface FeatureFlagStore {
  ready: boolean
  flags: FeatureFlagState
  deployedDefaults: FeatureFlagState
  deployVersion: number
  setFlag: (id: FeatureFlagId, enabled: boolean) => void
  confirmAsDefault: (passphrase: string) => Promise<void>
  discardChanges: () => void
  resetToFactoryDefaults: (passphrase: string) => Promise<void>
  hasPendingChanges: () => boolean
  isEnabled: (id: FeatureFlagId) => boolean
}

function mergeWithCodeDefaults(
  partial?: Partial<FeatureFlagState>,
): FeatureFlagState {
  return { ...DEFAULT_FEATURE_FLAGS, ...partial }
}

function loadDraftFlags(): FeatureFlagState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return mergeWithCodeDefaults(JSON.parse(raw) as Partial<FeatureFlagState>)
  } catch {
    return null
  }
}

function persistDraftFlags(flags: FeatureFlagState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

function clearDraftFlags(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function flagsEqual(a: FeatureFlagState, b: FeatureFlagState): boolean {
  return FEATURE_FLAGS.every(({ id }) => a[id] === b[id])
}

function applyDeployedDefaults(deployed: FeatureFlagDefaultsFile): void {
  useFeatureFlagStore.setState({
    ready: true,
    deployedDefaults: deployed.flags,
    deployVersion: deployed.version,
    flags: loadDraftFlags() ?? deployed.flags,
  })
}

function applyFactoryReset(): void {
  const defaults = { ...DEFAULT_FEATURE_FLAGS }
  useFeatureFlagStore.setState({
    deployedDefaults: defaults,
    flags: defaults,
    deployVersion: Date.now(),
  })
  clearDraftFlags()
}

export async function initFeatureFlags(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  if (params.has('resetFeatureFlags')) {
    applyFactoryReset()
    params.delete('resetFeatureFlags')
    const nextSearch = params.toString()
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
    window.history.replaceState({}, '', nextUrl)
  }

  try {
    const deployed = await fetchDeployedFeatureFlags()
    applyDeployedDefaults(deployed)
  } catch {
    applyDeployedDefaults({
      version: 1,
      updatedAt: new Date().toISOString(),
      flags: { ...DEFAULT_FEATURE_FLAGS },
    })
  }
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  ready: false,
  flags: { ...DEFAULT_FEATURE_FLAGS },
  deployedDefaults: { ...DEFAULT_FEATURE_FLAGS },
  deployVersion: 1,

  setFlag: (id, enabled) => {
    if (!enabled && LOCKED_ON_FLAGS.includes(id)) return

    set((state) => {
      const flags = { ...state.flags, [id]: enabled }
      persistDraftFlags(flags)
      return { flags }
    })
  },

  confirmAsDefault: async (passphrase) => {
    const flags = { ...get().flags }
    const deployed = await deployFeatureFlags(flags, passphrase)

    set({
      deployedDefaults: deployed.flags,
      flags: deployed.flags,
      deployVersion: deployed.version,
    })
    clearDraftFlags()
  },

  discardChanges: () => {
    const deployed = { ...get().deployedDefaults }
    set({ flags: deployed })
    clearDraftFlags()
  },

  resetToFactoryDefaults: async (passphrase) => {
    const factory = { ...DEFAULT_FEATURE_FLAGS }
    const deployed = await deployFeatureFlags(factory, passphrase)

    set({
      deployedDefaults: deployed.flags,
      flags: deployed.flags,
      deployVersion: deployed.version,
    })
    clearDraftFlags()
  },

  hasPendingChanges: () => !flagsEqual(get().flags, get().deployedDefaults),

  isEnabled: (id) => isFeatureEnabled(get().flags, id),
}))

export function useFeatureFlagsDirty(): boolean {
  return useFeatureFlagStore(
    (state) => state.ready && !flagsEqual(state.flags, state.deployedDefaults),
  )
}

export function useDeployedFeatureFlagsReady(): boolean {
  return useFeatureFlagStore((state) => state.ready)
}

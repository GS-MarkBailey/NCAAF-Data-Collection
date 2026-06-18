import { create } from 'zustand'
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  type FeatureFlagId,
  isFeatureEnabled,
} from '@/config/featureFlags'

const STORAGE_KEY = 'ncaaf-feature-flags'

type FeatureFlagState = Record<FeatureFlagId, boolean>

interface PersistedFeatureFlags {
  active: FeatureFlagState
  savedDefaults: FeatureFlagState
}

interface FeatureFlagStore {
  flags: FeatureFlagState
  savedDefaults: FeatureFlagState
  setFlag: (id: FeatureFlagId, enabled: boolean) => void
  confirmAsDefault: () => void
  discardChanges: () => void
  resetToSavedDefaults: () => void
  resetToFactoryDefaults: () => void
  hasPendingChanges: () => boolean
  isEnabled: (id: FeatureFlagId) => boolean
}

function mergeWithCodeDefaults(
  partial?: Partial<FeatureFlagState>,
): FeatureFlagState {
  return { ...DEFAULT_FEATURE_FLAGS, ...partial }
}

function loadPersistedState(): PersistedFeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const defaults = { ...DEFAULT_FEATURE_FLAGS }
      return { active: defaults, savedDefaults: defaults }
    }

    const parsed = JSON.parse(raw) as Partial<PersistedFeatureFlags> & Partial<FeatureFlagState>

    // Backward compatibility: previously only active flags were stored.
    if (!('active' in parsed) && !('savedDefaults' in parsed)) {
      const active = mergeWithCodeDefaults(parsed as Partial<FeatureFlagState>)
      return { active, savedDefaults: { ...active } }
    }

    const active = mergeWithCodeDefaults(parsed.active)
    const savedDefaults = mergeWithCodeDefaults(parsed.savedDefaults ?? parsed.active)

    return { active, savedDefaults }
  } catch {
    const defaults = { ...DEFAULT_FEATURE_FLAGS }
    return { active: defaults, savedDefaults: defaults }
  }
}

function persistState(state: PersistedFeatureFlags): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function flagsEqual(a: FeatureFlagState, b: FeatureFlagState): boolean {
  return FEATURE_FLAGS.every(({ id }) => a[id] === b[id])
}

const initialState = loadPersistedState()

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: initialState.active,
  savedDefaults: initialState.savedDefaults,

  setFlag: (id, enabled) => {
    set((state) => {
      const flags = { ...state.flags, [id]: enabled }
      persistState({ active: flags, savedDefaults: state.savedDefaults })
      return { flags }
    })
  },

  confirmAsDefault: () => {
    set((state) => {
      persistState({ active: state.flags, savedDefaults: state.flags })
      return { savedDefaults: { ...state.flags } }
    })
  },

  discardChanges: () => {
    set((state) => {
      persistState({
        active: state.savedDefaults,
        savedDefaults: state.savedDefaults,
      })
      return { flags: { ...state.savedDefaults } }
    })
  },

  resetToSavedDefaults: () => {
    set((state) => {
      persistState({
        active: state.savedDefaults,
        savedDefaults: state.savedDefaults,
      })
      return { flags: { ...state.savedDefaults } }
    })
  },

  resetToFactoryDefaults: () => {
    const defaults = { ...DEFAULT_FEATURE_FLAGS }
    persistState({ active: defaults, savedDefaults: defaults })
    set({ flags: defaults, savedDefaults: defaults })
  },

  hasPendingChanges: () => !flagsEqual(get().flags, get().savedDefaults),

  isEnabled: (id) => isFeatureEnabled(get().flags, id),
}))

export function useFeatureFlagsDirty(): boolean {
  return useFeatureFlagStore(
    (state) => !flagsEqual(state.flags, state.savedDefaults),
  )
}

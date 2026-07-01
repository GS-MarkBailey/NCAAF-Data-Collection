import { create } from 'zustand'
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  type FeatureFlagId,
  isFeatureEnabled,
} from '@/config/featureFlags'

const STORAGE_KEY = 'ncaaf-feature-flags'
const STORAGE_VERSION_KEY = 'ncaaf-feature-flags-version'
const STORAGE_VERSION = 3

const LOCKED_ON_FLAGS: FeatureFlagId[] = ['header.settings']

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

function createFactoryState(): PersistedFeatureFlags {
  const defaults = { ...DEFAULT_FEATURE_FLAGS }
  return { active: defaults, savedDefaults: defaults }
}

function loadPersistedState(): PersistedFeatureFlags {
  try {
    const storedVersion = Number(localStorage.getItem(STORAGE_VERSION_KEY) ?? 0)
    const raw = localStorage.getItem(STORAGE_KEY)

    if (storedVersion < STORAGE_VERSION && raw) {
      // Merge in any newly added flags without wiping saved preferences.
      const parsed = JSON.parse(raw) as Partial<PersistedFeatureFlags> &
        Partial<FeatureFlagState>
      const legacyActive =
        'active' in parsed || 'savedDefaults' in parsed
          ? mergeWithCodeDefaults(parsed.active)
          : mergeWithCodeDefaults(parsed as Partial<FeatureFlagState>)
      const legacySaved = mergeWithCodeDefaults(
        parsed.savedDefaults ?? parsed.active ?? (parsed as Partial<FeatureFlagState>),
      )
      const merged = { active: legacyActive, savedDefaults: legacySaved }
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION))
      persistState(merged)
      return merged
    }

    if (storedVersion < STORAGE_VERSION) {
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION))
      const factory = createFactoryState()
      persistState(factory)
      return factory
    }

    if (!raw) {
      return createFactoryState()
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
    return createFactoryState()
  }
}

function persistState(state: PersistedFeatureFlags): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function flagsEqual(a: FeatureFlagState, b: FeatureFlagState): boolean {
  return FEATURE_FLAGS.every(({ id }) => a[id] === b[id])
}

const initialState = loadPersistedState()

function applyFactoryReset(): void {
  const factory = createFactoryState()
  persistState(factory)
  useFeatureFlagStore.setState({
    flags: factory.active,
    savedDefaults: factory.savedDefaults,
  })
}

export function initFeatureFlags(): void {
  const params = new URLSearchParams(window.location.search)
  if (params.has('resetFeatureFlags')) {
    applyFactoryReset()
    params.delete('resetFeatureFlags')
    const nextSearch = params.toString()
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
    window.history.replaceState({}, '', nextUrl)
  }
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: initialState.active,
  savedDefaults: initialState.savedDefaults,

  setFlag: (id, enabled) => {
    if (!enabled && LOCKED_ON_FLAGS.includes(id)) return

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
    applyFactoryReset()
  },

  hasPendingChanges: () => !flagsEqual(get().flags, get().savedDefaults),

  isEnabled: (id) => isFeatureEnabled(get().flags, id),
}))

export function useFeatureFlagsDirty(): boolean {
  return useFeatureFlagStore(
    (state) => !flagsEqual(state.flags, state.savedDefaults),
  )
}

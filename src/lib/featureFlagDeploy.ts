import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  type FeatureFlagId,
} from '@/config/featureFlags'

export interface FeatureFlagDefaultsFile {
  version: number
  updatedAt: string
  flags: Record<FeatureFlagId, boolean>
}

export class FeatureFlagDeployError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeatureFlagDeployError'
  }
}

function mergeFlags(
  partial?: Partial<Record<FeatureFlagId, boolean>>,
): Record<FeatureFlagId, boolean> {
  return { ...DEFAULT_FEATURE_FLAGS, ...partial }
}

export function normalizeFeatureFlagDefaults(
  payload: unknown,
): FeatureFlagDefaultsFile {
  if (!payload || typeof payload !== 'object') {
    throw new FeatureFlagDeployError('Invalid feature flag defaults payload.')
  }

  const data = payload as Partial<FeatureFlagDefaultsFile>
  if (!data.flags || typeof data.flags !== 'object') {
    throw new FeatureFlagDeployError('Missing feature flag defaults.')
  }

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : new Date().toISOString(),
    flags: mergeFlags(data.flags),
  }
}

export async function fetchDeployedFeatureFlags(): Promise<FeatureFlagDefaultsFile> {
  try {
    const response = await fetch(`/feature-flag-defaults.json?ts=${Date.now()}`)
    if (!response.ok) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        flags: { ...DEFAULT_FEATURE_FLAGS },
      }
    }

    return normalizeFeatureFlagDefaults(await response.json())
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      flags: { ...DEFAULT_FEATURE_FLAGS },
    }
  }
}

export function buildFeatureFlagDefaultsFile(
  flags: Record<FeatureFlagId, boolean>,
  version = Date.now(),
): FeatureFlagDefaultsFile {
  const normalized = mergeFlags(flags)
  normalized['header.settings'] = true

  return {
    version,
    updatedAt: new Date().toISOString(),
    flags: normalized,
  }
}

export async function deployFeatureFlags(
  flags: Record<FeatureFlagId, boolean>,
  passphrase: string,
): Promise<FeatureFlagDefaultsFile> {
  const payload = buildFeatureFlagDefaultsFile(flags)

  const response = await fetch('/api/deploy-feature-flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, passphrase }),
  })

  const body = (await response.json().catch(() => null)) as
    | FeatureFlagDefaultsFile
    | { error?: string }
    | null

  if (!response.ok) {
    throw new FeatureFlagDeployError(
      body && 'error' in body && body.error
        ? body.error
        : 'Unable to deploy feature flag defaults.',
    )
  }

  return normalizeFeatureFlagDefaults(body)
}

export function allFeatureFlagIds(): FeatureFlagId[] {
  return FEATURE_FLAGS.map((flag) => flag.id)
}

export const MIN_BALL_ON = 1
export const MAX_BALL_ON = 99

export function clampBallOn(ballOn: number): number {
  if (Number.isNaN(ballOn)) return MIN_BALL_ON
  return Math.max(MIN_BALL_ON, Math.min(MAX_BALL_ON, Math.round(ballOn)))
}

/** Apply an offense yard gain/loss to ball-on and distance-to-go. */
export function applyYardDelta(params: {
  ballOn: number
  distance: number
  delta: number
}): { ballOn: number; distance: number } {
  const nextBallOn = clampBallOn(params.ballOn + params.delta)
  const actualDelta = nextBallOn - params.ballOn
  const nextDistance = Math.max(1, params.distance - actualDelta)
  return { ballOn: nextBallOn, distance: nextDistance }
}

import type { Ref } from 'react'
import {
  clampBallOn,
  getFootballRuleset,
  type FootballCode,
} from '@/lib/football'
import { ScoreboardStepperField } from '@/components/game/ScoreboardStepperField'

interface BallOnEditorProps {
  /** Offense-relative yards from own goal. */
  ballOn: number
  onBallOnChange: (ballOn: number) => void
  inputRef?: Ref<HTMLInputElement>
  rulesetId?: FootballCode
}

function parseBallOnInput(raw: string, rulesetId?: FootballCode): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  return clampBallOn(Number.parseInt(digits, 10), rulesetId)
}

/** Mobile-friendly − / value / + editor for offense-relative ball-on. */
export function BallOnEditor({
  ballOn,
  onBallOnChange,
  inputRef,
  rulesetId,
}: BallOnEditorProps) {
  const rules = getFootballRuleset(rulesetId)
  const clamped = clampBallOn(ballOn, rulesetId)

  return (
    <ScoreboardStepperField
      id="ball-on-edit-value"
      label="Ball on"
      value={clamped}
      displayValue={String(clamped)}
      min={rules.minBallOn}
      max={rules.maxBallOn}
      groupLabel="Edit ball on"
      autoFocus
      inputRef={inputRef}
      parseInput={(raw) => parseBallOnInput(raw, rulesetId)}
      onChange={onBallOnChange}
    />
  )
}

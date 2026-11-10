import {
  clampBallOn,
  getFootballRuleset,
  type FootballCode,
} from '@/lib/football'
import { ScrollWheelField } from '@/components/game/ClockWheelEditor'

interface BallOnEditorProps {
  /** Offense-relative yards from own goal. */
  ballOn: number
  onBallOnChange: (ballOn: number) => void
  rulesetId?: FootballCode
}

function rangeInclusive(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

/** Scroll-wheel editor for offense-relative ball-on — same as the time picker. */
export function BallOnEditor({
  ballOn,
  onBallOnChange,
  rulesetId,
}: BallOnEditorProps) {
  const rules = getFootballRuleset(rulesetId)

  return (
    <ScrollWheelField
      values={rangeInclusive(rules.minBallOn, rules.maxBallOn)}
      value={clampBallOn(ballOn, rulesetId)}
      onChange={onBallOnChange}
      groupLabel="Edit ball on"
    />
  )
}

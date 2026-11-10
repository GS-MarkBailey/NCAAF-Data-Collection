import {
  clampDistance,
  clampDown,
  getFootballRuleset,
  type FootballCode,
} from '@/lib/football'
import { ScrollWheelField } from '@/components/game/ClockWheelEditor'

export type DownDistanceEditTab = 'down' | 'distance'

interface DownDistanceEditorProps {
  down: number
  distance: number
  onDownChange: (down: number) => void
  onDistanceChange: (distance: number) => void
  initialTab?: DownDistanceEditTab
  /** League rules pack — drives max downs (4 NCAA/NFL, 3 CFL). */
  rulesetId?: FootballCode
}

function rangeInclusive(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

export function DownDistanceEditor({
  down,
  distance,
  onDownChange,
  onDistanceChange,
  initialTab = 'down',
  rulesetId,
}: DownDistanceEditorProps) {
  const rules = getFootballRuleset(rulesetId)

  if (initialTab === 'distance') {
    return (
      <ScrollWheelField
        values={rangeInclusive(rules.minDistance, rules.maxDistance)}
        value={clampDistance(distance, rules)}
        onChange={(next) => onDistanceChange(clampDistance(next, rules))}
        groupLabel="Edit yards to go"
      />
    )
  }

  return (
    <ScrollWheelField
      values={rangeInclusive(rules.minDown, rules.maxDown)}
      value={clampDown(down, rules)}
      onChange={(next) => onDownChange(clampDown(next, rules))}
      groupLabel="Edit down"
    />
  )
}

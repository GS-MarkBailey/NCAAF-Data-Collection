import type { Ref } from 'react'
import {
  clampDistance,
  clampDown,
  getFootballRuleset,
  parseDistanceInput,
  parseDownInput,
  type FootballCode,
} from '@/lib/football'
import { ScoreboardStepperField } from '@/components/game/ScoreboardStepperField'

export type DownDistanceEditTab = 'down' | 'distance'

interface DownDistanceEditorProps {
  down: number
  distance: number
  onDownChange: (down: number) => void
  onDistanceChange: (distance: number) => void
  initialTab?: DownDistanceEditTab
  downInputRef?: Ref<HTMLInputElement>
  distanceInputRef?: Ref<HTMLInputElement>
  /** League rules pack — drives max downs (4 NCAA/NFL, 3 CFL). */
  rulesetId?: FootballCode
}

export function DownDistanceEditor({
  down,
  distance,
  onDownChange,
  onDistanceChange,
  initialTab = 'down',
  downInputRef,
  distanceInputRef,
  rulesetId,
}: DownDistanceEditorProps) {
  const rules = getFootballRuleset(rulesetId)
  const clampedDown = clampDown(down, rules)
  const clampedDistance = clampDistance(distance, rules)

  if (initialTab === 'distance') {
    return (
      <ScoreboardStepperField
        id="distance-edit-value"
        label="To go"
        value={clampedDistance}
        displayValue={String(clampedDistance)}
        min={rules.minDistance}
        max={rules.maxDistance}
        groupLabel="Edit yards to go"
        autoFocus
        inputRef={distanceInputRef}
        parseInput={(raw) => parseDistanceInput(raw, rules)}
        onChange={(next) => onDistanceChange(clampDistance(next, rules))}
      />
    )
  }

  return (
    <ScoreboardStepperField
      id="down-edit-value"
      label="Down"
      value={clampedDown}
      displayValue={String(clampedDown)}
      min={rules.minDown}
      max={rules.maxDown}
      groupLabel="Edit down"
      autoFocus
      inputRef={downInputRef}
      parseInput={(raw) => parseDownInput(raw, rules)}
      onChange={(next) => onDownChange(clampDown(next, rules))}
    />
  )
}

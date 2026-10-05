/**
 * Static wiring audit for progressive play collection → END PLAY resolution.
 * Run: node scripts/audit-play-wiring.mjs
 *
 * Mirrors getPlayResultKind rules so regressions fail in CI/local without vitest.
 */

function getPlayResultKind(path) {
  if (!path?.length) return 'yards'
  const isKickoff = path.includes('kickoff')
  const isTry = path.includes('try')

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const id = path[index]
    if (isTry) {
      switch (id) {
        case 'pat_good':
          return 'conversion_kick_good'
        case 'pat_no_good':
          return 'conversion_kick_miss'
        case 'two_point_good':
          return 'conversion_play_good'
        case 'two_point_no_good':
          return 'conversion_play_miss'
        case 'defensive_two_point':
          return 'defensive_conversion'
        default:
          break
      }
    }
    if (isKickoff) {
      switch (id) {
        case 'touchback':
          return 'kickoff_touchback'
        case 'fair_catch':
          return 'kickoff_fair_catch'
        case 'kick_out_of_bounds':
          return 'kickoff_out_of_bounds'
        case 'return_touchdown':
          return 'kickoff_touchdown'
        case 'recovery_kicking':
          return 'kickoff_recovery_kicking'
        case 'recovery_receiving':
          return 'kickoff_recovery_receiving'
        case 'tackle':
        case 'return_out_of_bounds':
        case 'return':
          return 'kickoff_return'
        default:
          break
      }
    }
    switch (id) {
      case 'touchdown':
        return 'touchdown'
      case 'incomplete':
      case 'out_of_bounds':
        return 'incomplete'
      case 'interception':
        return 'interception'
      case 'recovery_defense':
      case 'rush_fumble':
        return 'fumble_lost'
      case 'recovery_offense':
      case 'play_fumble':
        return 'yards'
      case 'punt':
        return 'punt'
      case 'play_out_of_bounds':
        return 'play_out_of_bounds'
      case 'tackle':
      case 'catch':
      case 'rush':
        return 'yards'
      default:
        break
    }
  }
  if (isKickoff) return 'kickoff_return'
  return 'yards'
}

const CASES = [
  [['kickoff', 'touchback'], 'kickoff_touchback'],
  [['kickoff', 'fair_catch'], 'kickoff_fair_catch'],
  [['kickoff', 'kick_out_of_bounds'], 'kickoff_out_of_bounds'],
  [['kickoff', 'return', 'tackle'], 'kickoff_return'],
  [['kickoff', 'return', 'return_touchdown'], 'kickoff_touchdown'],
  [['kickoff', 'muff', 'recovery_receiving'], 'kickoff_recovery_receiving'],
  [['kickoff', 'muff', 'recovery_kicking'], 'kickoff_recovery_kicking'],
  [['kickoff', 'return', 'return_fumble', 'recovery_kicking'], 'kickoff_recovery_kicking'],
  [['rush', 'tackle'], 'yards'],
  [['rush', 'touchdown'], 'touchdown'],
  [['rush', 'play_fumble', 'recovery_defense'], 'fumble_lost'],
  [['rush', 'play_fumble', 'recovery_offense'], 'yards'],
  [['throw', 'incomplete'], 'incomplete'],
  [['throw', 'catch', 'touchdown'], 'touchdown'],
  [['throw', 'interception'], 'interception'],
  [['punt'], 'punt'],
  [['try', 'pat_kick', 'pat_good'], 'conversion_kick_good'],
  [['try', 'pat_kick', 'pat_no_good'], 'conversion_kick_miss'],
  [['try', 'two_point', 'two_point_good'], 'conversion_play_good'],
  [['try', 'two_point', 'defensive_two_point'], 'defensive_conversion'],
]

let failed = 0
for (const [path, expected] of CASES) {
  const actual = getPlayResultKind(path)
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL ${path.join(' → ')} => ${actual} (expected ${expected})`)
  } else {
    console.log(`ok   ${path.join(' → ')} => ${actual}`)
  }
}

if (failed) {
  console.error(`\n${failed} wiring case(s) failed`)
  process.exit(1)
}
console.log(`\nAll ${CASES.length} wiring cases passed`)

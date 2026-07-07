# NCAAF Data Collection — Weekly Build in Public

**Product:** NCAAF live game data collection console  
**Live demo:** https://ncaaf-data-collection.vercel.app  
**Repository:** GitHub (auto-deployed to Vercel on each change)  
**Period covered:** 16 June 2026 – 12 July 2026  
**Last updated:** 7 July 2026

---

## Executive summary

We built a mobile-first NCAAF data collection prototype from scratch in four weeks of active development. The app lets operators select a fixture, take control of a live game console, manage the clock and scoreboard, toggle risk flags, and review an action log — optimised for landscape and portrait phones, installable as a PWA, and configurable via deployable feature flags.

| Week | Dates | Theme | Highlights |
|------|-------|-------|------------|
| 1 | 16–22 Jun 2026 | Foundation | App scaffold, three-panel game console, PWA, Vercel deploy pipeline |
| 2 | 23–29 Jun 2026 | Config groundwork | Feature flags panel polish |
| 3 | 30 Jun–5 Jul 2026 | Game logic & platform | Clock editor, period flow, field direction, feature flag deploy, error toasts |
| 4 | 6–12 Jul 2026 | Fixtures & mobile | Filters, pull-to-refresh, portrait layout, iOS fixes |

**Total:** ~154 commits · React + Vite + TypeScript · shadcn/ui · Zustand

---

## Week 1 — 16 to 22 June 2026

**Theme:** From zero to deployable prototype

### Shipped

**Application foundation**
- React + Vite + TypeScript app with Tailwind CSS and shadcn/ui component library
- Custom design system: Klarheit Kurrent font, brand colours, panel styling
- Dual UI approach (custom + shadcn variants) with toggle for dev comparison
- Routing: Fixtures list → Game console per fixture
- Zustand state management for games, fixtures, and operator actions

**Fixtures screen**
- List of matches; tap any fixture to open the game console
- Demo fixture: Concordia Wisconsin vs Rockford with sample data

**Game console (landscape mobile)**
- **Scoreboard panel** — game clock, quarter, down/distance, ball-on, possession, score
- **Play-by-play panel** — live feed grouped by quarter, newest events first
- **Risk management panel** — toggle chips for challenge, stat delay, big play, penalty, touchdown, play about to start, etc.

**Core interactions**
- **Take Control** — operator override mode with red border/background; confirmation before activating
- **Clock** — tap to pause/start; ±1 second adjustment; visual pause state (faint red background)
- **Risk toggles** — tap to activate/deactivate individual risk flags
- **Play-by-play simulation** — events generated as clock runs; pulse highlight on new entries; quarter-start events

**Action log & audit**
- All operator actions recorded with game clock timestamp
- Action log dialog with CSV export

**Mobile & PWA**
- Optimised for landscape mobile (`landscape-mobile` breakpoint)
- Web app manifest, Apple touch icons, service worker
- Add to Home Screen support (standalone mode without Safari chrome)
- Safe-area padding for iPhone notch / Dynamic Island
- Landscape notch-side padding detection

**Deployment & tooling**
- GitHub repository connected to Vercel
- SPA routing fix (no 404 on refresh)
- Cursor auto-commit hook → push to GitHub → Vercel auto-deploy
- GitLab remote explored for Genius Sports org; workflow standardised on GitHub + Vercel
- Vercel commit author email fix for successful deployments

**UI polish**
- Panel borders on all three game containers
- Centred header layout for team names and score
- Expanded dummy fixture dataset
- Clock behaviour: 15:00 on new quarter; 00:30 on prototype reset
- Take Control mode no longer shifts layout sizes

### Technical notes
- ~65 commits this week
- ~47 files touched; net +2,034 / −737 lines vs initial commit

---

## Week 2 — 23 to 29 June 2026

**Theme:** Feature configuration groundwork

### Shipped

- Refinements to the **Feature Flags panel** in Settings (UI tab)
- Updates to action log dialog and feature flag store wiring
- Minor integration fixes in app bootstrap (`main.tsx`)

### Notes
- Quiet week in terms of commits (4 total); larger feature-flag architecture landed in Week 3
- Focus was stabilising the flags UI before adding deploy capability

---

## Week 3 — 30 June to 5 July 2026

**Theme:** Production-grade game controls and remote configuration

### Shipped

**Feature flags system**
- 20+ flags across five groups: Game Console, Header, Scoreboard, Risk Management, Settings
- Settings → UI tab: toggle any panel, header element, scoreboard behaviour, or risk type
- Parent/child flag dependencies (e.g. scoreboard sub-flags require scoreboard panel)
- Settings gear always available (cannot be hidden by accident)
- **Deploy to Vercel:** confirm changes with passphrase → updates `feature-flag-defaults.json` for all users
- Serverless API (`/api/deploy-feature-flags`) + dev middleware
- Recovery via `?resetFeatureFlags` URL parameter
- Published defaults: play-by-play hidden by default; connection status configurable

**Field direction & ball-on**
- First-open dialog: set which direction the home team attacks
- Ball-on arrow reflects attacking direction and possession
- Arrow direction flips each quarter (NCAAF end swaps)
- Field direction editable later in Settings → Field tab
- Styled to match Take Control confirmation pattern

**Scoreboard & clock overhaul**
- **Clock wheel editor** — iOS-style scroll pickers for period · minutes : seconds
- Tap clock → edit with Cancel / Confirm
- Tap elsewhere in clock area → pause or start
- **Full period lifecycle:**
  - KICK OFF (pre-game)
  - END PERIOD when clock reaches 0:00
  - START PERIOD after period ended
  - End-of-regulation choice: start overtime or end game
  - END GAME in overtime
  - MATCH ENDED display when game finished
- Pause/Start chip always visible
- Cancel/Confirm confirmation for end period, end game, and start overtime
- Quarter status cell colour coding (feature-flagged)
- Clock editor capped at 15 minutes

**Connection status**
- Chip beside back button with dropdown statuses:
  - Heartbeat
  - Match State Platform
  - Remote Data Store

**Error toast**
- Top-right notification: red background, alert icon, swipe to dismiss (up or right), close button
- Only appears at fixture level after field direction is set
- Animated enter/exit

**Settings dialog**
- Log button replaced with Settings (gear icon)
- Tabs: **Log** | **Field** | **UI**
- Consistent dialog height across all tabs
- Action log entry styling improvements

**UI consolidation**
- Removed custom/shadcn toggle — **shadcn-only** going forward
- Simplified codebase; single UI variant in production

**DevOps**
- Auto-deploy hook fix when GitHub CLI credential helper unavailable (macOS keychain fallback)

### Technical notes
- ~53 commits this week
- ~30 files touched; net +1,996 / −304 lines
- Key new modules: `ClockWheelEditor`, `ConnectionStatusChip`, `ErrorToastHost`, `featureFlagDeploy`, `api/deploy-feature-flags`

---

## Week 4 — 6 to 12 July 2026

**Theme:** Fixtures experience and portrait iPhone readiness

### Shipped

**Fixtures page**
- **Filters:** start date, start time, team (alphabetised dropdown), fixture ID — all derived from fixture data
- **Unified search** — one search box for teams, times, dates, and IDs
- Filters and search on a single compact row; responsive grid on mobile
- **Status chips:** green “Scheduled” for upcoming; neutral for past fixtures
- **Sort order:** furthest-ahead fixtures at top
- **Past fixtures** added to demo data with final scores
- **Post-match state:** opening a past fixture loads ended-game view (same as operator ending a game)
- **Pull-to-refresh** with success toast (“Fixtures list refreshed”)

**Match-ended scoreboard behaviour**
- Final scores on past fixtures
- QTR, DOWN, TO GO, BL ON show em dash (—) when match ended
- No possession indicator when match ended
- Reusable logic for all match-ended states

**Portrait mobile — game page**
- Removed tabs on portrait; scoreboard, play-by-play, and risks **stack vertically**
- **Header layout (portrait):**
  - Row 1: back + connection chip | settings + take control
  - Row 2: home · score · away
- Clock and action chips on separate rows (no accidental clock tap)
- Panels fill vertical space with visible borders
- Stat cells resized for small screens (no text clipping)
- Possession buttons: corner rounding matches container (home = bottom-left, away = bottom-right)

**iOS & PWA fixes**
- Prevent page rubber-banding / swipe on iPhone
- Unified background colour (`#f1f4f9`) across app, theme-color, and manifest
- **Blank screen fix** on iPhone (layout regression from scroll-lock CSS)
- App loads even if feature-flag fetch fails offline
- Verified live deployment on Vercel

**Clock editor (portrait)**
- Wheel picker initialises to current period/time on open
- Fixed layout: picker no longer overlaps Cancel / Confirm buttons (fixed 84px viewport height)

### Technical notes
- ~32 commits this week (heavy session 7 July)
- ~26 files touched; net +1,507 / −365 lines

---

## Current product capabilities (as of 7 July 2026)

| Area | Status |
|------|--------|
| Fixtures list with filters, search, sort, pull-to-refresh | ✅ |
| Scheduled vs past fixture status | ✅ |
| Post-match fixture entry | ✅ |
| Three-panel game console (landscape + portrait) | ✅ |
| Take Control with confirmation | ✅ |
| Clock edit (wheel picker) + pause/start | ✅ |
| Full period / overtime / game-end flow | ✅ |
| Field direction + quarter-end flip | ✅ |
| Risk management toggles | ✅ |
| Play-by-play (feature-flagged, off by default) | ✅ |
| Action log + CSV export | ✅ |
| Feature flags with Vercel deploy | ✅ |
| Connection status chip (feature-flagged) | ✅ |
| Error toast (fixture-scoped) | ✅ |
| PWA / Add to Home Screen | ✅ |
| iPhone portrait + landscape safe areas | ✅ |
| Auto-deploy GitHub → Vercel | ✅ |

---

## Architecture snapshot

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router |
| Hosting | Vercel |
| Config | `feature-flag-defaults.json` + deploy API |
| Data | In-memory fixtures & demo plays (no backend API yet) |

---

## Known limitations & follow-ups

- Demo data only — no live feed or backend integration yet
- Feature flag deploy requires passphrase (not end-user self-service)
- Clock wheel initialisation on iPhone may need further device testing
- Play-by-play simulation is synthetic, not tied to real game events
- Connection status chip is UI-only (no real connectivity check)

---

## How to try it

1. Open https://ncaaf-data-collection.vercel.app on a phone or desktop
2. On iPhone: Safari → Share → Add to Home Screen for full-screen PWA
3. Select a fixture from the list
4. Set field direction on first open (if enabled)
5. Use Take Control, clock, scoreboard, and risk panels as an operator would

---

*Document generated from git history and development sessions. For internal Confluence: paste this page or import the markdown file. Adjust audience wording as needed for external vs internal “build in public” posts.*

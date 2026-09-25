# OpenMouse — Design Style Guide (Apple HIG)

This project follows **Apple Human Interface Guidelines** conventions. Read
this guide before touching any UI. It is the single source of truth for
visual style.

## Stylesheet architecture

- `src/control.css` — design tokens (`:root` / `.control-shell` /
  `[data-interface-theme]`), all legacy component styles, and the older
  Apple HIG layer appended at its end. **Do not add new component styles
  here.**
- `src/apple.css` — the redesign authority, pulled in via
  `@import "./apple.css"` at the top of `control.css`. All new chrome lives
  here, scoped under `.control-shell.apple-redesign` (always present on the
  shell, see `App.tsx`).
- `src/control-devices.css`, `src/control-profiles.css` — imported device /
  profile styles (IDs live here; see specificity below).
- `src/admin.css`, `src/launch.css`, `src/offline-banner.css` — standalone
  sheets with their own (Apple-mapped) values; they never read app tokens.
- **Specificity contract.** `apple.css` loads *first*, so ties lose to later
  `control.css` rules. New overrides must strictly beat what they replace:
  `.control-shell.apple-redesign …` (0,3,0+) beats plain and
  `.control-shell`-scoped (0,2,0) rules. Anything ID-scoped upstream
  (`#pulsar-advanced`, `#logitech-analog-button-settings`, …) needs an ID in
  the override. When in doubt, check computed styles in the browser instead
  of guessing.
- **Never hardcode colors in components** — use theme tokens. Art/SVG/glyph
  fills may only use `currentColor`, `var(--surface-*)`, or `color-mix()`
  against tokens. Exception: data-driven hues (e.g. per-action colors in
  `CaptureDialog`) may flow through inline `color-mix()` — never raw hex.

## Themes

- 12 accent themes are **preserved as-is**: `Matt`, `Emerald`, `Violet`,
  `Ice`, `Ember`, `Mono`, `Miku`, `Catppuccin Mocha/Macchiato/Frappé`,
  `NieR: Automata`, `Light`. Never restyle inside a
  `[data-interface-theme]` block except to fix a bug.
- The default face is **Emerald** (`#5dde89`, own block — it no longer leaks
  from the base). The base `.control-shell` accent (`#0A84FF`) is only the
  unthemed fallback. Light uses `#0071E3`.
- Semantics: success `#30D158`, warning `#FFD60A`, destructive `#FF453A`,
  info `#0A84FF`. Battery icons keep fixed semantic hues in every theme.
- Theme swatch dots (`[data-theme-preview]`) must match their block accent.
  `interfaceThemeSlug()` maps display names to `data-interface-theme` slugs.
- New work must hold up in the default appearance **and** at least one
  legacy theme (Mono white-accent and Light are the harshest critics).

## Finishes

- `surfaceFinish` preference (`Frosted` default, `Flat` alternative,
  persisted, `data-surface-finish` on the shell, switch in Settings).
- Frosted: every grouped surface goes translucent
  (`rgb(22 22 26 / 72%)`-class gradient) with `blur(20px) saturate(160%)`
  plus an inset top edge-light so glass reads over near-black. Nested cards
  inside frosted parents stay clear (`.performance-controls .setting-card`).
  Light has white-glass variants.
- The shell backdrop is a six-glow ambient mesh (blue/teal/violet/pink/
  green) so glass has light to refract. Flat kills mesh, blur, and
  translucency (each frosted selector needs a Flat override).
- Always verify **both** finishes. Heavy blur over scrolling cards costs
  GPU — Flat is the escape hatch.

## Typography

- System stack (`-apple-system, SF Pro Text/Display, …`), Display for titles
  (`letter-spacing: -0.02~-0.03em`, `800` for page titles), tabular numerals
  for all telemetry (DPI/Hz/%/firmware).
- Card overlines: `0.66rem/700/0.12em` uppercase, accent-mixed
  (`color-mix(--ui-accent 72%, --text-soft)`). Section footers/notes:
  `0.74–0.78rem`, `1.55–1.6` line-height, capped width.
- `text-wrap: pretty/balance` on prose and titles.

## Sidebar (`.app-sidebar`)

- Translucent rail (264px, 232px ≤1100px), right hairline, no floating card.
- Section captions (`side.devices` / `side.general`), hidden when collapsed.
- Items: 40px, `10px` radius, monochrome 1.7-stroke icons (`--muted`,
  accent when active). **No chevrons.** Content controls elsewhere target
  44px minimum.
- Brand row: logo + Display wordmark (ellipsis) + version pill (capped,
  hidden ≤1100px so it can never overflow a narrow rail).
- Collapse is global and persisted (`sidebarCollapsed` preference, toggle on
  every page). Collapsing only ever hid labels — captions follow suit.

## Sliding selection

- Sidebar navs, the dashboard tab bar, and game-profile tabs share one
  pattern: a `useSlidingPill(dep)`-driven `.sliding-pill` span glides behind
  the `.active` child (spring `0.32s`, layout offsets so scroll can't
  desync it, invisible until first measure, ResizeObserver for
  collapse/resize/fonts).
- Containers carry `.has-sliding-pill` (relative); direct buttons/links sit
  at `z-index: 1` for hover feedback; static `.active` fills go transparent
  so only the pill paints (`tabs-pill` 999px wash, `sidebar-pill` 10px
  accent tint). Reduced motion disables the glide.

## Tab bar (`.device-tabs-bar`)

- Frosted segmented control: Back pinned left (ghost), section pills share
  the rest as equal `flex: 1` segments, all `999px`, no underline tick.
  Horizontal scroll (hidden scrollbar) is the narrow-screen fallback.

## Cards, tiles, sheets

- Radii: tiles and setting cards `20px`, settings rows `16px`, hero art
  `24px`, dialogs/sheets `20px` (`shortcut-dialog` `16px`), pills `999px`.
  Squircles (`corner-shape: squircle` under `@supports`, `border-radius`
  fallback) on squarish surfaces only — never capsules, switches, hairlines.
- Tiles: gradient grouped cards, hairline, success hairline when connected,
  monochrome gear circle, hover lift. Connected-device art is
  `object-fit: contain`, never cropped.
- Card interiors: accent overline + Display title + pill scope badges +
  tabular readouts; DPI preset rows are 44px touch rows (hover, accent-wash
  active, circular index badge); action footers divided; notes capped.
- Sheets/menus/toasts/banners: frosted with sheet shadow; Flat solid.
  Capture dialog styles live as `.capture-*` token classes.

## Controls doctrine

- **CTAs stay solid** (Add mouse, Start test, Apply, submits, destructive
  End-test). **Choices go glass**: option groups are transparent on
  translucent hairline containers; the choice is an accent wash
  (`26%` + bright text + `45%` ring). Secondary actions are ghosts
  (transparent + dim hairline, accent wash on hover).
- Switches are iOS: muted track, `--success` on, white knob — both switch
  implementations (`.switch-button`, `.switch-track`).
- Fields/inputs/selects stay solid (text-entry contrast). Status pills,
  verdicts, and notes use state-colored washes, never grey slabs.

## Status, notes, spec rows

- Dev/testing notes: theme surface, state-colored left edge + label,
  neutral body (`testing-note`, hardware verdict/crosscheck/summary follow
  the same wash language).
- Device detail rows (`.mouse-test-device-*`): grouped-list rows — bright
  500 keys, hairline dividers, bright tabular values, mono wrap blocks.

## Showcase & hero

- Leader-line diagram: fixed `12.5rem` rails, shrinking canvas
  (`max-width: 900px`), value-only pills ≤1100px. Artwork gets an accent
  glow. A `?` render means the bucket has no art for that model (use the
  Request Artwork flow — not a styling bug).
- Empty state is a hero: eyebrow, Display title, blue pill CTA wired to
  connect, glowing art panel, three feature rows with icons.

## Scroll & motion

- The main column scrolls at the window edge (thin styled bar); content is
  a centered inner column (`max-width: 1080`). The pending bar pins to the
  viewport bottom via sticky; workspace tabs stick at `top: 12px`.
- Short pages must never earn a dead scrollbar (size wrappers against
  shell padding, e.g. `.welcome-with-devices`).
- `.reduce-interface-motion` kills transitions/anims (pill glide included);
  `control-profiles.css` also honors `prefers-reduced-motion`.

## Strings & prefs

- User-facing copy lives in `src/i18n.ts` + all 10 locale files — typed
  `Record`s, so a missing key fails `tsc`. English fallback ships in-table
  for untranslated locales.
- Live prefs: `theme`, `surfaceFinish`, `sidebarCollapsed`
  (`glassIntensity` is reserved legacy — no UI reads it).

## Commandments

1. Never crop a product rendering; always `object-fit: contain`.
2. Never hardcode a color in TSX — tokens, `currentColor`, or `color-mix()`
   (data-driven hues via `color-mix()` inline excepted).
3. Never add a per-icon rainbow color; the sidebar is monochrome + accent.
4. Never write a new override at tied specificity — it loses to later
   `control.css`. Scope `.control-shell.apple-redesign`, beat the old
   specificity, mirror IDs.
5. Never add blur/translucency without covering **both** finishes and
   Flat's override list.
6. Never use `overflow: hidden` to "fix" artwork — pin the image box with
   absolute positioning instead.
7. Never introduce a new UI concept (page, card, dialog, control) without
   reading this file and matching the Apple conventions above.

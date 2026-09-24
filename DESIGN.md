# OpenMouse — Design Style Guide (Apple HIG)

This project follows **Apple Human Interface Guidelines** conventions. Read
this guide before touching any UI. It is the single source of truth for
visual style.

All design tokens live in `src/control.css` (CSS custom properties on the
`:root` / `.control-shell` / `[data-interface-theme]` blocks, plus the
**Apple HIG layer** appended at the end of the file). **Never hardcode colors
in components** — use the theme tokens. Art/SVG/glyph fills may only use
`currentColor`, `var(--surface-*)`, or `color-mix()` against tokens; never
hardcode hue values anywhere in TSX.

Legacy accent themes (`Matt`, `Emerald`, `Violet`, `Ice`, `Ember`, `Mono`,
`Miku`, `Catppuccin Mocha/Macchiato/Frappé`, `NieR: Automata`, `Light`) are
**preserved as-is** for existing users. New work targets the default Apple
system appearance and must hold up in both `Frosted` and `Flat` finishes.

## Core principles

- **SF typography**: system stack
  (`-apple-system, SF Pro Text/Display, Helvetica Neue, Segoe UI`), Display
  for titles with `letter-spacing: -0.02~-0.03em`, tabular numerals for
  telemetry, uppercase `0.06em` overlines for section labels.
- **Grouped surfaces**: content sits on a system background (`#000000` dark /
  `#F5F5F7` light) inside `#1C1C1E` / `#FFFFFF` grouped cards, `10–12px`
  continuous corners, `1px` hairline separators (`rgb(255 255 255 / 10%)` /
  `rgb(0 0 0 / 10%)`), one quiet shadow — never heavy layered elevation.
- **Translucency with an off-switch**: bars and sheets (sidebar, tab bar,
  pending bar, toasts, menus, dialogs) use
  `backdrop-filter: blur(20px) saturate(180%)` under
  `[data-surface-finish="frosted"]` (default). `[data-surface-finish="flat"]`
  (Settings → Surface finish → Flat) disables every blur and translucency.
- **Monochrome icons**: navigation and inline icons are thin Lucide strokes
  (`stroke-width: 1.7`, `stroke="currentColor"`, ~18px). The active item tints
  its icon with `--ui-accent`. Per-item rainbow colors are gone. State icons
  use `.icon-state-on` (`--success`) / `.icon-state-off` (`--muted`).
- **Squircles**: squarish surfaces (icon tiles, device tiles, cards, sheets)
  use Apple's continuous corners via native `corner-shape: squircle`,
  scoped in `src/apple.css` under `@supports` with `border-radius`
  fallbacks. This is Chromium-only CSS on a Chromium-only (WebHID) app.
  Capsules (`999px`), switches, and hairlines are excluded — the property
  is a no-op on them.
- **Apple controls**: pill-container segmented controls with a solid accent
  selected state, iOS-style switches (accent-green on), hairline text fields
  with `10px` radius, accent-filled sliders, blue filled pill primary buttons
  plus plain secondary buttons.
- **Color**: Apple system palette. Default accent `#0A84FF` (dark) /
  `#0071E3` (light); success `#30D158`, warning `#FFD60A`, destructive
  `#FF453A`, info `#0A84FF`. Battery keeps fixed semantic hues in every theme.
- **Clarity over density**: 44px minimum nav targets, generous line-height
  (`1.55` body), `text-wrap: pretty/balance`, tabular numerals for Hz/DPI/%.

## Layout

### Sidebar (`.app-sidebar`)

Apple-style translucent rail, not a floating card:

- Full-height rail, no outer margin or rounded panel, right hairline only,
  `var(--surface-sidebar)` + blur under Frosted.
- Nav items (`.app-sidebar-nav-item`): 44px tall, `10px` radius, flex row of
  `[icon] [label]`. **No `>` chevrons** (`.app-sidebar-nav-arrow` is hidden).
- Active item: `color-mix(--ui-accent 14%, surface)` pill, semibold label,
  accent icon. Inactive icons stay `--muted`.
- Brand row keeps the logo + `OpenMouse` Display wordmark + build version.
- Section order: top nav = Home, Dashboard, Mouse Check, Hardware Test,
  (Games when Bridge active), Docs. Bottom nav = What's New, Feedback,
  Settings.

### Device cards & grids

- Tiles (`.device-tile`, `.add-device-tile`) are grouped cards: `12px`
  radius, hairline border, `--shadow-card`. Connected tile gets a success
  hairline. Gear button is a borderless circle, monochrome.
- Device artwork: always `object-fit: contain`, never cropped.
- Showcase keeps leader-line diagram; values use tabular numerals.
- Status pills (`.showcase-sidebar-status`) are hairline capsules.

### Bars, sheets, feedback

- Tab bars (`.workspace-tabs`, `.device-tabs-bar`): frosted segmented bar,
  `10px` radius, active tab gets an accent soft pill + accent underline tick.
- Pending bar (`.apply-bar`), toasts (`.toast-stack`), menus
  (`.locale-menu`, `.option-menu-list`): frosted under Frosted, solid under
  Flat, `10–12px` radius, sheet shadow.
- Dialogs (`.support-dialog`, `.capture-dialog`, incl. Capture/Feedback/
  ShareProfile/ArtworkRequest/GameRequest/WhatsNew): `16px` Apple sheets with
  blurred scrims. The capture dialog's former inline hex styles now live as
  `.capture-*` classes on tokens.
- Banners (`.news-banner`): hairline separators, semantic info/warning/
  critical tints.

## Commandments

1. Never crop a product rendering; always `object-fit: contain`.
2. Never hardcode a color in TSX — use tokens, `currentColor`, or
   `color-mix()` against tokens. (No `stroke="#..."`, no `fill: "rgb(...)"`,
   no `style={{ background: "#..." }}`.)
3. Never add a per-icon rainbow color; the sidebar is monochrome + accent.
4. Never use `overflow: hidden` to "fix" artwork — pin the image box with
   absolute positioning instead.
5. Never add a blur/translucency without testing **both** finishes
   (`data-surface-finish="frosted"` and `"flat"`).
6. Never introduce a new UI concept (page, card, dialog) without reading this
   file and matching the Apple conventions above. Legacy themes must keep
   working — scope new chrome under `.control-shell` selectors that read
   tokens, never raw values.

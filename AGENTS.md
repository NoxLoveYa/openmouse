# AGENTS.md

Guidance for human contributors and AI agents working in this repository.

## Design

Read [`DESIGN.md`](./DESIGN.md) before touching any UI. The project follows
Apple Human Interface Guidelines (HIG): SF typography, grouped hairline
surfaces, frosted bars/sheets with a Flat fallback, monochrome icons,
sliding selection pills, and theme-token-only colors. Legacy accent themes
are preserved; all the specific conventions — stylesheet layering and the
specificity contract, sidebar layout, device cards, artwork handling,
finishes, tabs, controls, notes, and the Apple palette — are defined there.

Key rules that must never be broken:

- New styles go in `src/apple.css` scoped under
  `.control-shell.apple-redesign` and must strictly beat the specificity of
  what they replace (`apple.css` loads first, so ties lose; ID-scoped
  legacy needs IDs in the override).
- Use design tokens from `src/control.css`; never hardcode colors in TSX
  (data-driven hues via `color-mix()` inline excepted).
- Device artwork is always `object-fit: contain`, never cropped.
- Sidebar icons are monochrome (`currentColor`); no per-item rainbow colors.
- Every blur/translucency must work in both `data-surface-finish="frosted"`
  and `"flat"`.
- New user-facing strings go in `src/i18n.ts` plus all 10 locale files
  (`tsc` enforces completeness).
- Never invert or work around a styling bug with `overflow: hidden`; pin the
  element box instead (see `DESIGN.md` "Commandments").

## Commands

```bash
npm run dev                                  # start dev server
npm run build                                # tsc --noEmit && vite build
npm test                                     # node --test
npx tsc --noEmit                             # typecheck only
npm run check                                # full local check (dev readiness)
```

Run `npm run build` (or `npx tsc --noEmit`) after any change before finishing.

## Repo orientation

- `src/control.css` — design tokens plus legacy component styles (do not
  add new component styles here; see `DESIGN.md` "Stylesheet architecture").
- `src/apple.css` — the redesign authority; all new chrome lives here.
- `src/app/` — UI: `AppSidebar.tsx` (nav rail), `InterfaceSettings.tsx`
  (settings page), `OverviewPage.tsx` (connect + device list pages),
  `useSlidingPill.ts` (sliding selection hook).
- `src/device/` — controller, types (`ControlSnapshot`), and protocol glue.
- `src/i18n.ts` — all user-facing strings, organized by key.
- Actual wire protocol/drivers live in the external `@openmouse/protocol`
  library; do not expect to add HID driver code here.
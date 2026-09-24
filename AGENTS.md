# AGENTS.md

Guidance for human contributors and AI agents working in this repository.

## Design

Read [`DESIGN.md`](./DESIGN.md) before touching any UI. The project follows
Apple Human Interface Guidelines (HIG): SF typography, grouped hairline
surfaces, frosted bars/sheets with a Flat fallback, monochrome icons, and
theme-token-only colors. Legacy accent themes are preserved; all the specific
conventions — sidebar layout, device cards, artwork handling, finishes, and
the Apple palette — are defined there.

Key rules that must never be broken:

- Use design tokens from `src/control.css`; never hardcode colors in TSX.
- Device artwork is always `object-fit: contain`, never cropped.
- Sidebar icons are monochrome (`currentColor`); no per-item rainbow colors.
- Every blur/translucency must work in both `data-surface-finish="frosted"`
  and `"flat"`.
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

- `src/control.css` — all theme tokens and UI styles (single stylesheet).
- `src/app/` — UI: `AppSidebar.tsx` (nav rail), `InterfaceSettings.tsx`
  (settings page), `OverviewPage.tsx` (connect + device list pages).
- `src/device/` — controller, types (`ControlSnapshot`), and protocol glue.
- `src/i18n.ts` — all user-facing strings, organized by key.
- Actual wire protocol/drivers live in the external `@openmouse/protocol`
  library; do not expect to add HID driver code here.
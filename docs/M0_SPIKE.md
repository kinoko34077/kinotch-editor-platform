# M0 isolated integration spike — evidence and boundaries (2026-10-17)

## Current M0 prototype evidence — 2026-10-18

- **[Exact-head Chrome CI #39087042755](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/39087042755) SUCCESS.** Reproducible `npm ci` from committed lock v3, 10 Node contracts, metadata checks for all 83 locked dependencies, Vite build and Chrome actual pointer/keyboard smoke.
- **Direct blank-canvas marquee now PASS in Chrome.** GrapesJS renders its blank editor wrapper (e.g. `DIV.gjs-hovered`) above the iframe body; pointer target is not necessarily `body`. A thin, opt-in blank-pointer overlay forwards rectangle corners to Selecto's **public** `setSelectedTargetsByPoints` API. This delegates element hit tests and selection bookkeeping to upstream Selecto, not duplicate geometry code. Shift marquee extends the previous selection; layer-list Shift/Ctrl selection remains a keyboard-accessible alternative.
- Mouse single drag/SE resize, group drag/SE resize on unequal elements, atomic Undo/Redo, physical CSS/model parity, committed Ctrl+Z, Escape mid-drag with restored Moveable handles, recoverable next gesture, and dnd-kit reorder synced to GrapesJS/document/sidebar are browser-tested. Imported HTML and host persistence remain disabled. User-entered label-like HTML is rendered as literal text, not parsed markup.
- **M0 overall gate remains OPEN.** Physical iPhone Safari/touch ergonomics, 3000-element performance and zoom, keyboard-only geometry/reorder, nested/in-flow layout, versioned host save/import and allowed property/permission boundaries, final redistribution license texts/notice and formal exact-head peer review are not accepted. CI success does not authorize production use.
- `docs/M0_LICENSE_INVENTORY.md` records 83 locked dependency package license metadata, with 12 MPL-2.0 optional/build-time `lightningcss` packages. This is **not** a complete legal or security audit. Repository publishing license has not been chosen.
- Historical negative tests in [Issue #2](https://github.com/kinoko34077/kinotch-editor-platform/issues/2#issuecomment-6236117862) and #6244158088 record earlier Selecto native iframe/adapter failures; those reports remain factual for the versions tested, superseded by current working public-API composite adapter.

Owner: Issue #2; plan Issue #9. This is a **candidate runnable harness**, NOT accepted M0 integration or a production editor. It must not be imported in a consumer application.

## Upstream source inventory
| role | source / package | pinned npm version | upstream license | provenance |
| --- | --- | --- | --- | --- |
| Editor model, canvas and components | GrapesJS / `grapesjs` | 0.23.6 | BSD-3-Clause | https://www.npmjs.com/package/grapesjs |
| Resize/drag/snapping | daybrush/moveable / `moveable` | 0.53.0 | MIT | https://www.npmjs.com/package/moveable |
| Area selection | daybrush/selecto / `selecto` | 1.26.3 | MIT | https://www.npmjs.com/package/selecto |
| Layer DnD, non-React vanilla | clauderic/dnd-kit / `@dnd-kit/dom` | 0.5.0 | MIT | https://www.npmjs.com/package/@dnd-kit/dom |
| Sandbox local builder | `vite` | 8.3.4 | MIT | https://www.npmjs.com/package/vite |

**Version warning:** repository main package descriptors are not necessarily npm-published releases. GrapesJS monorepo `packages/core/package.json` reads 0.23.8 while npm reports stable 0.23.6; dnd-kit repository `packages/dom/package.json` reads 0.5.1 while npm stable reports 0.5.0. Pin published versions and recheck on actual install; do not paste latest source code into an older package without compatibility verification.

## Boundaries and conflict avoidance
- GrapesJS controls component tree/style; specimen components are `draggable:false`/`resizable:false` in GrapesJS and the Moveable instance owns direct target transform/resize. React/Canvas generic editing is unsupported.
- Selecto owns selectable hit tests and selection bookkeeping. The GrapesJS blank-wrapper pointer adapter captures rectangle corners and calls `setSelectedTargetsByPoints`. Direct canvas marquee and the sidebar additive-selection route pass in Chrome. Native Gesto iframe dragging without this adapter remains a historical negative probe. dnd-kit is **only** attached to the OUTER layer list and does not compete on canvas. Layer order now synchronizes to the canonical model and GrapesJS Component.move via documented API (does not imply in-flow re-layout; these prototypes are absolutely positioned).
- `GestureGate` allows only one active operation, and `createLayoutModel` provides one bounded geometry commit/undo/redo with stable IDs, revision checks and finite bounds. DOM preview is temporary; model commit occurs once. This pure model is a M0 demonstrator and not a verified production GrapesJS↔host adapter.
- `editor.Canvas.getBody()` supplies iframe target context; no top-level document selection of iframe internals. Browser zoom, cross-frame pointer capture, relative/absolute offsets and group transforms remain specifically unverified.
- No remote HTML import, no server persistence, no eval, no consumer secrets, no arbitrary page DOM selectors. GrapesJS storage is disabled. Export JSON is a read-only diagnostic; import is deliberately disabled.

## Repro / evidence
1. `npm ci` then `npm run dev`; open the local address. `npm test` runs dependency-free state/gesture contract tests and `npm run check:licenses` checks the locked license metadata.
2. Select an element, resize and drag it. Use Undo/Redo; export model JSON and ensure canonical geometry changes once.
3. Drag the dedicated ↕ layer handle in the right sidebar; model order and GrapesJS component order now follow the same transition and undo. This is a **document ordering** experiment; flex/grid in-flow layout remains future work.
4. Check [Chrome CI #39087042755](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/39087042755) for locked npm ci, build and pointer/marquee/keyboard evidence. Physical iPhone Safari and full distribution notices/security approval remain unverified.
5. If broken or misleading, prefer routing supported upstream APIs or swapping gesture source rather than silently recreating entire editors; record factual failure in Issue #2.

## Proposed objective acceptance tests (M0 gate remains open)
- Pointer resize/drag inside iframe makes exactly one canonical commit with correct CSS/geometry; no GrapesJS and Moveable double application. Undo/redo reload matches displayed state.
- Direct Selecto public-API area selection and Shift-additive marquee → Moveable group drag/resize → one canonical group commit and Undo: actual Chrome PASS. Physical touch device remains unverified.
- Sidebar drag -> model-order / GrapesJS component reorder + Undo: real Chrome pointer PASS; in-flow layout and general nesting not covered.
- Mouse, touch and keyboard alternative; physical iPhone Safari test: NOT PASSED.
- Security and full transitive license audit by Issue #7: NOT PASSED.
- UX baselines under Issue #6: scenarios specified, physical measurements NOT PASSED.

## Source references
- https://grapesjs.com/docs/api/editor.html
- https://grapesjs.com/docs/api/canvas.html
- https://dndkit.com/concepts/drag-drop-manager/
- https://daybrush.com/moveable/release/latest/doc/Moveable.html
- https://github.com/daybrush/selecto
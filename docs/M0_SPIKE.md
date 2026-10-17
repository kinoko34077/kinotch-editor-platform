# M0 isolated integration spike — evidence and boundaries (2026-10-17)

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
- Selecto is scoped to the GrapesJS iframe body. dnd-kit is **only** attached to the OUTER layer list and not installed as a second competing pointer listener on canvas elements. DnD layer UI is currently visual-only, *not* applied to component model: this is intentionally M2 work.
- `GestureGate` allows only one active operation, and `createLayoutModel` provides one bounded geometry commit/undo/redo with stable IDs, revision checks and finite bounds. DOM preview is temporary; model commit occurs once. This pure model is a M0 demonstrator and not a verified production GrapesJS↔host adapter.
- `editor.Canvas.getBody()` supplies iframe target context; no top-level document selection of iframe internals. Browser zoom, cross-frame pointer capture, relative/absolute offsets and group transforms remain specifically unverified.
- No remote HTML import, no server persistence, no eval, no consumer secrets, no arbitrary page DOM selectors. GrapesJS storage is disabled. Export JSON is a read-only diagnostic; import is deliberately disabled.

## Repro / evidence
1. `npm install` then `npm run dev`; open the local address. `npm test` runs dependency-free state/gesture contract tests.
2. Select an element, resize and drag it. Use Undo/Redo; export model JSON and ensure canonical geometry changes once.
3. Drag a layer in the right sidebar; note that UI-only reorder does **not** update GrapesJS document, a known/intentional incomplete boundary.
4. Inspect errors/event duplicate triggers and actual iframe overlay positioning with Chromium and iPhone Safari. At this commit, **real npm dependency installation, Vite build, Chromium runtime, physical Safari and dependency tree/SBOM were NOT executed/verified** (source environment network cannot resolve npm registry). Treat runtime status as `UNVERIFIED` until independent environment runs it.
5. If broken or misleading, prefer routing supported upstream APIs or swapping gesture source rather than silently recreating entire editors; record factual failure in Issue #2.

## Proposed objective acceptance tests (M0 gate remains open)
- Pointer resize/drag inside iframe makes exactly one canonical commit with correct CSS/geometry; no GrapesJS and Moveable double application. Undo/redo reload matches displayed state.
- Selecto selection and Moveable selection sync, including multi-select. Current proof handles arrays but group commit is not yet implemented.
- Sidebar drag -> valid GrapesJS component reorder and Undo. Currently UI-only, NOT PASSED.
- Mouse, touch and keyboard alternative; physical iPhone Safari test: NOT PASSED.
- Security and full transitive license audit by Issue #7: NOT PASSED.
- UX baselines under Issue #6: scenarios specified, physical measurements NOT PASSED.

## Source references
- https://grapesjs.com/docs/api/editor.html
- https://grapesjs.com/docs/api/canvas.html
- https://dndkit.com/concepts/drag-drop-manager/
- https://daybrush.com/moveable/release/latest/doc/Moveable.html
- https://github.com/daybrush/selecto
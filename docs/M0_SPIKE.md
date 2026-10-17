# M0 isolated integration spike — evidence and boundaries (2026-10-17)

## Latest independently observed integration proof (supersedes original creation-time warnings)

- 2026-10-17, isolated Chrome pointer/DOM test [Actions run #39035665212](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/39035665212) **SUCCESS** at head `40a9a55d935790a967f0711c7600afede332c649`: 7 Node tests, npm install, Vite build, actual pointer drag/SE resize, atomic 2-target Moveable group drag with Selecto-API-backed accessible layer Shift-click selection, group Undo; real dnd-kit handle drop → canonical order → GrapesJS component DOM order → Undo. The dnd-kit transient drag clone settles before comparison.
- **Selection note:** iframe blank-area Selecto marquee is **NOT working** in tested Chrome and remains M0 open; upstream Selecto iframe example used `dragContainer: frameWindow`, but the tested physical marquee still produced no selection. Working alternate is accessible sidebar selector with Shift/Ctrl/Meta multi-select, using documented `selecto.setSelectedTargets`.
- **Group conflict fixed:** Selecto events must not replace Moveable group targets while a `GestureGate` transaction is active. Restore selections at end to prevent group drag cancellation. Group **resize**, nested dynamic document trees, repeated stress, handoff to host state, physical iPhone and full import/permission guard remain unproven.
- **Important:** M0 Gate is still OPEN, Draft PR #10 unmerged, no consumer integration, no Pages/npm publish, no formal independent review outcome. Latest build is ~1.47 MB minified / ~408 KB gzip: this is a prototype size warning, not a performance acceptance.
- Historical notes in the original M0 probe below described the initial commit, where browser runtime and dnd-kit document synchronization were not implemented. For current status, this section overrides those initial observations.

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
- Selecto uses the GrapesJS iframe body and its window for pointer/keyboard events (upstream iframe recipe). The **confirmed** multiple-selection route is the accessible layer controls; canvas marquee remains a tracked bug. dnd-kit is **only** attached to the OUTER layer list and does not compete on canvas. Layer order now synchronizes to the canonical model and GrapesJS Component.move via documented API (does not imply in-flow re-layout; these prototypes are absolutely positioned).
- `GestureGate` allows only one active operation, and `createLayoutModel` provides one bounded geometry commit/undo/redo with stable IDs, revision checks and finite bounds. DOM preview is temporary; model commit occurs once. This pure model is a M0 demonstrator and not a verified production GrapesJS↔host adapter.
- `editor.Canvas.getBody()` supplies iframe target context; no top-level document selection of iframe internals. Browser zoom, cross-frame pointer capture, relative/absolute offsets and group transforms remain specifically unverified.
- No remote HTML import, no server persistence, no eval, no consumer secrets, no arbitrary page DOM selectors. GrapesJS storage is disabled. Export JSON is a read-only diagnostic; import is deliberately disabled.

## Repro / evidence
1. `npm install` then `npm run dev`; open the local address. `npm test` runs dependency-free state/gesture contract tests.
2. Select an element, resize and drag it. Use Undo/Redo; export model JSON and ensure canonical geometry changes once.
3. Drag the dedicated ↕ layer handle in the right sidebar; model order and GrapesJS component order now follow the same transition and undo. This is a **document ordering** experiment; flex/grid in-flow layout remains future work.
4. Check [actual Chrome test run #39035665212](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/39035665212) for npm install, build and mouse gesture evidence. **Physical iPhone Safari and installed full transitive license/SBOM were not verified**. Keep runtime evidence scoped to the tested commit.
5. If broken or misleading, prefer routing supported upstream APIs or swapping gesture source rather than silently recreating entire editors; record factual failure in Issue #2.

## Proposed objective acceptance tests (M0 gate remains open)
- Pointer resize/drag inside iframe makes exactly one canonical commit with correct CSS/geometry; no GrapesJS and Moveable double application. Undo/redo reload matches displayed state.
- Selecto public-API selection through layer Shift-click → Moveable multi-target drag → one canonical group commit and Undo: browser PASS. Canvas marquee / group resize remains unresolved.
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
# KiNoTch. Editor Platform

A public, reusable, user-first visual UI editing platform for KiNoTch. applications.

## Adopted composition (2026-10-17)
- GrapesJS: component tree, styles, traits, visual editing, history and project model.
- Daybrush Moveable + Selecto: precise drag/resize/snap, selection and group transforms.
- dnd-kit: in-flow reordering, container-aware moves and accessible drag alternatives.
- Shared, typed setting resolution and numeric parameter/binding layer: precise state, valid units, inheritance, per-child override and snapping. Existing frequency-warp behavior is a requirements source, not auto-imported code.

**Priority:** observed user usability and functional coverage > feature composability/extension > delivery quality > old VE compatibility. Prefer existing maintained libraries over reimplementing available functionality. Build missing behavior by composition; write only integration contracts, adapters and genuine uncovered features.

## Canon
- Master cross-repo policy and request: https://github.com/kinoko34077/devflow/issues/702
- Existing Visual Editor accepted M1–M5: https://github.com/kinoko34077/devflow/issues/560
- Numeric parameter/unit owner: https://github.com/kinoko34077/frequency-warp-vst/issues/79 and docs/PARAMETER_BINDING_SPEC.md
- This repository's docs/SPECIFICATION.md and owner Issues become the technical spec after bootstrap; existing consumers remain independent until explicitly approved migration.

## Status (2026-11-23)

**Isolated research checkpoints are merged into `main`; the platform is not production-ready.** The adopted library composition is unchanged.

- M0 bounded GrapesJS / Moveable / Selecto / dnd-kit interaction spike and existing model behavior are retained. [Research PR #14](https://github.com/kinoko34077/kinotch-editor-platform/pull/14) provides a bounded typed tree/inheritance data model; [PR #16](https://github.com/kinoko34077/kinotch-editor-platform/pull/16) covers simulated Chrome touch only.
- [PR #15](https://github.com/kinoko34077/kinotch-editor-platform/pull/15) added an isolated tree/provenance workbench; [PR #17](https://github.com/kinoko34077/kinotch-editor-platform/pull/17) added a 3,000-element GrapesJS DOM performance fixture; [PR #18](https://github.com/kinoko34077/kinotch-editor-platform/pull/18) added a separate nested GrapesJS projection/serialization/rollback fixture. All three are merged, but each is a bounded research surface, not evidence of a finished end-user editor.
- PR #18 was reconciled with the already merged performance workflow without removing either smoke: [exact-head CI #45097249880](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/45097249880) passed Node contracts, build, Chrome, simulated mobile, 3,000-DOM and nested projection steps. This PR-head evidence does not establish physical iPhone usability, production service integration or post-merge live deployment.
- **Outstanding product gates:** after-update literal text rendering/export/reload and post-reload projection re-binding/continued editing ([owner #4](https://github.com/kinoko34077/kinotch-editor-platform/issues/4)); real mobile Safari and 3,000-node product usability ([#6](https://github.com/kinoko34077/kinotch-editor-platform/issues/6)); legal/distribution and safe host recovery ([#7](https://github.com/kinoko34077/kinotch-editor-platform/issues/7)); SDK/consumer migration ([#8](https://github.com/kinoko34077/kinotch-editor-platform/issues/8)). The [master roadmap #9](https://github.com/kinoko34077/kinotch-editor-platform/issues/9) is the current detailed state.

**No consumer deployment/migration, Pages/npm publication, new permissions or credentials are admitted by these merges.** Repository license and publication approval remain independent of CI.

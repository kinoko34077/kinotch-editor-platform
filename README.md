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

## Status
BOOTSTRAP/SPECIFICATION only. Adoption of architecture A is user-approved; its interoperability, touch usability, library versions and license compatibility must be verified by a real proof of concept before declaring it implemented. No consumer deployment, migration or public editor execution authorized by repository creation. This repository is public; do not migrate secret/private files or user content. License to be decided after dependency/license audit.

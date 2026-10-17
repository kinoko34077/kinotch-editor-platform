# KiNoTch. Editor Platform — initial specification (2026-10-17)

## S0. Authority, state and priorities
Decision: **Composition A**: GrapesJS + Daybrush Moveable/Selecto + dnd-kit, with semantic inheritance/typed-parameter system composed from mature existing modules wherever possible.
- Highest priority: ease of actual use, predictable and direct editing, powerful functions with few steps, low visual/gesture overhead. Next: functional completeness and module composability. Lowest priority: compatibility with old Visual Editor.
- Use pre-existing maintained libraries before writing equivalents; avoid rewriting upstream features. Proven deficiencies should be closed by adding compatible third-party pieces rather than constraining UX to existing VE.
- This document defines targets, not evidence they already work together. Integrate only through validated capability and event contracts; pin tested dependency versions. Avoid lock-in to a single library's internal DOM IDs.
- Old @kinotch/visual-editor-platform@0.5.1 is an accepted historical comparison/possible transition source; no presumption that its code should determine the new model.
- Existing devflow #560 and consumer applications stay authoritative for their accepted releases. #702 is the cross-repository creation/policy origin.

## S1. User-visible editing
- Opt-in edit mode; normal app usage must not acquire selection handles, overlays, latency or accidental moves.
- Direct selection, visible but low-profile affordance on hover/focus/selection; edit target discoverable without inflating content UI.
- Drag edges/corners to set width/height with realistic CSS box sizing, min/max, aspect constraints, responsive layouts; numeric direct input and undo. Changes must affect actual app layouts, not merely a transient rendered frame.
- Drag free-positioned elements with guides/snap, alignment/distribution where useful; move flex/grid/list elements by *in-flow reordering*, not fake absolute coordinates. Both modes, clear visual drop insertion, no surprise position jump.
- Multi-select marquee (Selecto), Ctrl/Shift additive, group move/resize (Moveable), alignment and safe group/ungroup; stable selection/focus across edits.
- Inline edit **component type label**, **user-facing layer/display name**, and **rendered text** separately; stable immutable internal IDs independent of rename. In-place rename keyboard support and cancel/undo.
- Layer navigator supports reveal, select, collapse, drag across valid parents, nest/unnest, reorder, duplicate/delete with reversible operations. Do not show expanded controls for every ordinary item by default.
- Single predictable editing gesture arbiter: selection/resize/free drag/reorder/text typing/pan/scroll are mutually gated. Nested target priority, drag threshold and pointer capture explicit; no competing library listeners causing double movement.
- Properties, visual style, raw values and computed values have clear provenance. Editing must use committed model state rather than unrestricted direct DOM mutation.

## S2. Nested inheritance contract
- Tree with stable element IDs and typed descriptors; editing eligibility and schema-defined capabilities per node and property.
- Effective property resolution precedence: explicit local override > nearest applicable ancestor > component/type default > editor/global default. Scope and exceptions explicitly specified per field.
- Parent updates propagate live only to eligible descendants without overrides; child overrides survive; 'reset to inherited' removes only local override; show source and effective value in UI. Avoid copying parent values indiscriminately.
- CSS inherited styles/custom properties should use native CSS when semantically appropriate. Semantic/interaction/numeric rules require separate typed resolver.
- Template/symbol reuse is distinct from parent-child property inheritance. Detect cycles and references; support nested constraints, type compatibility, invalid container rejection, atomic updates and stable serialization.
- Editing the displayed name must never silently change stable IDs or break binding.

## S3. Numeric/parameter/binding contracts
- Typed parameter descriptors: stable ID, dimension, canonical unit/range/default/precision, allowed views, dependencies, slider transfer curve, snapping modes, gestures, validation, links.
- **Canonical full-precision value is authoritative**; display rounded formatting and unit changes never silently alter processing/DSP state. View unit, semantic representation and actual slider-rail percentage are different layers.
- Compatible conversions only (Hz, note + cents for positive frequencies; ratios, relative cents for dimensionless ratios; fractions/%, signed physical dimensions, integer counts, non-linear coordinates as their own types). No false arbitrary global conversion.
- Zero/invalid/nonrepresentable values retain the chosen view but show unavailability clearly; inputs preserve permissible extreme precision such as 0.001Hz, without blocking application startup merely for non-audible range.
- Touch/mouse direct editing, fine/coarse keyboard and modifier gesture, snap on/off at point of need, bidirectional UI/model sync, transactional linked dependencies without feedback loops, stable labels without layout shift.
- Host application supplies domain-specific rules; library enforces type and lifecycle, no assumed audio/game/chat semantics. See frequency-warp-vst #79 canonical spec.

## S4. Composition and adapters
- GrapesJS as initial component/style/project/layer editor. Use supported public APIs; iframe/canvas and model ownership boundaries must be surveyed.
- Moveable+Selecto as manipulation/selection provider; dnd-kit as reorder/nest provider. Only one active gesture route per event. Versioned adapter interfaces so replaceable engines do not leak into consumer APIs.
- dnd-kit current/vanilla vs React adapter selected on documented support and real operation, not outdated package naming. GrapesJS already provides some drag/resize; avoid double-binding the same gesture. Explicitly disable/route overlapping controls.
- Host-adapter APIs: target/schema registry, render selector, state read/write with revision checks, allowed edit capabilities, serialize/load, rollback, typed parameter codec and callbacks.
- React, vanilla DOM, Canvas and native VST3 are not automatically supported just by providing a web editor. Record support tier honestly; no unrestricted modification of app-owned React/Canvas DOM or host automation.

## S5. Usability, safety and quality
- Test actual pointer and touch interaction incl physical iPhone Safari. Gesture resolution for scroll/longpress/pinch/selection, keyboard accessible reorder/resize and screenreader focus/labels.
- Stable editing panes: avoid jumping reflow from volatile status/precision updates, big permanent settings UI, duplicate affordances, involuntary focus loss. Prefer contextual/overlay UI with explicit dismissal.
- Transactional undo/redo per user action; cancel/revert, export/import without data loss, malformed state recovery, duplicate/missing IDs, versioned save with conflict handling.
- Prevent arbitrary HTML/script/style injections and external URL fetches through editor input; sanitize imports, isolate capabilities, make editing opt-in, never expose secret inputs/credentials/privileged workflow controls.
- Performance: browser tests on real existing sites plus 3,000-node fixture, stress nested trees, zoom/resize/drag, memory/leak and idle overhead. Avoid background polling and unneeded rerenders.
- Validate layout at mobile/tablet/desktop and zoom; no forced horizontal scroll, invisible handles, inaccessible input. Distinguish machine tests and actual iPhone observations.
- Public source and license policy: no secret/private/source copy; audit GrapesJS, Moveable/Selecto, dnd-kit and their dependencies/licenses/attributions before bundling or release. Do not guess a license.

## S6. Verification and delivery
M0: Inventory current dependencies/licensing, compare actual usable demo tasks (renaming, resize, move, nest, override, mobile), choose package versions and document interaction arbiter; failing POC is a hard input to re-plan, not license to downgrade UX.
M1: Small executable composite proof of concept: select/resize/free drag + precise model roundtrip/undo with no double gesture.
M2: Layers, in-flow DnD and nested inheritance with local override/resets and rename/IDs.
M3: Typed units, precision, snap/bindings and host schema adapters with negative edge tests.
M4: Usability/performance/a11y/device/safety/license acceptance, versioned public library release and consumer-by-consumer staged rollout (each consuming repo authorizes its own migration; never bulk switch).
Each milestone: executable tests and factual demonstration on the tested version; no acceptance claims from docs alone. Independent review/release gates where applicable.

## Non-goals at bootstrap
No direct consumer code changes, no deployment, no secrets/session/permission changes, no auto-destroy or history rewrite, no arbitrary production DOM edits. Public repository creation and initial docs/Issues only.

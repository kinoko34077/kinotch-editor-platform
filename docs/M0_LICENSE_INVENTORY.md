# M0 locked dependency license inventory (2026-10-18)

**Scope:** exact package-lock.json packages of isolated M0 research spike only; source of license declaration is the npm lockfile metadata, **not** a legal audit of upstream notice/license texts or final bundles.

- CI runner: Ubuntu GitHub Actions Node 22, `npm ci --no-audit --no-fund` succeeded on [run #39086617458](https://github.com/kinoko34077/kinotch-editor-platform/actions/runs/39086617458).
- Lockfile: v3, 83 transitive package entries, including platform-specific optional entries.
- License metadata distribution: 0BSD: 1; Apache-2.0: 2; BSD-3-Clause: 2; ISC: 1; MIT: 65; MPL-2.0: 12.
- Undeclared SPDX/license fields in lock: 0.
- `lightningcss` and platform optional bindings carry MPL-2.0 and are marked development dependencies. Confirm built artifact linkage/notice obligations before any distribution.
- **Not accepted by this inventory alone:** license text/attribution compliance; software bill-of-materials with integrity/ownership provenance; vulnerability risk; npm registry compromise; CSP/iframe security; imported HTML; physical iPhone test; permission design; consumer release.
- Repository license is intentionally undecided; no distribution/publication approval implied.

| Package (locked) | Version | License metadata | Scope | Optional |
|---|---|---|---|---|
| `@cfcs/core` | `0.0.6` | MIT | runtime | no |
| `@daybrush/utils` | `1.13.0` | MIT | runtime | no |
| `@dnd-kit/abstract` | `0.5.1` | MIT | runtime | no |
| `@dnd-kit/collision` | `0.5.1` | MIT | runtime | no |
| `@dnd-kit/dom` | `0.5.0` | MIT | runtime | no |
| `@dnd-kit/geometry` | `0.5.1` | MIT | runtime | no |
| `@dnd-kit/state` | `0.5.1` | MIT | runtime | no |
| `@egjs/agent` | `2.4.4` | MIT | runtime | no |
| `@egjs/children-differ` | `1.0.1` | MIT | runtime | no |
| `@egjs/component` | `3.0.5` | MIT | runtime | no |
| `@egjs/list-differ` | `1.0.1` | MIT | runtime | no |
| `@oxc-project/types` | `0.154.0` | MIT | dev | no |
| `@preact/signals-core` | `1.14.4` | MIT | runtime | no |
| `@rolldown/binding-android-arm-eabi` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-android-arm64` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-darwin-arm64` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-darwin-x64` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-freebsd-x64` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-arm-gnueabihf` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-arm64-gnu` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-arm64-musl` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-ppc64-gnu` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-s390x-gnu` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-x64-gnu` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-linux-x64-musl` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-openharmony-arm64` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-win32-arm64-msvc` | `1.2.14` | MIT | dev | yes |
| `@rolldown/binding-win32-x64-msvc` | `1.2.14` | MIT | dev | yes |
| `@rolldown/pluginutils` | `1.0.1` | MIT | dev | no |
| `@scena/dragscroll` | `1.4.0` | MIT | runtime | no |
| `@scena/event-emitter` | `1.0.5` | MIT | runtime | no |
| `@scena/matrix` | `1.1.1` | MIT | runtime | no |
| `@types/backbone` | `1.4.15` | MIT | runtime | no |
| `@types/jquery` | `4.0.1` | MIT | runtime | no |
| `@types/underscore` | `1.13.0` | MIT | runtime | no |
| `backbone` | `1.4.1` | MIT | runtime | no |
| `backbone-undo` | `0.2.6` | MIT | runtime | no |
| `codemirror` | `5.63.0` | MIT | runtime | no |
| `codemirror-formatting` | `1.0.0` | MIT | runtime | no |
| `croact` | `1.0.4` | MIT | runtime | no |
| `croact-css-styled` | `1.1.9` | MIT | runtime | no |
| `croact-moveable` | `0.9.0` | MIT | runtime | no |
| `css-styled` | `1.0.8` | MIT | runtime | no |
| `css-to-mat` | `1.1.1` | MIT | runtime | no |
| `detect-libc` | `2.1.2` | Apache-2.0 | dev | no |
| `fdir` | `6.5.0` | MIT | dev | no |
| `framework-utils` | `1.1.0` | MIT | runtime | no |
| `fsevents` | `2.3.3` | MIT | dev | yes |
| `gesto` | `1.19.4` | MIT | runtime | no |
| `grapesjs` | `0.23.6` | BSD-3-Clause | runtime | no |
| `html-entities` | `1.4.0` | MIT | runtime | no |
| `keycode` | `2.2.1` | MIT | runtime | no |
| `keycon` | `1.4.0` | MIT | runtime | no |
| `lightningcss` | `1.33.0` | MPL-2.0 | dev | no |
| `lightningcss-android-arm64` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-darwin-arm64` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-darwin-x64` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-freebsd-x64` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-linux-arm-gnueabihf` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-linux-arm64-gnu` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-linux-arm64-musl` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-linux-x64-gnu` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-linux-x64-musl` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-win32-arm64-msvc` | `1.33.0` | MPL-2.0 | dev | yes |
| `lightningcss-win32-x64-msvc` | `1.33.0` | MPL-2.0 | dev | yes |
| `moveable` | `0.53.0` | MIT | runtime | no |
| `nanoid` | `3.3.20` | MIT | dev | no |
| `overlap-area` | `1.1.0` | MIT | runtime | no |
| `picocolors` | `1.1.1` | ISC | dev | no |
| `picomatch` | `4.0.7` | MIT | dev | no |
| `playwright-core` | `1.64.1` | Apache-2.0 | dev | no |
| `postcss` | `8.5.30` | MIT | dev | no |
| `promise-polyfill` | `8.3.0` | MIT | runtime | no |
| `react-css-styled` | `1.1.9` | MIT | runtime | no |
| `react-moveable` | `0.56.0` | MIT | runtime | no |
| `react-selecto` | `1.26.3` | MIT | runtime | no |
| `rolldown` | `1.2.14` | MIT | dev | no |
| `selecto` | `1.26.3` | MIT | runtime | no |
| `source-map-js` | `1.2.2` | BSD-3-Clause | dev | no |
| `tinyglobby` | `0.2.17` | MIT | dev | no |
| `tslib` | `2.8.1` | 0BSD | runtime | no |
| `underscore` | `1.13.8` | MIT | runtime | no |
| `vite` | `8.3.4` | MIT | dev | no |

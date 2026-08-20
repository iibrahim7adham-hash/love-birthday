# memora.digit — Project Knowledge Base

> Distilled for NotebookLM: architecture, conventions, and rationale — not source code.
> The `src/` tree is always the ground truth for exact current implementation; this
> document exists to answer "why"/"how does this fit together" without re-reading it.

## 1. Project Overview

memora.digit (name placeholder, may change) is an Instagram/TikTok page selling
interactive, single-page "event websites" for occasions like birthdays and
anniversaries, delivered to the customer as a link (or a QR code on request that
resolves to the same link). The idea grew out of a birthday site the developer built
for personal use — heart-to-cake morph, music, animation, a love message, a rose
that appears as a gift, interactive buttons — which became the template for the
business.

Target market: ages 16–24, looking for a distinctive, non-generic gift. This product
category doesn't currently exist in the local (Iraqi) market — the closest analogues
are wedding/engagement invitation sites, not birthday/love-themed ones.

Business model: a small library of ready-made templates is shown via Reels on the
social page. Each template is customizable per order (name, photos, message text,
colors). A customer who wants a fully custom design instead gets a separate,
higher-priced project. There is no marketing/landing site yet — social media is the
only storefront.

Two technical requirements shape everything in `src/`:
- **Responsive by necessity**: most traffic arrives from Instagram/TikTok on
  mobile, so mobile performance/layout is the primary target, not desktop.
- **Reusable-engine architecture**: each template is meant to be a single "engine"
  that reads per-customer data (name, photos, message, colors) from a central place,
  rather than hand-editing template code per order.

Execution plan: finish one template completely before starting the next, aiming for
4–5 finished templates before opening the page and starting to take orders.

## 2. Repository Architecture

```
src/
  engine/     — shared runtime, used by every template
  templates/
    birthday/
      boom/       — Part 1–5 (see below), most actively developed template
      love/       — envelope/letter opening + photo stickers
      luxury/     — black-hole transition + environment scene
      standard/   — start screen -> cake -> reveal flow
```

**`src/engine/`** — the shared application shell every template runs inside:
`core/Experience.js` is the singleton bootstrapper (creates `Scene`, `Camera`,
`Lights`, `World`, `Audio`, `Renderer`, and the active template), `core/Sizes.js`
tracks viewport size with resize debouncing, `camera/Camera.js` is the shared
responsive camera (see §3), `lights/Lights.js` provides one fixed
ambient+directional+rim+warm-point light rig used scene-wide, `renderer/`,
`audio/`, `scene/` wrap their respective Three.js/Web Audio concerns. Which
template runs is chosen at build/dev time via `VITE_TEMPLATE`
(`--mode boom|love|luxury|standard`, see `package.json` and `.env.<template>`),
resolved once in `Experience.js`'s own `TEMPLATES` map.

**`src/templates/birthday/{boom,love,luxury,standard}/`** — four **independent**
implementations of the same "birthday reveal" concept, each its own top-level
`<Name>Scene.js` registered in `Experience.js`. They do not import from each other.

- **boom/** — a bomb-character intro that "explodes" into a heart-particle burst,
  a text reveal, and (current, Part 5) a 3D gift box that opens on click. Organized
  as numbered "Parts" (1: bomb intro, 2: heart burst, 3: text reveal, 5: gift box —
  each in its own subdirectory with its own Constants file and orchestrator class).
  This is the template most of this document's decision/pitfall history comes from.
- **love/** — an envelope-opening + letter + photo-sticker-orbit flow.
- **luxury/** — a black-hole visual transition (refactored into
  single-responsibility modules during the project's earliest recorded
  commits, 2026-08-07, see §4) into an environment scene.
- **standard/** — start screen → cake formation/candle-blowout → birthday
  message reveal, with balloons/fireworks/floating-text embellishments.

**Actually shared** (safe to assume present regardless of template): `engine/`
in full, the `Constants.js`-per-feature convention, the GSAP-timeline animation
style, the `.dispose()` lifecycle discipline, canvas-texture generation for
procedural sprites, and DOM+CSS overlays for on-screen text/UI (see §3).

**Not shared**: everything under an individual template's own directory. A task
scoped to one template should only read/touch that template's own files (plus
`engine/` if the task genuinely requires it) — **do not open the other three
templates unless a task explicitly asks to compare or port behavior between them.**

## 3. Engineering Conventions

Only conventions with actual evidence in the codebase — nothing invented.

- **`buildX()` / `disposeX()` geometry pattern.** A pure construction function
  (no animation/timeline logic) returns a plain object of named mesh/group
  references; a matching `disposeX()` frees every geometry/material by name.
  Confirmed in `boom/bomb/BombGeometry.js`, `boom/giftbox/GiftBoxGeometry.js`,
  `standard/cake/CakeGeometry.js`. The orchestrator class (e.g. `BombIntro.js`,
  `GiftBox.js`) owns animation; the geometry file never does.
- **One `Constants.js` per feature, not a nested config tree.** Every template
  (and `engine/audio/`) uses flat, feature-scoped constants files
  (`BombConstants.js`, `GatherConstants.js`, `StandardBalloonsConstants.js`,
  `EnvelopeConstants.js`, ...) rather than a shared `config/` directory. This is
  explicit and intentional — `standard/Constants.js`'s own comment states it
  follows "the same convention `love/Constants.js` uses" on purpose, reserving a
  heavier config structure for if/when per-customer field data genuinely needs it.
- **GSAP timelines for orchestration.** Used project-wide (every template, plus
  `engine/core/Transition.js`) as the standard way to sequence animation steps —
  not raw `requestAnimationFrame` chains for anything with discrete stages.
  Continuous per-frame procedural motion (e.g. dozens of independently-drifting
  particles) is the one exception, handled with plain elapsed-time math in a
  manual `update(delta)` loop instead — cheaper than one GSAP tween per particle.
- **Material choice is deliberate per object, not a blanket rule.** Flat
  `MeshBasicMaterial` (no scene-light dependency) is the default for
  cartoon/flat-styled characters and particles. `MeshStandardMaterial` (lit by
  the shared engine lights, see below) is used specifically where an object is
  meant to read as a real lit 3D volume — confirmed in `boom/giftbox/`,
  `luxury/Environment/Hearts.js`, `standard/cake/CakeGeometry.js`. Introducing a
  lit material for a new object should be a deliberate visual choice, not a
  default.
- **Responsive camera FOV (shared, `engine/camera/Camera.js`).** Holds
  *horizontal* FOV constant across every aspect ratio instead of the plain
  Three.js default (constant *vertical* FOV, which crops wide compositions on
  narrow/portrait screens). Vertical FOV is derived per-aspect from a fixed
  16:9 baseline and clamped to [25°, 100°] to avoid fisheye/telephoto extremes.
  Because of this, any world-space object's on-screen *width* stays a constant
  fraction of the viewport across devices "for free" — no per-template scaling
  logic needed for that axis; only DOM overlays that must match an object's
  actual rendered size need their own live camera-based pixel calculation (see
  `boom/reveal/Reveal.js`'s `_syncHeartScale()`).
- **Component/"Part" separation.** Each self-contained feature lives in its own
  subdirectory with its own Constants file, its own geometry/builder (if 3D),
  and its own orchestrator class exposing a small lifecycle (`create()`/
  `show()`/`trigger()`, `update(delta)`, `destroy()`). Boom specifically labels
  these as numbered "Parts" in comments; other templates use the same
  structural separation without that numbering convention.
- **Naming.** Constants are `SCREAMING_SNAKE_CASE`, prefixed by feature/template
  (`BOOM_`, `GIFTBOX_`, `GATHER_`, `BOMB_`, `REVEAL_`, `CAMERA_`, `START_`, ...).
  A constant's name is not always renamed when its *meaning* changes if doing so
  would force edits into unrelated files — see §4.
- **Lifecycle/disposal discipline.** Every class that creates GPU resources
  (geometries, materials, render targets) exposes `destroy()`/`disposeX()` that
  explicitly calls `.dispose()` on each one — 26 files contain `.dispose()`
  calls, with 115 `.dispose()` calls across those files — never left to
  garbage collection. Scene-level classes (`BoomScene`, `LoveScene`,
  `StandardScene`, ...) cascade `destroy()` into every child system they own.
- **Two distinct `document.createElement` uses — don't conflate them.**
  (1) Procedural canvas textures: `createElement('canvas')`, draw with the 2D
  context, wrap in `THREE.CanvasTexture`, cache/reuse (e.g. `BombTextures.js`).
  (2) DOM+CSS overlays for on-screen text/UI, each paired with its own `.css`
  file and driven by GSAP (e.g. `boom/reveal/Reveal.js`+`Reveal.css`) — never
  in-canvas Three.js text geometry for real UI text.

## 4. Important Design Decisions

- **Boom's gather system: heart silhouette → capital "S" letter → removed
  entirely (current state: hearts stay scattered).** The scattered heart burst
  originally converged into a heart-shaped silhouette (built from the individual
  particles, sized so smaller hearts traced the boundary and larger ones filled
  the interior). This was later replaced with the same particle-convergence
  mechanism targeting a capital "S" outline instead. Both were ultimately
  removed at the user's request in favor of simply leaving the burst hearts
  scattered and gently drifting — no convergence step at all. The convergence
  code (`gather/Gather.js`, `gather/LetterSPoints.js`) was deleted; only
  `gather/GatherConstants.js`'s `GATHER_HEART_WIDTH` constant survives, because
  it's still read for an unrelated purpose (see next point).
- **`GATHER_HEART_WIDTH` name preserved after its meaning changed.** Even though
  nothing "gathers" anymore, this constant's name was deliberately left as-is
  because `boom/reveal/Reveal.js` imports it (as a fixed reference width for
  scaling the reveal text responsively to on-screen size). Renaming it would
  have meant editing `reveal/`, which was explicitly out of scope for the change
  that removed gathering — a concrete example of the project's general
  small-blast-radius preference: don't touch a system that wasn't asked about
  just to keep a name tidy.
- **Camera/FOV**: see §3 — the constant-horizontal-FOV design in
  `engine/camera/Camera.js` is shared infrastructure, not template-specific, and
  exists specifically to prevent wide compositions cropping on portrait phones
  (the dominant traffic shape for this product, per §1).
- **Boom's gift box uses `MeshStandardMaterial` while the rest of Boom stays
  flat `MeshBasicMaterial`.** A deliberate, isolated exception: the gift box was
  specifically required to have "real 3D depth and soft lighting," so it opts
  into the scene's already-existing (previously unused-by-Boom) shared light rig
  rather than the flat/cartoon look every other Boom element uses.
- **Gift box lid hinge is a real pivot Group, not a rotated mesh.** To open
  around its *rear edge* rather than its own center, the lid (and everything
  that must move with it — its own ribbon segments, the bow) is parented under
  a dedicated pivot positioned at that edge; the front/back ribbon wrap, originally
  one continuous strip spanning body+lid, was split into a body segment and a
  lid segment at the seam specifically so the lid's portion can rotate away
  while the body's portion stays stationary — the closed-box appearance is
  visually identical to the original single-strip version.
- **Luxury's transition camera rig was rebuilt from scratch, twice, in the
  project's earliest recorded commits (2026-08-07).** Git
  history shows the sequence: a lerp-table framing approach → replaced by a
  simple eased two-reference-point camera rig → adjusted again to compensate
  for `Camera.js`'s own FOV swing during the heart-formation shot. `BlackHole.js`
  itself was later split into single-responsibility modules (own commit) rather
  than staying one large file.

## 5. Known Pitfalls

**Problem:** Vite's PostCSS loader searched upward through parent directories
outside the project and picked up an unrelated file, breaking a from-scratch build.
**Cause:** With no explicit PostCSS config, Vite's `cosmiconfig`-based search has
no boundary at the project root.
**Correct approach:** An explicit empty `postcss: {}` block in `vite.config.js`
skips the search entirely, so the build no longer depends on anything outside
the repo.

**Problem:** A Vercel deployment failed to build.
**Cause:** Node engine version mismatch against what Vite 8 actually requires.
**Correct approach:** Pin an explicit Node engine range in `package.json` that
matches Vite 8's own requirement rather than relying on Vercel's default.

**Problem:** Confirming *which* template a live Vercel deployment is actually
running was unreliable.
**Cause:** Naive string-matching against the shipped bundle produces false
positives/negatives (template names/strings can appear incidentally).
**Correct approach:** Grep the bundle for the specific `.X` dot-access property
pattern tied to that template's own code instead of matching on plain strings.

**Problem:** In Boom's gather-boundary curve, hearts occasionally rendered
outside the intended silhouette or left visible gaps along the edge.
**Cause:** Per-point jitter was applied as a raw perpendicular (x/y) offset,
which could push a point past a nearby cusp/tight-curvature region of the true
curve, or off it entirely.
**Correct approach:** Jitter along the curve's own arc length instead (nudging
*where* along the true path a point lands), never perpendicular to it — points
stay exactly on the real curve no matter how much they're staggered.

**Problem:** A boundary point's computed "inward" push direction was
occasionally unreliable right at a curve's cusp (e.g. the heart shape's own
bottom point).
**Cause:** The inward-normal estimate was derived by finite difference between
neighboring sampled points; at a genuine cusp the curve's tangent goes to zero,
making that estimate unstable.
**Correct approach:** Where the outline is constructed analytically (e.g. as an
offset from a known spine curve, as Boom's later letter-S outline was), compute
the inward direction directly from the known construction instead of estimating
it — no cusp instability possible. Where that isn't available, floor/clamp the
result against an exact analytic reference point as a safety net.

## 6. Deployment

**One production Vercel deployment per template**, not one deployment serving
all four. Each template is its own Vercel project, matching the per-template
`VITE_TEMPLATE` build (`npm run build:<template>`, see §2/`package.json`).

**Naming convention**: each template's deployment gets its own domain following
the pattern `<name>-file.vercel.app` (the specific `<name>` varies per
template/customer context).

**Verification expectation**: never confirm which template a live deployment is
actually serving by naive string-matching against the built bundle — see the
matching entry in §5. Grep for the template-specific `.X` dot-access pattern
instead.

## 7. Working Rules

- Local source (`src/`) is the only ground truth for current implementation —
  this document is for architecture/rationale/history, not exact current code.
- Use NotebookLM (`query_notebook`) first for "why"/"how does this fit
  together"/"has this happened before" questions; use local Read/Grep only when
  the exact current file content is needed (about to edit it, or verifying a
  live bug).
- Use `git log`/`git diff` for "what changed recently" — not a re-read, and not
  NotebookLM (this document is not a changelog).
- Don't scan the other three templates for a task scoped to one, unless the
  task explicitly asks to compare or port behavior between them.
- Never inspect `node_modules/` as source, and never Grep/Read it.
- Never treat binary assets (`.png`, `.jpg`, `.glb`) as text.
- When the relevant template/feature is already known from the task, go
  straight to it — avoid a broad repository search first "just in case."

## 8. Current Project State

- Four templates exist in varying states of completeness: **boom** is the most
  actively developed (bomb intro → heart burst → text reveal → gift box that
  opens on click, camera not yet moved on open, nothing yet revealed inside);
  **love**, **luxury**, and **standard** each have their own complete core flow
  (envelope/letter+stickers; black-hole transition+environment; start
  screen→cake→reveal) per §2.
- No template currently has its own dedicated `vercel.json`; deployment
  configuration is per-Vercel-project rather than committed to the repo.
- The project has no landing/marketing site — social media (Instagram/TikTok)
  is the only public-facing surface today.
- `package.json` exposes matched `dev:<template>` / `build:<template>` /
  `preview:<template>` scripts for all four templates plus template-less
  defaults.

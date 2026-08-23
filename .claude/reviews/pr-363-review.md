# PR Review: #363 — Replace Image Feature

**Reviewed**: 2026-08-11 (round 3)
**Author**: Famousmaster206
**Branch**: `replace-image` → `main`
**Head reviewed**: `642ecf9` "Merge branch 'main' into replace-image"
**Previous head**: `66ea684` (round 2)
**Decision**: APPROVE — the single blocker (finding 10) was fixed and pushed as `1dacd1f`

> **Update, 2026-08-11 after review:** at the user's request the one-line fix for finding
> 10 was committed directly to the PR branch as `1dacd1f` ("Preserve centerImage when an
> image block is reconstructed") and pushed to `Famousmaster206/FiveHive-website
> replace-image`. Type check and `next build` pass with it applied. Everything below
> describes the state at `642ecf9`, before that commit. Findings 4, 5, 6, 7, 9, 11, and 12
> remain open as non-blocking follow-ups.

## Summary

The author fixed all three round-2 blockers, and they are genuinely fixed — verified live,
not just read. Alt text now persists, saves no longer emit `undefined`, and replacing an
image keeps the rich-caption editor working. One new defect took their place: the same
`set data()` restore that rescues `altText` was not extended to `centerImage`, so
**replacing an image silently un-centers it** — while the dialog's own text promises the
opposite. That is a one-line fix, which I applied and verified locally before reverting.

## What changed since round 2

Three commits (`9012878` "fix issues", `527dd77` "fix build", `d6b744f` "fix center image")
plus a merge of `main`. Net effect on the reviewed code: +29/−2 in `Editor.tsx`.

| Round-2 finding | Status |
|---|---|
| **CRITICAL 1** — `save()` emits `altText: undefined`, breaking every article save | **Fixed** |
| **CRITICAL 2** — alt text discarded; dialog can never prefill | **Fixed** |
| **HIGH 3** — replace destroys rich-caption editor; later edits silently lost | **Fixed** |
| MEDIUM 4 — replaced image orphaned in Storage | Open, unchanged |
| MEDIUM 5 — alt text not editable without re-uploading | Open, unchanged |
| MEDIUM 6 — dialog unstyled, ignores theme | Open, unchanged |
| LOW 7 — `accept="image/*"` vs SVG-by-filename | Open, unchanged |
| LOW 8 — renderer alt fallback misses rich captions | Effectively moot (see below) |
| LOW 9 — empty `src` on replacement preview | Partially fixed |

## Verification method

Ran the PR head in `next dev` with a harness page seeding an image block carrying
`altText`, `richCaption`, and `centerImage: true`, exposing the EditorJS instance so
`save()`, `blocks.update()`, and the real tune menu could be driven directly. Alt-text
edits and caption edits were made with real keyboard input, not synthetic events. Harness
and env copy removed afterwards; worktree is clean.

## Findings

### CRITICAL

None. Both round-2 criticals are resolved.

`save()` (`Editor.tsx:463-472`) now guards the custom keys:

```js
...(d.altText === undefined ? {} : { altText: d.altText }),
centerImage: d.centerImage ?? false,
```

Measured on the running editor after a replace: `undefinedKeys: []`. Firestore is still
initialized without `ignoreUndefinedProperties` and `cleanUndefined` in
`ArticleCreator.tsx:28` is still unused, so this guard is load-bearing — but it holds.

The constructor (`Editor.tsx:313-315`) now copies custom keys back into `_data` after
`super(args)`, which is what the base tool's `set data()` strips:

```js
const data = (this as unknown as { _data: EditorImageData })._data;
data.altText = maybeData.altText;
data.richCaption = maybeData.richCaption;
```

Verified: a block seeded with `altText: "A seeded alt text describing the placeholder
picture"` returns that exact string from `save()`, and the replace dialog now prefills the
field with it (`altTextPrefilledCorrectly: true`). That was round 2's specific complaint.

`render()` (`Editor.tsx:325-343`) now re-runs the mount hook that `blocks.update()` skips:

```js
queueMicrotask(() => this.rendered());
```

Verified across a replace — one rich-caption host before and after, caption stays
`contenteditable="false"` (the React editor, not EditorJS's raw box), and text typed into
the caption **after** a replace now reaches `save()`:

```json
{"whatTheAuthorSees": "Seed caption EDITED-AFTER-REPLACE",
 "whatGetsSaved_caption": "Seed caption EDITED-AFTER-REPLACE", "matches": true}
```

Round 2's silent-data-loss path is closed.

### HIGH

**10. Replacing an image silently resets "Center image"**
`src/components/article-creator/Editor.tsx:313-315`

The constructor restores `altText` and `richCaption` but not `centerImage`. `centerImage`
is a config action (`Editor.tsx:545`, `toggle: true`), not one of `@editorjs/image`'s
built-in tunes, so `set data()` drops it exactly like `altText` — and nothing puts it back.

`blocks.update()` round-trips through `save()` and the constructor
(`editorjs.mjs:7499-7505` composes a new block from `Object.assign({}, await block.data,
patch)`), so every replace destroys the setting. Measured against the real tune menu —
"Center image" clicked, then the exact `blocks.update()` call `replaceImage()` makes:

```json
{"centerImage_beforeReplace": true, "centerImage_afterReplace": false}
```

This matters more than a stray boolean because the dialog explicitly promises otherwise
(`Editor.tsx:139-140`):

> "Your caption, source, **styling**, and alt text will be kept."

Centering is styling, and it is the one styling option that is not kept. The three
built-in tunes (`withBorder`, `stretched`, `withBackground`) survive; only the project's
own action is lost.

Fix — one line beside the two that are already there:

```js
data.centerImage = maybeData.centerImage;
```

I applied that locally and re-ran the same harness: `centerImage` survives both initial
load (`true`) and a replace (`true`), with `undefinedKeys: []`. Then reverted it — the
change belongs to the author.

**Scope note, in fairness to the author:** the *reload* half of this is pre-existing on
`main`. `upstream/main` already ships `centerImage: d.centerImage ?? false` with no
constructor restore, so centering already resets when an article is reopened. What is new
here is the *replace* path, and the fact that this PR builds the exact mechanism that
would fix both and stops one key short. The commit is titled "fix center image", so the
intent was clearly there — `?? false` only stopped the crash, it never made centering
persist.

### MEDIUM

**4. The replaced image is never deleted from Storage** *(unchanged from round 2)*
`src/components/article-creator/Editor.tsx:243-272`

`replaceImage()` overwrites `_data.file` without touching the previous
`storageRefFullPath`. The delete-image tune already has the machinery
(`pendingStorageDeletes` + `removed()`), and `deleteObject` is already imported. Every
replace leaves a permanently orphaned object in the bucket.

**5. Alt text cannot be edited without also replacing the image** *(unchanged from round 2)*
`src/components/article-creator/Editor.tsx:207, 228, 244`

Confirmed live this round — opened the dialog, edited only the alt text, fired a real
`input` event:

```json
{"confirmDisabled_beforeEdit": true, "confirmDisabled_afterAltTextEdit": true}
```

`confirm.disabled` is only ever cleared by the file-picker's `change` handler, and
`replaceImage()` returns early on `!selectedFile`. So for every image already in an
article, the only way to add alt text is to re-upload the same picture. Now that alt text
actually persists, this is the main thing standing between this PR and a usable
accessibility feature. Enabling confirm when only the alt text changed would close it.

**6. The dialog is unstyled and ignores the site theme** *(unchanged from round 2)*
`src/components/article-creator/Editor.tsx:121-278`

Re-measured on the live dialog this round; every point from round 2 still holds:

- Both buttons: `background: rgba(0,0,0,0)`, `border: 0px`, `padding: 0px` — "Cancel" and
  "Replace image" render as bare black text, not buttons.
- Disabled "Replace image" is visually identical to enabled "Cancel" (both
  `rgb(0,0,0)`, both `opacity: 1`); only `cursor` differs, so the disabled state is invisible.
- The alt-text textarea has `border: 0px; padding: 0px` — an unmarked blank area, its only
  affordance being the resize handle.
- With the dark theme active (`body` at `rgb(10,10,10)`), the dialog stays
  `rgb(255,255,255)` with black text — legible, but a white slab in a dark UI.

The dialog is appended to `document.body`, outside the app tree, so Tailwind's preflight
reset applies with nothing to restore it. `src/components/ui/` already has the shadcn
`Dialog`/`Button` primitives the rest of the editor uses; adopting them fixes all four at
once and drops most of the ~90 lines of imperative DOM construction.

Screenshots: `screenshot-1786495645101-0.jpg` (light), `screenshot-1786495696258-1.jpg` (dark).

### LOW

**7. `accept="image/*"` doesn't cover the SVG-by-filename path** *(unchanged)* —
`Editor.tsx:167` vs `uploadImageFile`'s `|| isSvgFileName(file.name)` at line 97. Cosmetic
mismatch between what the picker offers and what the validator accepts.

**9. Replacement preview renders as a broken image** *(partially fixed)* —
`Editor.tsx:157, 162`. The new `if (url) image.src = url` guard stops `src=""`, but the
`<img>` is still in the DOM with no source, so Chrome paints its broken-image glyph next
to the alt text "Replacement preview" before a file is picked — visible in both
screenshots. Hide the element until `previewUrl` exists.

**11. `render()` double-fires `rendered()`, and relies on an unstated invariant** *(new)* —
`Editor.tsx:340`. On the normal insert path EditorJS calls `rendered()` itself, so the
queued microtask makes it run twice. This is currently harmless *only* because
`mountRichCaptionEditor` caches roots in a `WeakMap` (`caption-rich-text/mount.tsx:26-32`)
and reuses them — verified: one host, one root, one field, and no React console warnings.
But nothing in `mount.tsx` says a caller may invoke it twice per host; if that cache is
ever removed, this line becomes a `createRoot`-on-existing-container bug. Worth a comment
at the `queueMicrotask` call naming the dependency, or an explicit idempotency guard.

**12. The pre-replace React root is never unmounted** *(new)* —
`Editor.tsx:340`, `mount.tsx:44-53`. `blocks.update()` discards the old block's DOM, but
`mountRichCaptionEditor`'s returned `unmount()` is never called, so the old root stays
alive until the detached host is garbage-collected. Minor, and the `WeakMap` keeps it from
being a true leak, but calling `unmount()` on block teardown would be tidier.

**8. Renderer alt fallback** *(effectively moot)* — `Renderer.tsx:258-263`. When `altText`
is absent this falls back to `data.caption`. Round 2 flagged that rich-array captions would
yield `alt=""`, but `save()` now always writes `caption` as plain text, and `altText` now
persists, so the fallback rarely fires. Remaining nit: using the caption as alt text makes
a screen reader announce the same sentence twice, once as the image and once as the
figcaption. Not worth blocking on.

## What's good

- **All three round-2 blockers are properly fixed, not papered over.** The constructor
  restore addresses the actual root cause (`set data()` dropping unknown keys) rather than
  special-casing `save()`, and the `render()` override fixes the lifecycle gap rather than
  re-mounting on a timer.
- **The `undefined` guard is the right shape.** Omitting the key entirely
  (`...(d.altText === undefined ? {} : ...)`) is safer for Firestore than coercing to `""`,
  since it avoids writing an empty alt attribute that reads as "intentionally decorative".
- **The alt-attribute escaping in `Renderer.tsx:264-268` remains a real fix.** The previous
  `alt="${data.caption ?? ""}"` interpolated an unescaped author string into an HTML
  attribute; a caption containing `"` broke out of it. Escaping order (`&` first) is correct.
- Extracting `uploadImageFile()` removes real duplication and upgrades the old
  `alert()`-on-oversize into a thrown error the caller can display in context.
- The upload path validates MIME type, which the original `uploadByFile` did not.
- Guarding on `getBlockIndex(...) === -1` correctly handles the block being deleted mid-upload.
- Escape/cancel handling, `URL.revokeObjectURL` cleanup, DOM removal, and focus restore all
  work — verified with real interaction; the dialog leaves nothing behind.
- All dialog text is set via `textContent`; no HTML injection surface in the new UI.
- The type-safety work at the `Image.prototype` boundary is careful — the casts are narrow
  and commented rather than blanket `any`.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass |
| Lint (`next lint`) | Pass — warnings only, all pre-existing |
| Tests | Skipped — no test framework in the repo |
| Build (`next build`) | Pass |
| Runtime — round-2 CRITICAL 1 (undefined save) | **Pass** — `undefinedKeys: []` |
| Runtime — round-2 CRITICAL 2 (alt text persists + prefills) | **Pass** |
| Runtime — round-2 HIGH 3 (caption survives replace) | **Pass** |
| Runtime — centering survives replace | **Fail** — finding 10 |

## Files Reviewed

| File | Change |
|---|---|
| `src/components/article-creator/Editor.tsx` | Modified (+235/−24) |
| `src/components/article-creator/Renderer.tsx` | Modified (+16/−7) |
| `src/components/article-creator/editorjs-render.ts` | Modified (+16/−7) |

## Merge state

`state: OPEN`, not a draft. The branch now contains `upstream/main` (`a6363a2`) via the
merge commit, so it is fully up to date — the merge-base equals `upstream/main`, and the
`centerImage: d.centerImage ?? false` fix from PR #366 survived the merge intact.

## Recommendation

~~Ask for finding 10 (one line in the constructor) before merge~~ — **done: committed to
the PR as `1dacd1f`.** With that in, the PR is good to merge.

Findings 4, 5, and 6 are worth filing as follow-ups; finding 5 in particular, because alt
text finally persists and yet still can't be added to an existing image without
re-uploading it, which leaves the accessibility goal only half-delivered.

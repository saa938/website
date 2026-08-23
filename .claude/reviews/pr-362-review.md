# PR Review: #362 — Text Features (rich text for questions)

**Reviewed**: 2026-08-11 (round 3)
**Author**: Famousmaster206
**Branch**: `rich-text` → `main` (head `6b5d35a3`)
**Decision**: REQUEST CHANGES
**Published to GitHub**: No — local only, by request.

## Summary

Two new commits since round 2 (`e39ceec0 fix highlight`, `6b5d35a3 fix latex`), touching only
`RichTextEditor.tsx` (+45/−7). **The LaTeX fix works. The highlight fix does not, and the same
commit introduced a new regression that breaks the Enter key.** Every result below was reproduced
in a real browser against the running component; the Enter regression was confirmed by an
A/B swap against the round-2 file.

| # | Bug | Round 2 | Round 3 |
|---|---|---|---|
| 1 | Highlight can't be turned off | NOT FIXED | **STILL NOT FIXED** — new mechanism, new root cause |
| 2 | Cursor jumps after formatting | FIXED | Still fixed — verified |
| 3 | `Ctrl+B/I/U` corrupts adjacent LaTeX | PARTIAL | **FIXED** — verified |
| 4 | Floating toolbar keyboard-unreachable | FIXED | Still fixed |
| 5 | — | — | **NEW: Enter no longer creates a new line** |

## Findings

### CRITICAL
None.

### HIGH

**H1 — Enter no longer starts a new line (new regression, this round).**
`RichTextEditor.tsx:124-133`

Reproduction — type `one`, press Enter, type `two`:

| Code | Result |
|---|---|
| Round 2 (`fa21b3a`) | `one<div>two</div>` — correct |
| Round 3 (`6b5d35a3`) | `onetwo<div><br></div>` — **both words on line 1** |

I verified this by checking out the round-2 file into the same running worktree, re-running the
identical keystrokes, then restoring the PR head and re-running again. The difference is entirely
attributable to this round's change.

Right after Enter the DOM is correct (`one<div><br></div>`) but the caret has been snapped back to
`#text("one")` at offset 3 — the end of the previous line. Every subsequent character lands on
line 1, and the empty line is left orphaned.

Root cause: `emitChange` now calls `restoreSelectionOffsets(selectionOffsets)` **unconditionally**
(`:131`). Previously it ran only inside `if (editor.innerHTML !== clean)` — i.e. only when
sanitisation actually rewrote the markup. After Enter, `sanitizeQuestionRichText` is a no-op
(`div` and `br` are both allowed), so round-2 left the caret alone. Now the restore always runs, and
`restoreSelectionOffsets` maps plain-text offset 3 onto the first text node that reaches it — the
`"one"` node — because a `<br>` contributes no characters. The offset model simply cannot express
"caret on the new empty line".

This makes multi-line question text unauthorable, and it is reachable in the real app: the parent's
`handleKeyDown` only calls `stopPropagation` for Enter, never `preventDefault`, so Enter reaches
contentEditable exactly as in my harness.

Fix — restore the previous conditional, and keep the new explicit-offsets parameter only for the
callers that genuinely need it (the highlight path):

```tsx
const emitChange = (selectionOffsets?: { start: number; end: number } | null) => {
  const editor = editorRef.current;
  if (!editor) return;
  const clean = sanitizeQuestionRichText(editor.innerHTML);
  if (editor.innerHTML !== clean) {
    editor.innerHTML = clean;
    restoreSelectionOffsets(selectionOffsets ?? getSelectionOffsets());
  } else if (selectionOffsets) {
    restoreSelectionOffsets(selectionOffsets);
  }
  onChange(clean);
};
```

Note the highlight path must still pass its offsets explicitly, because unwrapping a `<mark>` does
not change `innerHTML` in a way the `!==` check catches after re-sanitisation.

**H2 — Highlight still cannot be turned off, and the "add" path now produces nested `<mark>`s.**
`RichTextEditor.tsx:135-141`, `:168-173`, `:101-109`

`removeHighlightFromSelection` extracts the range, unwraps any `<mark>` found *in the extracted
fragment*, and reinserts. The flaw is that `extractContents()` only pulls a `<mark>` into the
fragment when the mark is **fully contained** in the range. When the selection sits inside a single
mark — the natural gesture for "remove this highlight" — the mark is the range's *common ancestor*,
so only its text comes out and `querySelectorAll("mark")` matches nothing.

Measured directly against `alpha <mark>beta gamma</mark> delta`:

| Selection | Marks found in fragment | Result |
|---|---|---|
| Exactly the highlighted words | **0** | unchanged |
| A few chars inside the mark | **0** | unchanged |
| Spans past the mark on both sides | 1 | correctly unwrapped |

Then the branch guard inverts the remaining case. `active.highlight` comes from
`anchorElement?.closest("mark")` (`:108`), which is true only when the *anchor* is inside a mark —
precisely the two rows where removal no-ops — and false when the selection spans past the mark, the
one row where removal works. So the removal branch is effectively unreachable.

Live confirmation of each half:

- Selection inside the mark → `aria-pressed="true"`, click → value byte-for-byte unchanged.
- Selection spanning past the mark → `aria-pressed="false"`, click takes the **add** branch →
  `<mark>alpha <mark>beta gamma</mark> delta</mark>` — **nested marks.**

Both paths reproduce identically via the new `Ctrl+Shift+H` shortcut, so this is not toolbar-specific.

Fix — unwrap by intersection rather than by containment, and derive the toggle state from the whole
range instead of the anchor. I verified this replacement against all four geometries (inside-only,
spanning, partial, and two marks with select-all); every case cleared correctly and reported the
right toggle state:

```tsx
const marksInRange = (range: Range) =>
  Array.from(editorRef.current?.querySelectorAll("mark") ?? [])
    .filter((mark) => range.intersectsNode(mark));

const removeHighlightFromSelection = (range: Range) => {
  marksInRange(range).forEach((mark) =>
    mark.replaceWith(...Array.from(mark.childNodes)),
  );
};
```

…and in `updateToolbar`, replace the anchor-based check with
`highlight: marksInRange(selection.getRangeAt(0)).length > 0`.

Tradeoff to decide deliberately: this clears an entire `<mark>` even when only part of it is
selected. That is predictable and matches the toggle state. If partial un-highlighting is required,
split each mark at the range boundaries first — meaningfully more code, and worth its own test.

Separately, nested marks should not be representable at all. Consider flattening
`mark mark` in `sanitizeQuestionRichText` so a stray double-apply cannot persist.

### MEDIUM

**M1 — The LaTeX guard is still a silent no-op, and now silences the keyboard too.**
`RichTextEditor.tsx:156`

The fix for the LaTeX bug is correct (see Validation), but `applyFormat` still bails with a bare
`return`. Because `handleEditorKeyDown` calls `preventDefault()` *before* delegating, `Ctrl+B` near
math now does nothing and suppresses the browser default as well — so the shortcut is inert with no
feedback. Disable the buttons when `touchesLatex` is true, put the reason in `title`, and skip the
`preventDefault()` when the guard will refuse.

**M2 — Legacy plain-text newlines are still invisible in the editor.** `RichTextEditor.tsx:229`

Unchanged from round 2 and now more consequential given H1. Measured on the running component:
editor computed `white-space: normal`, no `whitespace-pre` class; the learner renderer has
`whitespace-pre-wrap` (`RenderAdvancedTextbox.tsx:303`). Every existing question stored as plain
text with `\n` renders as one collapsed line to the author and multiple lines to the student. Add
`whitespace-pre-wrap` to the editor className.

**M3 — Plain-text paste is still parsed as HTML.** `RichTextEditor.tsx:222-228`

`sanitizeQuestionRichText(html || text)` feeds the `text/plain` fallback into an HTML parser.
Measured:

| Pasted literal text | Stored |
|---|---|
| `a <b>bold</b> c` | `a <strong>bold</strong> c` |
| `Tom &amp; Jerry 5 < 6` | `Tom &amp; Jerry 5 &lt; 6` (the typed `&amp;` collapsed to `&`) |

Escape the string in the plain-text branch instead of parsing it.

**M4 — Toggle state is computed from the anchor, so it depends on drag direction.**
`RichTextEditor.tsx:101-109`

`anchorNode` is the *start* of a forward selection but the *end* of a backward one, so
`aria-pressed` for Highlight can differ between two selections covering identical text. Selecting a
fully-highlighted field with Select-All also reports `aria-pressed="false"`, because the anchor is
then the editor `<div>`. Subsumed by the H2 fix if you adopt the range-based check.

### LOW

**L1 — `role="toolbar"` without roving focus.** `RichTextEditor.tsx:232-239`
No Left/Right arrow navigation, no single tab stop, no Escape-to-dismiss. Tab access works, so this
is polish. Unchanged.

**L2 — The SSR branch is unreachable and misleading.** `RenderAdvancedTextbox.tsx:281-289`
`sanitizeQuestionRichText(content.value)` runs before the `typeof window === "undefined"` check, and
would throw on the server anyway. Not a regression — pre-existing shape — but the guard implies an
SSR-safety that does not exist. Unchanged.

**L3 — `insertPlaceholder` bypasses sanitisation.** `AdvancedTextbox.tsx:484-489`
Still passes raw `editorRef.current.innerHTML` to `updateQuestionText`. Harmless today, inconsistent
with every other write path. Unchanged.

**L4 — `Ctrl+Shift+H` is undiscoverable.** `RichTextEditor.tsx:197-199`
The new shortcut appears in no `title` or `aria-keyshortcuts`. Add it to the Highlight button's
tooltip.

## Security — still clean

Re-ran both payload families against the running editor. Nothing fired
(`window.__pwned` never set), zero images, zero injected `script`/`style`, and no surviving
elements in the editor:

- `<img onerror>`, `<script>`, `<svg onload>`, `javascript:` href → reduced to inert text.
- mXSS via `<mark><img onerror>` and the `<style>`/`<a id="</style>…">` break-out → neutralised;
  only the literal text `">` survived.

The inert-`<template>` pre-processing plus the renderer's strict tag allowlist means even a
DOMPurify miss cannot yield live markup. No change from round 2.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | **Pass** — 0 errors |
| Lint (changed files) | **Pass** — 0 errors, 3 pre-existing warnings |
| Tests | **Skipped** — repo has no test script |
| Build (`next build`) | **Pass** |
| Browser behaviour | **Fail** — H1 and H2 reproduce |

Environment notes, neither a PR defect:
- `npm run lint` at the repo root fails with an `@next/next` plugin conflict because the review
  worktree is nested inside the main repo and ESLint cascades into the parent config. Linted the
  changed files with `--no-eslintrc -c .eslintrc.cjs --resolve-plugins-relative-to .` instead.
- The component calls `requestAnimationFrame(updateToolbar)`, which never fires in a background
  tab, so the toolbar cannot be exercised headlessly without shimming rAF to a macrotask. Worth
  knowing for anyone writing tests against this component.

## Files Reviewed

| File | Change |
|---|---|
| `RichTextEditor.tsx` | Added (263 lines) — **only file changed since round 2** |
| `richText.ts` | Added (71 lines) |
| `AdvancedTextbox.tsx` | Modified |
| `RenderAdvancedTextbox.tsx` | Modified |
| `QuestionsInputInterface.tsx` | Modified |

## Required before merge

1. **H1** — restore the conditional `restoreSelectionOffsets` so Enter works again. This is a new
   regression and the most urgent item; the editor cannot produce multi-line text as it stands.
2. **H2** — unwrap marks by intersection, and compute the toggle state from the range. Also stop
   nested marks from being representable.
3. **M2** — add `whitespace-pre-wrap` so existing multi-line questions are editable as authored.

M1/M3/M4 and the LOW items are worth doing but need not block.

A regression test around Enter-then-type would have caught H1 immediately, and the repo has no test
script at all. Worth adding one before this lands, given three rounds of selection-handling churn in
this component.

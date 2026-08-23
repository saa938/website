# PR Review: #368 — Add local FRQ editor functionality

**Reviewed**: 2026-08-11
**Author**: TechnoSamurai02
**Branch**: `issue-357-frq-editor-functionality` → `frq`
**State**: DRAFT (263 additions, 80 deletions, 2 files)
**Closes**: #357
**Decision**: REQUEST CHANGES (1 HIGH crash cluster; everything else is polish)

## Summary

The interactive work is genuinely good — I drove every control in a browser against
both the `FRQTemplate` shape and the practice-data shape, and the local editing
model is correct: edits are isolated per question, survive FRQ navigation, and
point totals derive correctly from criteria. The blocker is defensive-coding
regressions: four unguarded field accesses run inside the `useState` initializer,
so a malformed document white-screens the page instead of hitting the existing
"Failed to load FRQ." fallback. Two of those four were guarded on the base branch
and this PR removed the guards.

Separately, the practice-data compatibility layer this PR adds is unreachable
through the page's actual Firestore query, so acceptance criterion #5 is only
half-met.

## Findings

### CRITICAL
None.

### HIGH

**H1 — Four unguarded field accesses render a blank page; two are regressions.**

All four run inside the `useState` initializer or the render body, which is
*before* the `if (!frqFound || !currentFrq) return <div>Failed to load FRQ.</div>`
guard on line 425. A throw there escapes the component entirely — the user gets a
blank white page, not the fallback.

| # | Location | Expression | Base branch |
|---|---|---|---|
| a | `editorRenderer.tsx:211` | `template.title.trim()` | was `template.title?.trim() \|\| "Untitled FRQ"` — **guard removed** |
| b | `editorRenderer.tsx:217` | `template.questions.map(...)` | was hardcoded `questions: []` — **never dereferenced** |
| c | `editorRenderer.tsx:223` | `frq.name.trim()` | new code |
| d | `editorRenderer.tsx:257` | `template.title.trim()` | new code |

Verified in a browser against the real component (Next dev, `npm run build`-clean
tree). Each case produced a blank `document.body` and an uncaught `TypeError`:

```
C  practice-shaped doc with `frqs: []`
   TypeError: Cannot read properties of undefined (reading 'trim')
     at createEditorFrqFromTemplate (editorRenderer.tsx:134)   -> source L211
     at createEditorFrqsFromTemplate (editorRenderer.tsx:165)
     at mountStateImpl / useState

D  practice-shaped doc whose FRQ entry has no `name`
   TypeError: ... (reading 'trim')
     at createEditorFrqFromPracticeData (editorRenderer.tsx:148) -> source L223

F  valid `frqs`, but no batch `name` and no `title`
   TypeError: ... (reading 'trim')
     at getBatchName (editorRenderer.tsx:178)                    -> source L257

G  template-shaped doc with `title` but no `questions` field
   TypeError: Cannot read properties of undefined (reading 'map')
     at createEditorFrqFromTemplate (editorRenderer.tsx:140)     -> source L217
```

Case **G** is the one most likely to bite on live data: `FRQTemplate.questions` is
typed as required, but Firestore does not enforce schemas, and the base branch
never touched the field. Any `frqTemplates` document predating the current write
shape — or hand-edited in the console — now white-screens an editor page that
previously rendered. Case (a) is the same story; the base code's `?.` says the
original author already expected `title` to be absent sometimes.

Cases **C/D/F** are only reachable for practice-shaped documents, which ties into
H2 below — but they are exactly the shape this PR's compatibility layer exists to
read, so they should not be the shape that crashes it.

Suggested fix — treat the Firestore payload as untrusted at the boundary
(`CLAUDE.md`: "Validate input at system boundaries"):

```ts
// L211 / L257
const trimmedTitle = template.title?.trim() ?? "";
// L217
questions: (template.questions ?? []).map(createEditorQuestionFromTemplate),
// L223
title: frq.name?.trim() ? frq.name.trim() : "Untitled FRQ",
```

Same applies to `question.id` / `criterion.id` / `criterion.points` in
`createEditorQuestionFromPracticeData` (L178–191) — a missing `points` yields
`Math.max(0, undefined)` → `NaN`, which propagates to a "NaN points" label.

### MEDIUM

**M1 — The practice-data compatibility layer is dead code on the real fetch path.**

`src/app/admin/subject/[slug]/[unit]/frq/[id]/page.tsx:31` reads
`doc(db, "frqTemplates", frqId)`. The only writer of that collection
(`src/app/admin/subject/[slug]/page.tsx:218`) writes strictly `FRQTemplate` shape:
`{subject, unitId, title, directions, questions, isPublic, createdAt, updatedAt}`.
Practice-format FRQs live somewhere else entirely —
`subjects/{subject}/units/{unit}/frqs/{id}`, read by
`src/app/subject/[slug]/(no-sidebar)/[unit]/frq/[id]/page.tsx:30-38`.

So `frqs`, `name`, and `isVisible` will never be present on a document this page
loads, and `createEditorFrqsFromTemplate` will always take the `FRQTemplate`
branch. The PR added ~90 lines of practice-shape handling that production never
executes, and those same lines carry three of the four H1 crash paths.

This is why AC #5 ("Data should be fetched from Firebase, and should use the
correct formatting as defined in the practice data sets") reads as only half-met:
the *component* can parse the practice format, but the *page* never hands it one.
Worth confirming with the team which collection the admin editor is meant to own
before building further on this shape.

**M2 — `PracticeFrq` / `PracticeQuestion` / `PracticeGradingCriterion` duplicate
existing exported types, and have already drifted.** (L56–75)

`src/components/frq/feedback/types.ts` already exports the same three shapes as
`FRQQuestion`, `FRQPart`, and `GradingCriterion`, and `fallBackData.ts` is the
practice data set built against them. The local copies differ:

- `FRQPart.name` is absent from `PracticeQuestion`, so a part's name is silently
  dropped on load. Harmless while save is unimplemented; becomes data loss the
  moment Venkata wires up persistence.
- `FRQQuestion.isVisible` (per-FRQ visibility) is likewise dropped.
- `answerType` is widened to `"text" | "equation"`, but `FRQPart.answerType` is the
  literal `"text"`. The editor can now produce a value the shared type rejects.

Importing the existing types would remove the drift and shrink the diff.

**M3 — `timeLimit` / `timeLimitMinutes` are invented fields.** (L276–290)

Neither exists on `FRQTemplate` nor on the practice document type, so
`getInitialTimeLimit` always falls through to `90` for real data. The value is also
never written into the `frqs` model — it lives in standalone component state — so
it is not part of the object a future save would serialize. Fine for this PR's
scope, but the reader should not be told a field exists when it doesn't.

### LOW

**L1 — Newly added questions render collapsed.** (L551–556)

Verified: accordion item `data-state` went `["open","open"]` → `["open","open","closed"]`
after clicking "Add Question". `Accordion` is uncontrolled and `defaultValue` is
only applied at mount; `key={currentFrq.id}` doesn't change when a question is
added, so the new item never picks it up. The user must click twice to start
typing a prompt. Fix: make the accordion controlled, or track open items in state
and append the new id.

**L2 — "1 questions in this FRQ".** (L537) No pluralization, despite `formatPoints`
doing exactly this two lines of code away.

**L3 — Duplicate FRQ titles.** (L228–233) `createBlankEditorFrq(frqs.length + 1)`
names by count, not by max. Verified: create a 3rd FRQ, delete the middle one,
create again → two FRQs both titled "FRQ 3". This also makes the nav popup's
`aria-label`s ambiguous — two buttons both read "Go to FRQ 3".

**L4 — Time-limit input edge cases.** (L449–458) Verified in-browser:
clearing the field snaps it to `1` (you can't empty it to retype);
`45.7` is accepted and retained even though `getInitialTimeLimit` floors on load;
`999999` is accepted (no upper bound). Consider `step={1}`, a `max`, and allowing
a transient empty string.

**L5 — Stale-closure reads outside state updaters.** (L322–327, L329–340)
`createFrq` calls `setCurrentFrqIndex(frqs.length)` and `deleteCurrentFrq` derives
`remainingFrqs` from the `frqs` closure rather than the updater argument. Correct
today because each runs once per event, but it's the pattern that breaks silently
under batching.

**L6 — `isVisible === false` is mapped to `"legacy"`.** (L183) Visibility and
legacy-status are conflated. Neither the issue nor the data model states this
equivalence — worth confirming it's the intended product behavior.

**L7 — Prettier fails on both files.** Both lost their trailing newline
(`editorRenderer.tsx` ends `...FRQEditorRenderer;` with no `\n`). `npx prettier
--check` exits 1 on both. CI doesn't run Prettier — `.github/workflows/` only has
`test-build.yml` and the Vercel workflows — so this is cosmetic, but `--write`
is a one-second fix.

## Validation Results

| Check | Result |
|---|---|
| Type check (`npx tsc --noEmit`) | Pass (exit 0) |
| Lint (`npx eslint` on both files) | Pass (exit 0) |
| Format (`npx prettier --check`) | **Fail** — both files (L7) |
| Build (`npm run build`) | Pass (exit 0) |
| Tests | N/A — repo has no test runner or test deps |
| Manual browser testing | Performed — see below |

## Manual Test Coverage

Driven in Chrome against a Next dev server, rendering the real
`FRQEditorRenderer` with controlled fixtures for both document shapes.

Working correctly:

- Practice-shape load: batch name, `Visibility: Public`, "FRQ 1 of 2",
  per-question criteria text + points, Legacy badge on `isVisible: false`,
  point totals `3+1 = "4 points"` and `"1 point"` (correct singular/plural)
- Template-shape load: questions now populate from `template.questions`
  (base branch hardcoded an empty list)
- Prompt editing isolated per question — editing 1a then 1b left both intact;
  editing the FRQ description clobbered neither
- Edits persist across Back/Next navigation
- Add criterion → total 4→5; set to 5 points → total 9
- Delete criterion → total recalculates; delete question → labels re-index (1b→1a)
- Create FRQ / Delete FRQ / Back / Next / counter all track correctly
- Nav popup selects an FRQ and closes (`data-state="closed"`)
- Input type Text→Equation, Status Public→Legacy (badge appears)
- Info popover opens with its explanatory text (was disabled before)
- Preview and Save Changes remain correctly disabled

Failing:

- Scenarios C / D / F / G → blank page (H1)
- Add Question → new item collapsed (L1)
- Middle-delete then create → duplicate title (L3)
- Time-limit clear / fractional / unbounded (L4)

## Acceptance Criteria vs Issue #357

| AC | Status |
|---|---|
| Implement all local FRQ editing functionality | Met — verified control by control |
| All new UI elements reflect the mockup | Unverified — no mockup in the repo |
| Do not implement saving | Met — Save and Preview left disabled |
| Refactor bottom-left FRQ name + visibility to plain text | Met — verified rendering fetched values |
| Fetched from Firebase, formatted per the practice data sets | Partial — see M1 |

## Files Reviewed

- `src/components/frq/editorRenderer.tsx` — Modified (+232 / −49)
- `src/components/frq/editorFooter.tsx` — Modified (+31 / −31)

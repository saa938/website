# FRQ exam structure: questions, parts, and section labels

- **Date:** 2026-08-21
- **Status:** approved design, not yet implemented
- **Base branch:** `upstream/frq` (the FRQ feature is *not* on `main` — it was
  reverted in PR #377 and rebuilt on the `frq` branch)

## Problem

Three complaints came in from testers:

1. You can't put multiple FRQs in one exam, the way a real AP exam pairs a
   calculator and a non-calculator section.
2. Because of (1), each FRQ was authored as a separate *part*, and the test
   pages between parts one at a time. That is not how the digital exam behaves.
3. The section heading is fixed at "Section II / Free response". Some exams put
   short-answer questions at "Section I, Part B".

## Root cause

All three are the same defect. `FRQTemplate` (`src/types/frq.ts:38`) holds
exactly one stimulus and a flat list of parts:

```ts
directions: string;               // one stimulus for the entire document
directionsFiles?: QuestionFile[];
questions: FRQTemplateQuestion[]; // rendered as Part A, B, C...
```

`testRenderer.tsx:564-635` pins that single `directions` into the left pane for
the whole attempt and steps `currentFRQIndex` through `questions[]` in the
right pane.

There is no level between "exam" and "part". So a second question has nowhere
to live except the parts list, which is why authors were forced into the shape
complaint 2 describes. The section heading is hardcoded in two places:
`testRenderer.tsx:527-528` and `testRenderer.tsx:444`.

## What makes this cheap

The **feedback** half of the codebase already models the correct shape.
`src/components/frq/feedback/types.ts:48`:

```ts
export interface FRQQuestion {
  description: QuestionInput;  // per-question stimulus
  questions: FRQPart[];        // its parts
}
// FRQFeedbackDocument.frqs: FRQQuestion[]
```

`feedback/layout.tsx` already pages between `frqs[]` and stacks parts in the
right pane — the exact target behaviour. `buildFeedbackDocument`
(`src/lib/frq/feedbackDocument.ts:73`) hardcodes `frqs` to a single-element
array purely because the template cannot express more.

This work is therefore not inventing a shape. It is making authoring and
test-taking speak the shape feedback already speaks.

## Goals

- One FRQ document can hold several numbered questions, each with its own
  stimulus.
- Taking the test pages between **questions**; a question's parts stack on one
  scrollable page.
- Section heading and subtitle are authored, not hardcoded.
- Existing FRQ documents and existing submissions keep working with no backfill.

## Non-goals

- **Per-section timers and a calculator/no-calculator split inside a single
  document.** Complaint 1 asked for that pairing. This design does not deliver
  it: an exam that needs both is authored as two FRQ documents, each naming its
  own section. This was an explicit decision, not an oversight. If separate
  per-section clocks turn out to be the real requirement, that is a three-level
  model (Template → Section → Question → Part) and a follow-up spec.
- Reordering questions or parts via drag-and-drop.
- Any change to the grading queue or submission collections.

## Data model

`src/types/frq.ts`. The current `FRQTemplateQuestion` body becomes
`FRQTemplatePart`, and `FRQTemplateQuestion` is redefined as the new outer
level. This matches the vocabulary `feedback/types.ts` already uses
(`FRQQuestion` / `FRQPart`), so the two halves of the codebase stop disagreeing
about what "question" means.

```ts
/** One part — the unit a student writes a single response to. */
export interface FRQTemplatePart {
  id: string;
  title: string;                 // "A", "B" — derived, restarts within each question
  prompt?: string;
  promptFiles?: QuestionFile[];
  answerType?: FRQAnswerType;
  status?: FRQQuestionStatus;
  criteria?: FRQGradingCriterion[];
}

/** One numbered question: its own stimulus plus the parts hanging off it. */
export interface FRQTemplateQuestion {
  id: string;
  stimulus?: string;             // the new level — left pane, per question
  stimulusFiles?: QuestionFile[];
  parts: FRQTemplatePart[];
}

export interface FRQTemplate {
  // ...unchanged fields...
  directions: string;            // stays: exam-wide, rendered above every stimulus
  directionsFiles?: QuestionFile[];
  sectionLabel?: string;         // "Section I, Part B" — was hardcoded
  sectionSubtitle?: string;      // "Short answer"      — was hardcoded
  questions: FRQTemplateQuestion[];
}
```

`directions` stays at the template level deliberately. The reference screenshot
shows the left pane carrying exam-wide directions ("On exam day, you'll write
your answer in the free-response booklet…") *above* the question's own
stimulus. Both levels are real, so both are kept.

Part labels restart at A within each question, which is how AP numbers them
(Question 1 has parts A–D, Question 2 starts again at A).

## Migration: none required

`responses` in `GradableFRQSubmission` stays keyed by **part id**. Part ids are
minted by `makeId()` (`editorRenderer.tsx:70`) as timestamp + random suffix, so
they are already unique across an entire document. Adding a nesting level does
not change that. Existing submissions, grades, and feedback documents keep
resolving untouched.

`normalizeFrqTemplate` (`src/lib/frq/template.ts:123`) gains one branch:

- `questions[i].parts` is an array → new shape, normalize as written.
- otherwise → legacy flat shape. Wrap the whole `questions[]` list into a single
  synthetic question with the constant id `"legacy-question"` and an empty
  `stimulus`. The id must be a constant, not generated: it is re-derived on every
  read, so a random id would differ between two reads of the same document.

Because template-level `directions` was already the thing legacy documents used
as their stimulus, and it remains exam-wide, **a legacy document renders
identically to how it renders today**. There is no backfill script, no
downtime, and no window in which a half-migrated document is unreadable.

One thing deliberately left alone: `FRQQuestionGrade.questionId` is a stored
field in the `graded-frqs` collection and now means "part id". Renaming it would
orphan every already-graded document. It gets a clarifying doc comment, not a
rename.

## Component changes

### Test taking — `src/components/frq/testRenderer.tsx`

Fixes complaints 1 and 2.

- `currentFRQIndex` becomes `currentQuestionIndex`.
- Left pane renders exam `directions`, then the current question's `stimulus`.
- Right pane renders **all** public parts of the current question, stacked: each
  with its label badge, mark-for-review control, prompt, and its own
  `FRQResponseEditor`.
- Header (`:527-528`) and review page (`:444`) read `sectionLabel` /
  `sectionSubtitle`. Fallbacks are the current literals — `"Section II"` and
  `"Free response"` for the header, `"Section II: Free-Response Questions"` for
  the review page — so an unauthored template looks unchanged. Complaint 3.
- The review page groups chips under per-question headings instead of one flat
  A–G row.
- `markedForReview` changes from `Record<number, boolean>` to key by **part id**.
  Index-keyed marks silently rebind to the wrong part when an author reorders;
  that is a latent bug today and stacking parts makes it reachable.
- PDF export headings become `Question {n}, Part {label}`.

### Authoring — `src/components/frq/editorRenderer.tsx`

The highest-risk file in this change.

- Right pane becomes two-level: "Add Question" creates a card holding that
  question's own stimulus editor plus a nested parts accordion with "Add Part".
- Left pane gains section label and subtitle inputs alongside title, visibility,
  time limit, and exam-wide directions.
- `buildTemplatePayload` writes the nested shape; a part's `title` is derived
  from `getPartLabel(partIndex)` *within its question*.
- `editorFooter`'s `parts` prop becomes question-grouped.

**Known hazard.** `AdvancedTextbox` accepts a whole `QuestionFormat[]` plus a
`qIndex` and hands the entire array back on change. The current code already
works around slow uploads clobbering sibling parts (`editorRenderer.tsx:519-533`)
by writing back only the one index. Nesting reintroduces exactly that problem one
level up: each question needs its own stable `QuestionFormat[]` identity, or an
in-flight upload in Question 1 will overwrite edits made to Question 2. This is
the single most likely source of a bug in this work.

### Grading — `src/components/frq/gradingRenderer.tsx`

This page cannot stay as-is: once stimuli vary per question, it can no longer
render one template-level stimulus beside an arbitrary part.

It adopts the same navigation model as feedback — page between questions, stack
that question's parts with their rubrics in the right pane. All three renderers
then behave identically, and a grader sees a whole question's work at once,
which is how a rubric is actually applied. `getTemplatePoints` flattens across
questions.

### Feedback — `src/lib/frq/feedbackDocument.ts`

- `frqs` stops being a hardcoded single-element array (`:73`) and maps
  `template.questions` across, with `question.stimulus` → `FRQQuestion.description`.
- **The feedback UI needs no changes.** `layout.tsx` and `rightSide.tsx` already
  handle N questions with per-question stimuli.
- Small in-scope fix: `feedback/rightSide.tsx:78` uses
  `String.fromCharCode(65 + index)`, which emits punctuation past 26 parts. Swap
  to the existing `getPartLabel` helper.

### FRQ creation — `src/app/admin/subject/[slug]/page.tsx`

Seeds `questions: []` today. It should seed one empty question containing one
empty part, so a newly created FRQ opens in a usable state rather than blank.

This requires `makeId` to move out of `editorRenderer.tsx:70` and into
`src/lib/frq/template.ts`, since the seeded question and part both need real
ids — `normalizeQuestion` drops any entry with no stable id, so a seed without
one would read back as empty.

## Verification

This repository has no test runner. `package.json` defines `build`, `dev`,
`lint`, `start`, `emulate`, and `deploy:rules` only, and there are zero
`.test.` / `.spec.` files. Adding a test framework is out of scope for this
change; the verification below is what is actually available.

- `npm run build` and `npm run lint` for type and lint safety.
- Manual passes against the Firebase emulator:
  1. Author a two-question FRQ with *different* stimuli and differing part counts.
  2. Take it: confirm paging is per-question, parts stack, the left pane stimulus
     changes between questions, and the section heading shows the authored label.
  3. Grade it end to end.
  4. View the student feedback page.
  5. Open a **pre-existing** single-stimulus FRQ and confirm it renders exactly
     as it does today.
- Emulator gotcha carried over from PR #369: it must run with the real project
  ID, or `getDoc` and auth fail silently rather than erroring.

## Delivery sequence

Four PRs, landed strictly in order. Each is independently mergeable because the
read-time normalizer accepts both shapes throughout.

1. Types, `normalizeFrqTemplate`, and the legacy wrap.
2. Authoring editor.
3. Test taking.
4. Grading and feedback.

Sequential rather than parallel: PRs #379–#382 went in out of order and left the
`frq` branch missing merges, which took PR #383 to reconcile.

## Risks

| Risk | Mitigation |
| --- | --- |
| `AdvancedTextbox` array clobbering one level up | Stable per-question array identity; treat as the focus of PR 2's review |
| Legacy documents rendering differently | Template `directions` stays exam-wide, so the legacy path is byte-identical; step 5 of manual verification checks it |
| Reordering rebinding responses | Marks and responses key by part id, never index |
| Merge-order damage repeating | Strict sequential landing |

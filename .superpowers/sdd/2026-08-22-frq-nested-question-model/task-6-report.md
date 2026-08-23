# Task 6 Report: Repoint consumers and restore the build

## Status: COMPLETE

## Commit
`3174bbc0946aa8b5d0ecb0565b4cf4e2a6cc244c` on branch `frq-exam-structure`

7 files changed, 407 insertions(+), 73 deletions(-), exactly matching the
required path list:
- src/types/frq.ts
- src/lib/frq/template.ts
- src/lib/frq/feedbackDocument.ts
- src/components/frq/testRenderer.tsx
- src/components/frq/gradingRenderer.tsx
- src/components/frq/editorRenderer.tsx
- scripts/frq-template.test.ts

Verified with `git show --stat` immediately after committing. `firestore.indexes.json`
remains modified-but-unstaged; `.claude/` and `.worktrees/` remain untracked.
No `git add -A`/`-A .` was used — files were added by explicit path.

## Changes made

### src/components/frq/testRenderer.tsx
- Import `getStudentFacingParts` instead of `getStudentFacingQuestions`.
- `questions` memo now calls `getStudentFacingParts(template)`, with the
  brief's exact comment about PR 1/PR 3.

### src/components/frq/gradingRenderer.tsx
- Import `getAllParts` and `getPartPoints` (replacing `getQuestionPoints`);
  import type `FRQTemplatePart` (replacing the now-unused `FRQTemplateQuestion`).
- `questions` memo now calls `getAllParts(template)` instead of `template?.questions ?? []`.
- `createEmptyGrade`'s parameter type changed from `FRQTemplateQuestion` to
  `FRQTemplatePart` — required because `questions` is now `FRQTemplatePart[]`,
  and `FRQTemplateQuestion` (which requires a `parts` array) is not structurally
  assignable from a part. This wasn't spelled out in the brief's line list but
  was necessary for `tsc --noEmit` to pass; kept mechanical, no other change.
- Replaced the one `getQuestionPoints(currentQuestion)` call site with `getPartPoints(currentQuestion)`.

### src/components/frq/editorRenderer.tsx
- Import `getAllParts`, `getPartPoints`, `LEGACY_QUESTION_ID` (replacing `getQuestionPoints`).
- Import type `FRQTemplatePart` (replacing the now-unused `FRQTemplateQuestion`).
- `createEditorQuestionFromTemplate` parameter type changed from `FRQTemplateQuestion` to `FRQTemplatePart`.
- `buildInitialState` now maps `getAllParts(template)` instead of `template?.questions ?? []`.
- `totalPoints` reduce and the accordion trigger's points label both call `getPartPoints(...)` instead of `getQuestionPoints(...)`, argument shape unchanged.
- `buildTemplatePayload` now writes the **nested** shape: `questions` is a
  single-element array wrapping the editor's flat part list under
  `id: LEGACY_QUESTION_ID`, `stimulus: ""`, `stimulusFiles: []`, `parts: [...]`
  — exactly as specified in the brief, verbatim comment included. This is the
  fix that prevents a save from the current editor silently downgrading a
  document back to the legacy flat shape.
- This also resolved the pre-flagged issue: the file's import of the
  deleted `getQuestionPoints` is gone, replaced everywhere with `getPartPoints`.

### src/lib/frq/feedbackDocument.ts
- Import `getAllParts` from `./template`.
- All three `template.questions.map(...)` call sites (grades' `questions`,
  `response.answers`, and `frqs[0].questions`) now read
  `getAllParts(template).map((part) => ...)`, with the callback parameter
  renamed `question` -> `part` at each site.

## Verification (all four gates green)

```
npm test            -> # tests 15, # pass 15, # fail 0
npx tsc --noEmit     -> exit 0, no output
npm run lint         -> exit 0; only pre-existing warnings in unrelated files
                        (unit.tsx, unitTests.tsx, feedback/page.tsx,
                        peer-grading/grader/page.tsx, ArticleCreator.tsx,
                        AdvancedTextbox.tsx, RenderAdvancedTextbox.tsx,
                        editorjs-render.ts, Renderer.tsx,
                        checkForUnderstanding.tsx, apPortingDefaults.ts);
                        zero warnings in any of the four edited files
npm run build        -> "Compiled successfully", all 23 routes generated, exit 0
```

## Housekeeping
Two zero-byte stray files (`0` and `({,+`) were found sitting in the repo
root before verification began — left over from a prior subagent's unquoted
shell redirection, as the brief warned might happen. Removed with `rm -f`;
never staged.

## Explicitly not done (per instructions)
Step 6 of the brief (manual emulator regression pass) was intentionally
skipped — the controller handles that separately.

## Out of scope (confirmed untouched, per brief)
Per-question stimulus authoring UI, question-level paging/stacked parts,
authored section heading, question-paged grading, multi-entry `frqs` array
in `buildFeedbackDocument`, the `String.fromCharCode` label bug in
`feedback/rightSide.tsx:78`, and seeding UI in
`src/app/admin/subject/[slug]/page.tsx` — none were touched.

### Task 6: Repoint consumers and restore the build

Mechanical. Every change here preserves current behaviour exactly — each screen
receives the same flat part list it does today. PRs 2-4 replace these call sites
with real per-question rendering.

**Files:**
- Modify: `src/components/frq/testRenderer.tsx:10-14,68-71`
- Modify: `src/components/frq/gradingRenderer.tsx:19-21,58,71`
- Modify: `src/components/frq/editorRenderer.tsx:27-32,118-151`
- Modify: `src/lib/frq/feedbackDocument.ts:42,67,82`

**Interfaces:**
- Consumes: `getAllParts`, `getStudentFacingParts`, `getPartPoints`,
  `getTemplatePoints`, `makeId` from Tasks 4 and 5.

- [ ] **Step 1: `testRenderer.tsx`**

Change the import of `getStudentFacingQuestions` to `getStudentFacingParts`, and
change the `questions` memo (lines 68-71) to:

```tsx
  // PR 1 keeps the flat part list so behaviour is unchanged. PR 3 replaces this
  // with per-question paging.
  const questions = useMemo(
    () => (template ? getStudentFacingParts(template) : []),
    [template],
  );
```

- [ ] **Step 2: `gradingRenderer.tsx`**

Change the import of `getQuestionPoints` to `getPartPoints`, add `getAllParts`,
and change line 58 to:

```tsx
  // Grading covers every part the template defines, including ones marked
  // legacy: an older submission may still hold a response to them.
  const questions = useMemo(
    () => (template ? getAllParts(template) : []),
    [template],
  );
```

Replace any `getQuestionPoints(` call with `getPartPoints(`. Its argument is
now an `FRQTemplatePart`, so the inline object literals passed to it (which
supply `id`, `title`, `criteria`) still typecheck unchanged.

- [ ] **Step 3: `editorRenderer.tsx`**

Change the import of `getQuestionPoints` to `getPartPoints`. It has two call
sites — the `totalPoints` reduce (around line 316) and the per-part points label
in the accordion trigger (around line 494). Both pass an inline object literal
of the form `{ id: question.id, title: "", criteria: question.criteria }`, which
already satisfies `FRQTemplatePart`, so only the function name changes:

```tsx
getPartPoints({
  id: question.id,
  title: "",
  criteria: question.criteria,
})
```

Change `buildInitialState` to read the flattened parts:

```tsx
  questions: (template ? getAllParts(template) : []).map(
    createEditorQuestionFromTemplate,
  ),
```

Rename the `createEditorQuestionFromTemplate` parameter type from
`FRQTemplateQuestion` to `FRQTemplatePart`.

`buildTemplatePayload` must now write the **nested** shape, or a save would
downgrade the document back to the legacy form. Change its `questions` property
to wrap the editor's flat list in one question:

```tsx
  // PR 1 authors a single question; PR 2 adds the question-level UI. Wrapping
  // here means a save from the current editor already writes the new shape.
  questions: [
    {
      id: LEGACY_QUESTION_ID,
      stimulus: "",
      stimulusFiles: [],
      parts: state.questions.map((question, index) => ({
        id: question.id,
        title: getPartLabel(index),
        prompt: question.questionData.question.value,
        promptFiles: question.questionData.question.files,
        answerType: question.answerType,
        status: question.status,
        criteria: question.criteria,
      })),
    },
  ],
```

Import `LEGACY_QUESTION_ID` from `@/lib/frq/template`.

- [ ] **Step 4: `feedbackDocument.ts`**

Replace each of the three `template.questions.map(` calls (lines 42, 67, 82)
with `getAllParts(template).map(`, and import `getAllParts` from `./template`.
Rename the `question` parameter to `part` at each site for clarity.

- [ ] **Step 5: Verify the build and tests**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: tests `# pass 13 / # fail 0`; `tsc` clean; lint clean; build succeeds.

- [ ] **Step 6: Manual regression against the emulator**

This PR must be invisible to users, so the check is that nothing changed.

Run `npm run emulate`, then in another shell `npm run dev`. The emulator must
run with the real project ID, or `getDoc` and auth fail silently rather than
erroring.

Confirm, on an FRQ authored **before** this change:
1. The admin editor lists the same parts, with the same labels and points.
2. Saving from the editor succeeds, and reloading shows identical content.
3. Taking the test pages through the same parts with the same stimulus.
4. The grading page shows the same parts and point total.
5. The student feedback page shows the same rubric.

- [ ] **Step 7: Commit**

```bash
git add src/types/frq.ts src/lib/frq/template.ts src/lib/frq/feedbackDocument.ts \
        src/components/frq/testRenderer.tsx src/components/frq/gradingRenderer.tsx \
        src/components/frq/editorRenderer.tsx scripts/frq-template.test.ts
git commit -m "feat: introduce nested FRQ question/part model

Adds FRQTemplatePart and redefines FRQTemplateQuestion as the outer level
owning a parts array, plus authored section label fields.

Documents written under the old flat shape are wrapped into a single
synthetic question at read time, so no backfill is needed and they render
unchanged. Consumers are repointed at a flattening helper, leaving user
visible behaviour identical while PRs 2-4 land per-screen."
```

---

## Out of scope for this PR

Carried by later PRs, listed so a reviewer does not flag them as omissions:

- Per-question stimulus authoring UI (PR 2).
- Question-level paging and stacked parts while taking the test, and the
  authored section heading replacing the hardcoded strings (PR 3).
- Question-paged grading, and `buildFeedbackDocument` emitting a real multi
  entry `frqs` array (PR 4).
- `feedback/rightSide.tsx:78`'s `String.fromCharCode(65 + index)` label bug
  (PR 4).
- Seeding a new FRQ with one question and one part in
  `src/app/admin/subject/[slug]/page.tsx` (PR 2).

### Task 2: Nested types

**Files:**
- Modify: `src/types/frq.ts:25-56`

**Interfaces:**
- Produces: `FRQTemplatePart` (the old `FRQTemplateQuestion` body),
  `FRQTemplateQuestion` (new outer level with `stimulus` / `stimulusFiles` /
  `parts`), and `FRQTemplate.sectionLabel` / `.sectionSubtitle`.

- [ ] **Step 1: Replace the `FRQTemplateQuestion` interface**

Replace lines 25-35 of `src/types/frq.ts` with:

```ts
/** One part — the unit a student writes a single response to. */
export interface FRQTemplatePart {
  /** Stable template-local identifier; never derived from display order. */
  id: string;
  title: string;
  /** Authored prompt text. Files referenced by it live in `promptFiles`. */
  prompt?: string;
  promptFiles?: QuestionFile[];
  answerType?: FRQAnswerType;
  status?: FRQQuestionStatus;
  criteria?: FRQGradingCriterion[];
}

/**
 * One numbered question: its own stimulus plus the parts hanging off it.
 * Part labels restart at A within each question, which is how AP numbers them.
 */
export interface FRQTemplateQuestion {
  /** Stable template-local identifier; never derived from display order. */
  id: string;
  /** Stimulus shown in the left pane while this question is open. */
  stimulus?: string;
  stimulusFiles?: QuestionFile[];
  parts: FRQTemplatePart[];
}
```

- [ ] **Step 2: Add the section fields to `FRQTemplate`**

In the `FRQTemplate` interface, immediately after the `directionsFiles` line,
add:

```ts
  /**
   * Section heading shown while taking the test, e.g. "Section II" or
   * "Section I, Part B". Absent on templates authored before this was
   * configurable, which fall back to the original hardcoded strings.
   */
  sectionLabel?: string;
  sectionSubtitle?: string;
```

- [ ] **Step 3: Update the `FRQQuestionGrade` comment**

`FRQQuestionGrade.questionId` is a stored field and now holds a *part* id.
Renaming it would orphan every document in `graded-frqs`. Replace its line with:

```ts
  /**
   * The id of the FRQTemplatePart this grade covers. Named `questionId`
   * because it is a stored field in `graded-frqs` that predates the
   * question/part split — renaming it would orphan existing documents.
   */
  questionId: string;
```

- [ ] **Step 4: Confirm the expected breakage**

Run: `npx tsc --noEmit`

Expected: FAIL. Errors in `src/lib/frq/template.ts`,
`src/components/frq/testRenderer.tsx`, `editorRenderer.tsx`,
`gradingRenderer.tsx`, and `src/lib/frq/feedbackDocument.ts` complaining about
`prompt`/`criteria` not existing on `FRQTemplateQuestion`.

This breakage is expected and is resolved by Tasks 3-6. **Do not commit yet** —
the tree does not compile. Tasks 2 through 6 land as one commit at the end of
Task 6.

---


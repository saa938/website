# FRQ Nested Question Model — PR 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the `Template → Question → Part` data model and a read-time
wrap for legacy documents, without changing any user-visible behaviour.

**Architecture:** `FRQTemplate.questions` becomes a list of questions, each
owning a `parts` array. `normalizeFrqTemplate` detects the old flat shape and
wraps it into one synthetic question, so stored documents need no backfill.
Every existing consumer is repointed at a new `getStudentFacingParts` /
`getAllParts` flattening helper, so the app behaves exactly as it does today
while the new structure sits underneath, ready for PRs 2–4.

**Tech Stack:** TypeScript, Next.js 14 (App Router), Firebase Firestore,
Node 22 built-in test runner (`node:test`) with native type stripping.

**Spec:** `docs/superpowers/specs/2026-08-21-frq-exam-structure-design.md`

## Global Constraints

- Base branch is the `frq` line, **not** `main` — the FRQ feature was reverted
  from main in PR #377. Current work sits on `frq-exam-structure`.
- No new runtime or dev dependency. `node:test` and `--experimental-strip-types`
  are used because Node 22.16 ships both.
- No user-visible behaviour change in this PR. The taking, authoring, grading,
  and feedback screens must look and act exactly as they do today.
- Stored field names in `ungraded-frqs` and `graded-frqs` are frozen.
  `FRQQuestionGrade.questionId` keeps its name and now means "part id".
- Legacy synthetic question id is the constant `"legacy-question"`. Never
  generated — it is re-derived on every read.
- `npm run build` and `npm run lint` must pass before every commit.

## A note on why this PR touches UI files

The spec sequenced four PRs but did not say how the build stays green between
them. Redefining `FRQTemplateQuestion` breaks compilation in `testRenderer.tsx`,
`editorRenderer.tsx`, `gradingRenderer.tsx`, and `feedbackDocument.ts`, all of
which read `template.questions[].prompt`.

Task 6 therefore repoints those four files at a flattening helper that returns
exactly the flat part list they get today. It is a mechanical change with no
behavioural effect, and it is what lets PRs 2–4 land one screen at a time
instead of as one enormous merge. This is a refinement of the spec's delivery
section, not a departure from it.

## File Structure

- `scripts/frq-template.test.ts` — **new.** Unit tests for the pure helpers in
  `src/lib/frq/template.ts`. This is the repo's first test file.
- `package.json` — **modify.** Add a `test` script.
- `src/types/frq.ts` — **modify.** Add `FRQTemplatePart`, redefine
  `FRQTemplateQuestion`, add section fields to `FRQTemplate`.
- `src/lib/frq/template.ts` — **modify.** Nested normalizer, legacy wrap,
  flattening helpers, `makeId`.
- `src/components/frq/editorRenderer.tsx` — **modify.** Drop local `makeId`;
  repoint at flattening helper.
- `src/components/frq/testRenderer.tsx` — **modify.** Repoint at flattening helper.
- `src/components/frq/gradingRenderer.tsx` — **modify.** Repoint at flattening helper.
- `src/lib/frq/feedbackDocument.ts` — **modify.** Repoint at flattening helper.

---

### Task 1: Test harness

Establishes the first test file in the repo, covering helpers whose behaviour
this PR does *not* change. Locking them down first means Task 3's normalizer
rewrite has a safety net.

**Files:**
- Create: `scripts/frq-template.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getPartLabel`, `hasResponseText`, `normalizeFrqTemplate` from
  `src/lib/frq/template.ts` (all already exported).
- Produces: `npm test` — runs every `scripts/*.test.ts`, exits 1 on failure.

- [ ] **Step 1: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
    "test": "node --test --experimental-strip-types \"scripts/*.test.ts\"",
```

The glob **must** stay quoted. An unquoted glob is expanded by the shell, and a
bare directory argument (`scripts/`) fails on Node 22.16 — it tries to `require`
the directory itself.

- [ ] **Step 2: Write the failing test**

Create `scripts/frq-template.test.ts`. Note the `.ts` extension in the import —
native type stripping runs in ESM mode, which requires explicit extensions.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getPartLabel,
  hasResponseText,
  normalizeFrqTemplate,
} from "../src/lib/frq/template.ts";

test("part labels do not walk off the alphabet", () => {
  assert.equal(getPartLabel(0), "A");
  assert.equal(getPartLabel(25), "Z");
  assert.equal(getPartLabel(26), "AA");
});

test("hasResponseText ignores markup-only responses", () => {
  assert.equal(hasResponseText("<p></p>"), false);
  assert.equal(hasResponseText("<p>&nbsp;</p>"), false);
  assert.equal(hasResponseText("<p>an answer</p>"), true);
  assert.equal(hasResponseText(undefined), false);
});

test("a malformed document degrades instead of throwing", () => {
  const out = normalizeFrqTemplate(null, {
    id: "t1",
    subject: "calc",
    unitId: "u1",
  });

  assert.equal(out.title, "Untitled FRQ");
  assert.equal(out.subject, "calc");
  assert.deepEqual(out.questions, []);
  assert.equal(out.timeLimitMinutes, 90);
});

test("criteria points are clamped to whole non-negative numbers", () => {
  const out = normalizeFrqTemplate(
    {
      questions: [
        {
          id: "p1",
          criteria: [
            { id: "c1", description: "half", points: 1.4 },
            { id: "c2", description: "negative", points: -3 },
            { id: "c3", description: "junk", points: "abc" },
          ],
        },
      ],
    },
    { id: "t1", subject: "calc", unitId: "u1" },
  );

  const criteria = out.questions[0]?.criteria ?? [];

  assert.deepEqual(
    criteria.map((criterion) => criterion.points),
    [1, 0, 0],
  );
});
```

- [ ] **Step 3: Run the tests to confirm they pass against current code**

Run: `npm test`

Expected: `# pass 4`, `# fail 0`, exit 0. These describe behaviour that already
works — if any fails, stop and investigate before changing anything, because the
safety net is wrong.

Note: the runner prints `ExperimentalWarning: Type Stripping is an experimental
feature`. That is expected and harmless.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/frq-template.test.ts
git commit -m "test: add unit tests for FRQ template helpers"
```

---

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

### Task 3: Nested normalizer with legacy wrap

**Files:**
- Modify: `src/lib/frq/template.ts:85-146`

**Interfaces:**
- Consumes: `FRQTemplatePart`, `FRQTemplateQuestion` from Task 2.
- Produces: `LEGACY_QUESTION_ID` constant; `normalizeFrqTemplate` now returning
  nested questions from both stored shapes.

- [ ] **Step 1: Rename `normalizeQuestion` to `normalizePart`**

Replace the existing `normalizeQuestion` function (lines 85-115) with:

```ts
/**
 * The id of the single question that legacy flat documents are wrapped into.
 * A constant rather than a generated id: the wrap is re-derived on every read,
 * so a random id would differ between two reads of the same document.
 */
export const LEGACY_QUESTION_ID = "legacy-question";

const normalizePart = (value: unknown, index: number): FRQTemplatePart[] => {
  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const id = asString(record.id);

  // A part with no stable id cannot be scored or matched to a response, so it
  // is dropped rather than given a positional id that would silently rebind to
  // a different part the next time the author reorders the list.
  if (!id) {
    return [];
  }

  return [
    {
      id,
      title: asString(record.title) || `Part ${index + 1}`,
      prompt: asString(record.prompt),
      promptFiles: normalizeFiles(record.promptFiles),
      answerType: normalizeAnswerType(record.answerType),
      status: normalizeStatus(record.status),
      criteria: normalizeCriteria(record.criteria),
    },
  ];
};

const normalizeQuestion = (value: unknown): FRQTemplateQuestion[] => {
  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const id = asString(record.id);

  if (!id) {
    return [];
  }

  return [
    {
      id,
      stimulus: asString(record.stimulus),
      stimulusFiles: normalizeFiles(record.stimulusFiles),
      parts: Array.isArray(record.parts)
        ? record.parts.flatMap(normalizePart)
        : [],
    },
  ];
};

/**
 * Documents written before the question/part split stored a flat list of parts
 * under `questions`. They are detected by the absence of a `parts` array — a
 * question authored under the new shape always has one, even when empty — and
 * wrapped into a single question so the rest of the app sees one shape.
 *
 * The template's `directions` was already the stimulus those documents used,
 * and it stays exam-wide, so a wrapped document renders exactly as before.
 */
const normalizeQuestions = (value: unknown): FRQTemplateQuestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const isLegacyShape = value.some((entry) => {
    const record = asRecord(entry);

    return record !== null && !Array.isArray(record.parts);
  });

  if (!isLegacyShape) {
    return value.flatMap(normalizeQuestion);
  }

  const parts = value.flatMap(normalizePart);

  return parts.length > 0
    ? [
        {
          id: LEGACY_QUESTION_ID,
          stimulus: "",
          stimulusFiles: [],
          parts,
        },
      ]
    : [];
};
```

- [ ] **Step 2: Wire the new normalizer and section fields into `normalizeFrqTemplate`**

Inside `normalizeFrqTemplate`, replace the `questions:` property with:

```ts
    questions: normalizeQuestions(record.questions),
```

and add these two properties immediately after `directionsFiles`:

```ts
    sectionLabel: asString(record.sectionLabel),
    sectionSubtitle: asString(record.sectionSubtitle),
```

- [ ] **Step 3: Write the failing tests**

Append to `scripts/frq-template.test.ts`:

```ts
test("a legacy flat document is wrapped into one question", () => {
  const out = normalizeFrqTemplate(
    {
      title: "Legacy FRQ",
      directions: "Old stimulus",
      questions: [
        { id: "p1", prompt: "Part one" },
        { id: "p2", prompt: "Part two" },
      ],
    },
    { id: "t1", subject: "calc", unitId: "u1" },
  );

  assert.equal(out.questions.length, 1);
  assert.equal(out.questions[0]?.id, "legacy-question");
  assert.equal(out.questions[0]?.stimulus, "");
  assert.deepEqual(
    out.questions[0]?.parts.map((part) => part.id),
    ["p1", "p2"],
  );
  // Exam-wide directions are untouched, which is what makes the legacy render
  // byte-identical to today.
  assert.equal(out.directions, "Old stimulus");
});

test("the legacy wrap id is stable across reads", () => {
  const raw = { questions: [{ id: "p1", prompt: "Part one" }] };
  const identity = { id: "t1", subject: "calc", unitId: "u1" };

  assert.equal(
    normalizeFrqTemplate(raw, identity).questions[0]?.id,
    normalizeFrqTemplate(raw, identity).questions[0]?.id,
  );
});

test("a nested document is read as authored", () => {
  const out = normalizeFrqTemplate(
    {
      title: "Nested FRQ",
      sectionLabel: "Section I, Part B",
      sectionSubtitle: "Short answer",
      questions: [
        {
          id: "q1",
          stimulus: "Graph A",
          parts: [{ id: "p1", prompt: "Part one" }],
        },
        { id: "q2", stimulus: "Table B", parts: [] },
      ],
    },
    { id: "t1", subject: "calc", unitId: "u1" },
  );

  assert.equal(out.questions.length, 2);
  assert.equal(out.questions[0]?.stimulus, "Graph A");
  assert.deepEqual(
    out.questions[0]?.parts.map((part) => part.id),
    ["p1"],
  );
  // An empty parts array is still the new shape, not a legacy document.
  assert.deepEqual(out.questions[1]?.parts, []);
  assert.equal(out.sectionLabel, "Section I, Part B");
  assert.equal(out.sectionSubtitle, "Short answer");
});

test("parts with no stable id are dropped in both shapes", () => {
  const identity = { id: "t1", subject: "calc", unitId: "u1" };

  const legacy = normalizeFrqTemplate(
    { questions: [{ id: "p1" }, { prompt: "no id" }] },
    identity,
  );

  const nested = normalizeFrqTemplate(
    { questions: [{ id: "q1", parts: [{ id: "p1" }, { prompt: "no id" }] }] },
    identity,
  );

  assert.deepEqual(
    legacy.questions[0]?.parts.map((part) => part.id),
    ["p1"],
  );
  assert.deepEqual(
    nested.questions[0]?.parts.map((part) => part.id),
    ["p1"],
  );
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test`

Expected: `# pass 8`, `# fail 0`.

The `criteria are clamped` test from Task 1 reads `out.questions[0]?.criteria`,
which no longer exists on the nested type. Update that assertion to read
`out.questions[0]?.parts[0]?.criteria` and re-run.

---

### Task 4: Flattening and points helpers

**Files:**
- Modify: `src/lib/frq/template.ts:156-170`

**Interfaces:**
- Produces: `getAllParts(template): FRQTemplatePart[]`,
  `getStudentFacingParts(template): FRQTemplatePart[]`,
  `getStudentFacingQuestions(template): FRQTemplateQuestion[]`,
  `getPartPoints(part): number`, `getTemplatePoints(parts): number`.

- [ ] **Step 1: Replace the helper block**

Replace `getStudentFacingQuestions`, `getQuestionPoints`, and
`getTemplatePoints` with:

```ts
/** Every part in the document, in reading order, ignoring visibility. */
export const getAllParts = (template: FRQTemplate): FRQTemplatePart[] =>
  template.questions.flatMap((question) => question.parts);

/** Parts a student actually sits. Legacy parts stay readable but unassigned. */
export const getStudentFacingParts = (
  template: FRQTemplate,
): FRQTemplatePart[] =>
  getAllParts(template).filter((part) => part.status !== "legacy");

/**
 * Questions a student actually sits, each carrying only its visible parts.
 * A question whose parts are all legacy is dropped, so the test never pages to
 * a question with nothing on it.
 */
export const getStudentFacingQuestions = (
  template: FRQTemplate,
): FRQTemplateQuestion[] =>
  template.questions
    .map((question) => ({
      ...question,
      parts: question.parts.filter((part) => part.status !== "legacy"),
    }))
    .filter((question) => question.parts.length > 0);

export const getPartPoints = (part: FRQTemplatePart) =>
  (part.criteria ?? []).reduce(
    (total, criterion) => total + criterion.points,
    0,
  );

export const getTemplatePoints = (parts: FRQTemplatePart[]) =>
  parts.reduce((total, part) => total + getPartPoints(part), 0);
```

- [ ] **Step 2: Write the failing tests**

Add `getAllParts`, `getStudentFacingParts`, `getStudentFacingQuestions`, and
`getTemplatePoints` to the **existing** import from `../src/lib/frq/template.ts`
at the top of `scripts/frq-template.test.ts` — do not add a second import block
from the same path, which `no-duplicate-imports` will reject.

Then append:

```ts
const twoQuestionTemplate = () =>
  normalizeFrqTemplate(
    {
      questions: [
        {
          id: "q1",
          parts: [
            {
              id: "p1",
              criteria: [{ id: "c1", description: "x", points: 2 }],
            },
            { id: "p2", status: "legacy" },
          ],
        },
        {
          id: "q2",
          parts: [
            {
              id: "p3",
              criteria: [{ id: "c2", description: "y", points: 3 }],
            },
          ],
        },
        { id: "q3", parts: [{ id: "p4", status: "legacy" }] },
      ],
    },
    { id: "t1", subject: "calc", unitId: "u1" },
  );

test("getAllParts flattens in reading order and keeps legacy parts", () => {
  assert.deepEqual(
    getAllParts(twoQuestionTemplate()).map((part) => part.id),
    ["p1", "p2", "p3", "p4"],
  );
});

test("getStudentFacingParts drops legacy parts", () => {
  assert.deepEqual(
    getStudentFacingParts(twoQuestionTemplate()).map((part) => part.id),
    ["p1", "p3"],
  );
});

test("getStudentFacingQuestions drops questions with no visible parts", () => {
  const questions = getStudentFacingQuestions(twoQuestionTemplate());

  assert.deepEqual(
    questions.map((question) => question.id),
    ["q1", "q2"],
  );
  assert.deepEqual(
    questions[0]?.parts.map((part) => part.id),
    ["p1"],
  );
});

test("getTemplatePoints sums across questions", () => {
  assert.equal(getTemplatePoints(getAllParts(twoQuestionTemplate())), 5);
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`

Expected: `# pass 12`, `# fail 0`.

---

### Task 5: Relocate `makeId`

`makeId` currently lives in `editorRenderer.tsx:70`. The FRQ creation path in
`src/app/admin/subject/[slug]/page.tsx` needs it too (in PR 2, to seed a
question and part with real ids — `normalizePart` drops any entry lacking one).
Shared helpers belong in the lib.

**Files:**
- Modify: `src/lib/frq/template.ts`, `src/components/frq/editorRenderer.tsx:65-73`

**Interfaces:**
- Produces: `makeId(prefix: string): string` exported from
  `src/lib/frq/template.ts`.

- [ ] **Step 1: Add `makeId` to the lib**

Append to `src/lib/frq/template.ts`:

```ts
/**
 * Unique, immutable ID built from the current time plus a short random suffix.
 * The random half is what makes it collision-safe: a timestamp alone repeats
 * when several IDs are minted in the same millisecond.
 */
export const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
```

- [ ] **Step 2: Remove the duplicate from the editor**

Delete the `makeId` definition at `src/components/frq/editorRenderer.tsx:65-73`
and add `makeId` to the existing import from `@/lib/frq/template`.

- [ ] **Step 3: Write the failing test**

Append to `scripts/frq-template.test.ts` (add `makeId` to the lib import):

```ts
test("makeId is prefixed and collision-safe within a millisecond", () => {
  const ids = new Set(
    Array.from({ length: 500 }, () => makeId("part")),
  );

  assert.equal(ids.size, 500);
  assert.ok([...ids].every((id) => id.startsWith("part-")));
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test`

Expected: `# pass 13`, `# fail 0`.

---

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

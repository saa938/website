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


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


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


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


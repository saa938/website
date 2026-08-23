# PR Review: #365 — Fix FRQ Firestore collection paths

**Reviewed**: 2026-08-12 (round 3 — re-review after author's fix)
**Previous reviews**: 2026-08-09 (round 1), 2026-08-10 (round 2)
**Author**: xylinadelgado
**Branch**: `fix/frq-firestore-paths` → `frq` (upstream: AP-Students/website)
**Head**: `8a9f277` — "Restore FRQ grading list implementation"
**Mode**: Local review only (no GitHub comments/review posted, matching rounds 1–2)
**Decision**: APPROVE

## What changed since round 2

One new commit, touching exactly one file:

| Commit | Files |
|---|---|
| `8a9f277` | `src/app/frq-grading/page.tsx` (35 insertions, 37 deletions) |

`firestore.rules` and everything else verified in round 2 is untouched.

## Round-2 findings status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `/frq-grading` list page was a byte-identical copy of `/frq-grading/[id]` | CRITICAL | **FIXED** |
| 2 | No migration/cleanup for data left in the three removed collections | MEDIUM | Still open (unchanged, not in scope of this commit) |
| 3 | `firestore.rules` indentation broken in two new blocks | LOW | Still open (unchanged, not in scope of this commit) |
| 4 | 4 files newly fail `prettier --check` | LOW | Partially — see new finding below |

## Findings

### LOW

**1. `src/app/frq-grading/page.tsx:14` has a stray-indentation glitch that fails `prettier --check`**

```tsx
const collectionRef = getUngradedFrqsCollectionRef();
      const snapshot = await getDocs(     // 12 spaces instead of 6
  query(collectionRef, orderBy("submittedAt", "desc")),
);
```

`npx prettier --check src/app/frq-grading/page.tsx` fails on this file. Not a regression in
substance — the file already failed prettier before this commit (round-2 finding #4) — but the
specific line has changed. CI only runs `npm run build`, so this doesn't block. `npx prettier
--write src/app/frq-grading/page.tsx` clears it.

**2. Fetch failure and "zero results" render the same empty state**

`fetchFrqs().catch(() => setFrqIds([]))` means a permission-denied or network error renders
"No ungraded FRQs found." — indistinguishable from an actually-empty queue. Minor UX nit, not
blocking; the error is still logged via `console.error`.

### Notes (unchanged from round 2, not blocking)

- No migration for documents possibly left in the three removed collections
  (`frqTemplates`, `gradableFrqSubmissions`, `gradedFrqSubmissions`). Worth confirming against
  production before merge.
- `firestore.rules` indentation in the `ungraded-frqs`/`graded-frqs` blocks is inconsistent with
  the rest of the file.
- `gradingRenderer.tsx`'s `StudentResponsePanel` still receives unused props (pre-existing,
  3 lint warnings).
- `/frq-feedback/[id]` still renders mock data instead of the stored grade (out of scope, noted
  in-file).

## Verification performed

**Code review**: `src/app/frq-grading/page.tsx` now queries `getUngradedFrqsCollectionRef()`
ordered by `submittedAt desc` and renders a `<Link href={`/frq-grading/${id}`}>` per result —
exactly the fix recommended in the round-2 report. No other files touched; no leftover unused
imports.

**Build**: `npm run build` — all 30 routes generate. `/frq-grading` and `/frq-grading/[id]` now
compile to genuinely different bundles (1.27 kB / 228 kB vs. 8.21 kB / 263 kB First Load JS),
confirming they're no longer identical (round-2's evidence for the bug was the opposite: both
routes compiled to ~495 B).

**Type check**: `npx tsc --noEmit` — 0 errors.

**Lint**: `npm run lint` — 0 errors, 16 warnings, identical set to round 2 (all pre-existing,
none newly introduced by this commit).

**Live emulator rule test** (new this round, since the previous 10 test cases used `get`/`count`,
not an ordered `list` query): seeded two `ungraded-frqs` docs via
`@firebase/rules-unit-testing` with `withSecurityRulesDisabled`, then ran the exact client query
the new page issues:

```js
query(collection(db, "ungraded-frqs"), orderBy("submittedAt", "desc"))
```

| Actor | Result |
|---|---|
| Admin (`users/{uid}.access == "admin"`) | **ALLOW** — 2 docs returned, correctly ordered newest-first |
| Student (own submission only, unconstrained query) | **DENY** — matches round-2's expectation that an unconstrained list can't be proven safe per-doc |

Both match the rule semantics `firestore.rules` already had before this commit (`allow get, list:
if isGraderOrAdmin() || ...`), which round 2 verified independently. This confirms the new query
shape doesn't hit an edge case the earlier rule tests didn't cover.

## Validation Results

| Check | Result |
|---|---|
| Type check (`npx tsc --noEmit`) | Pass — 0 errors |
| Lint | Pass — 0 errors, 16 warnings (all pre-existing) |
| Build (`npm run build`) | Pass — all 30 routes generate |
| Prettier | Fail — same file as round 2, different line (LOW, non-blocking) |
| Live emulator rules test (admin list query) | Pass |
| Live emulator rules test (student list denied) | Pass |

## Files Reviewed

| File | Change |
|---|---|
| `src/app/frq-grading/page.tsx` | Modified — **the fix** |

(All other files carried over unchanged from round 2's review, already verified there.)

## Bottom line

The one remaining blocker from round 2 is fixed, matches the exact fix recommended, and is now
verified at the code, build, and security-rules layers. Nothing else in the PR changed. Ready to
merge.

# PR Review: #367 — Fix admin dashboard spacing

**Reviewed**: 2026-08-11
**Author**: phew1
**Branch**: `fix-admin-dashboard-spacing` → `frq`
**Issue**: #358 (INTERN - Fix Admin Dashboard spacing)
**Decision**: **APPROVE** (local review only — nothing posted to GitHub)

## Summary

The fix is correct, minimal, and fully solves issue #358. Verified empirically in a
browser: the gap between the Ungraded FRQs card and the Check Feedback & Bug Reports
button goes from **0px → 16px**, exactly matching the 16px already used by the Change
User Role card above it. Typecheck, lint, and build all pass.

The one thing a reviewer must know up front: **GitHub displays this PR as 35 files /
+3,971 lines.** That is a merge-base artifact, not the real change. Merging into `frq`
touches **exactly one file** (`src/app/admin/page.tsx`, 22 insertions / 23 deletions).
See "Diff-size artifact" below before reading the GitHub diff.

## Verification performed

Ran in an isolated worktree at PR head (`a486191`) with a temporary harness page that
reproduced the `/admin` flex column's exact direct-children structure (the real page
needs an authenticated admin, so the layout was measured without auth). Measured with
`getBoundingClientRect()` against the real compiled Tailwind CSS.

Consecutive vertical gaps in the admin dashboard's `flex flex-col` container:

| Element pair | Before (frq) | After (PR #367) |
|---|---|---|
| `h1 Admin Dashboard` → `Change User Role` label | 0px | 0px |
| `Change User Role` label → its card | 0px | 0px |
| Change User Role card → **Ungraded FRQs card** | 16px | 16px |
| **Ungraded FRQs card → Check Feedback button** | **0px** ← the bug | **16px** ← fixed |
| Check Feedback button → `Select AP Course` | ~24px (`<br>`) | ~24px (`<br>`) |

The parent container's computed `row-gap` is `normal` (no flex `gap`), so `mb-4` is the
correct mechanism here and does not compound with a container gap.

## Issue #358 — acceptance check

> Add spacing between the Ungraded FRQs element and the Feedback/Bug Reports element.
> This spacing should be consistent with the other spacing on this page.

- Spacing added: 0px → 16px. **Met.**
- Consistent with other spacing: `mb-4` (16px) is the same value the Change User Role
  card directly above uses, so the two card gaps are now identical. **Met.**

**Issue #358 is fully solved.**

## Diff-size artifact (read before the GitHub diff)

The PR head has only 2 commits ahead of `frq`:

```
a486191  fix: add spacing below Ungraded FRQs card on admin dashboard   <- the real change
54de970  Merge upstream/main                                            <- verified trivial
```

`frq` and the PR head have **two** merge bases (`1c8f7f7`, `9873e10`) because the author
branched off `frq` at `9873e10` and then merged `upstream/main`. GitHub picked the *main*
merge base, so all the pre-existing FRQ work on the branch renders as "added" in the
displayed diff.

Checks run to confirm the real impact:

- `git merge-tree upstream/frq upstream/pr-367` → **clean, no conflicts**.
- Merged result vs `frq` tip → **1 file changed**: `src/app/admin/page.tsx` (+22/−23),
  byte-identical to the PR head's version.
- `frq`-only work confirmed **preserved** by the 3-way merge, not reverted:
  `src/app/subject/[slug]/(sidebar)/page.tsx`, `src/components/subject/unit-accordion.tsx`,
  `src/types/firestore.ts`.
- Merge commit `54de970` re-derived from its parents produces the **identical tree**
  (`14c6e6c`) → trivial merge, no hand edits / no evil merge.

Base branch `frq` is **correct**: the Ungraded FRQs card does not exist on `main` at all
(it arrived via PR #346 on `frq`), so this could not target `main`.

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **PR description has an unfilled issue placeholder** — `src/app/admin/page.tsx` n/a,
   PR body. The body says `Closes #<issue number>` with the placeholder never replaced,
   so merging will **not** auto-close #358 and GitHub shows no link between them.
   *Fix*: change to `Closes #358`.

2. **`<br></br>` still used as a spacer** — `src/app/admin/page.tsx:105`. Pre-existing,
   not introduced here. It yields ~24px, the one gap still off the page's 16px rhythm.
   Replacing it with `className="mb-4"` on the preceding `Link` would make the whole
   column consistent. Out of scope for #358 (which asks only about the FRQ-card gap) —
   noted as an optional follow-up.

3. **Adjacent mis-indented hook block left untouched** — `src/app/admin/page.tsx:30-50`.
   The `useState`/`useEffect` block sits at column 0 instead of 2-space component indent.
   Pre-existing on `frq` (arrived with PR #346), and this PR did tidy the card's
   indentation right below it. Since `prettier` is already a devDependency, running it on
   this file would clean both up. Optional.

### Positive notes

- Merging the two adjacent `{user.access === "admin" && (...)}` conditionals into one is
  a genuine simplification and is **behavior-preserving** — both blocks tested the same
  expression in the same render pass.
- `Select AP Course` and the feedback link correctly remain **outside** the admin
  conditional, so members and graders still see them. The PR description's claim on this
  is accurate (verified at lines 100-106).
- `mb-4` applies at every breakpoint, matching the Change User Role card, so the mobile
  (`flex-col`) and desktop (`sm:flex-row`) layouts both stay consistent.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | **Pass** (exit 0, no errors) |
| Lint (`npm run lint`) | **Pass** (warnings only, all pre-existing, none in `admin/page.tsx`) |
| Build (`npm run build`) | **Pass** (all 33 routes compiled; `/admin` 8.19 kB) |
| Tests | **Skipped** — repo has no test script/suite |
| Runtime layout verification | **Pass** (measured 0px → 16px in Chrome) |
| Merge into `frq` | **Clean**, 1 file changed, no regressions |

## Files Reviewed

| File | Change | Note |
|---|---|---|
| `src/app/admin/page.tsx` | Modified (+22/−23) | The entire real change |

The other 34 files in GitHub's displayed diff are pre-existing `frq`/`main` content
surfaced by the merge-base artifact described above; none are modified by this PR
relative to `frq`.

## Recommendation

**Approve and merge.** Ask the author to fill in `Closes #358` in the PR description
first so the issue links and closes automatically. The two `<br>`/indentation nits are
pre-existing and safe to leave or fold into a follow-up.

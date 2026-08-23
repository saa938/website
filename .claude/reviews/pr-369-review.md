# PR Review: #369 — Ungraded FRQ List UI

**Reviewed**: 2026-08-11 (round 1), **updated 2026-08-15 (round 2)**
**Author**: Apurva-26 (Apurva Srimat Kandala)
**Branch**: `ungraded-frq-list-ui` → `frq`
**Closes**: #356 — INTERN - Build the Ungraded List Page
**Decision**: **APPROVE** (round 2) — the round-1 HIGH blocker is fixed and verified; remaining items are MEDIUM/LOW, non-blocking
**Review mode**: local only — nothing posted to GitHub

## Round 2 update (2026-08-15)

Commit `ec8defae` ("malformed submission document blanking everything problem
fixed") directly addresses **HIGH-1** below. I re-tested against the emulators
with the same repro cases plus three more (array-typed `responses`, missing
`templateId`, `templateId` pointing at a nonexistent template doc):

| Seeded malformed doc | Round 1 result | Round 2 result |
|---|---|---|
| no `responses` field | Page blanked, 0 rows | Renders, flagged "Malformed submission", Grade disabled, delete works |
| `submittedAt: null` | Page blanked, 0 rows | Renders, "Submitted" shows "Unknown", flagged, delete works |
| `responses` is an array | not tested in round 1 | Renders, flagged, `Object.keys` guard holds |
| `templateId` missing | not tested in round 1 | Renders as "Unknown FRQ", flagged, delete works |
| `templateId` → nonexistent template doc | not tested in round 1 | Renders as "Unknown FRQ", flagged, delete works |

All 5 malformed rows rendered alongside 5 well-formed rows in one 10-row page
— no crash, no blank page. I deleted the `submittedAt: null` row through the
UI: confirmation dialog showed correctly, the row disappeared, and the header
count decremented from (10) to (9) live. This directly satisfies #356's
"admins must be able to delete spam/joke FRQs" requirement even in the
malformed-data case that used to defeat it.

The fix goes beyond the one-liner I suggested in round 1 — it validates each
field's type independently (`templateId`, `studentId`, `submittedAt`,
`responses`), visually flags the row (red background + "Malformed submission"
label), and disables the "Grade" link entirely instead of leaving a route that
would 404 or crash on real data. This is a better outcome than my suggested
fix would have produced.

**Not part of this round, still open from round 1** (all non-blocking
MEDIUM/LOW, unchanged by commit `ec8defae`): MED-1 (generic catch-all error
state), MED-2 (no route-level access gate), MED-3 (N+1 template reads), MED-4
(deleting the last row of a page strands the pager), MED-5 (file still fails
`npx prettier --check`, re-confirmed this round). None of these affect
whether #356 is solved; they're worth a fast-follow but shouldn't hold up this
PR.

### Round 2 validation

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass |
| Format (`prettier --check`) | Fail (pre-existing MED-5, unchanged) |
| Build (`next build`) | Pass — `/frq-grading` 8 kB / 263 kB First Load |
| Lint (`eslint`) | Skipped — nested-worktree plugin-resolution conflict (environment artifact, not a PR issue) |
| Manual E2E (emulators + browser) | Run; malformed-doc repros above, delete-of-malformed-row confirmed end to end |

## Round 1 summary

The feature works. I ran it against the Firebase emulators with a seeded admin
account, 3 FRQ templates and 65 submissions, and every acceptance criterion in
#356 is met: the table renders all ungraded FRQs with identifying info, the
header shows a live total, pagination works correctly across pages (including
after deletions), and delete is gated behind a proper confirmation dialog.

One blocker: a single malformed submission document blanks the entire page, so
the admin cannot see *or delete* anything — which defeats the "delete spam/joke
submissions" purpose the delete button exists for. Two confirmed repros below.
**Fixed and re-verified in round 2 above.**

## Issue #356 acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Clean, readable UI (Lermonade to approve) | Met — pending your sign-off | Screenshots; no page-level horizontal overflow at 390px |
| Displays all ungraded FRQs + identifying info | Met | 60 rows/page, 65 total reachable; FRQ title, FRQ (template) ID, subject·unit, submission ID, test-taker UID, submitted-at, response count |
| Admins can delete FRQs | Met, with caveat | Delete + "Are you sure?" dialog verified end-to-end; blocked by HIGH-1 when a malformed doc exists |
| Displays ungraded FRQ count | Met | `getCountFromServer` total in header; decrements on delete |

## Findings

### CRITICAL
None.

### HIGH

**HIGH-1 — One malformed submission blanks the whole page (`src/app/frq-grading/page.tsx:261,264`) — FIXED in `ec8defae`, verified round 2**

`frq.submittedAt.toDate()` and `Object.keys(frq.responses).length` are called on
unvalidated data cast with `submissionDoc.data() as GradableFRQSubmission`. A
single bad document throws during render and React unmounts the entire tree —
not one broken row, a blank white page.

Both confirmed against the emulator:

| Seeded doc | Result |
|---|---|
| submission with no `responses` field | `Cannot convert undefined or null to object`; `document.body` empty, 0 rows |
| submission with `submittedAt: null` | `Cannot read properties of null (reading 'toDate')`; `document.body` empty, 0 rows |

Removing the bad doc out-of-band restored the page (60 rows), confirming the doc
is the sole cause. The security rules require both fields on the client create
path, but they do not cover Admin-SDK writes, console/script writes, or a
pending `serverTimestamp()` resolving to null — and `testRenderer.tsx:262`
writes `submittedAt: serverTimestamp()`.

Why this blocks: issue #356 asks for delete specifically to "help admins deal
with spam/joke FRQ submissions." A junk doc that crashes the page makes it
undeletable through this UI.

Fix — guard both reads and let the bad row render as a deletable row:

```tsx
const submittedAtLabel = frq.submittedAt?.toDate?.().toLocaleString() ?? "Unknown";
const responseCount = Object.keys(frq.responses ?? {}).length;
```

### MEDIUM

**MED-1 — Every error renders as "No ungraded FRQs found" (`page.tsx:96-99, 115-121`)**

Both catch blocks call `setFrqs([])`, so a permission error, a network blip or a
missing index all display the empty-queue message. A grader hitting a transient
failure sees "No ungraded FRQs found." and reasonably concludes the queue is
clear. Track an `error` state and render a distinct failure message with a retry.

**MED-2 — No route-level access gate (`page.tsx`, whole file)**

Verified: signed-out visitors and `access: "user"` accounts both load
`/frq-grading` and see the full admin chrome — "Ungraded FRQs (—)", the empty
state, and pagination controls. Firestore rules correctly deny the data (403 on
`RunAggregationQuery`), so this is not a data leak, but it is inconsistent with
`/admin/page.tsx:60-62`, which redirects `access === "user"` to `/`. Mirror that
pattern, or add a `layout.tsx` gate for the route.

**MED-3 — N+1 template reads, one `getDoc` per row (`page.tsx:76-94`)**

Each row issues its own `getDoc(doc(db, "frqTemplates", templateId))` with no
deduplication. On my dataset that is 60 document reads per page load for 3
distinct templates — 20× amplification, and it scales with `PAGE_SIZE`, not with
the number of templates. (The reads multiplex onto ~5 WebChannel requests, so
this is invisible in devtools but still 60 billable reads.) Dedupe before
fetching:

```tsx
const templateIds = [...new Set(pageDocuments.map((d) => d.data().templateId))];
const templates = new Map(
  await Promise.all(templateIds.map(async (id) => [id, (await getDoc(doc(db, "frqTemplates", id))).data() ?? null])),
);
```

**MED-4 — Deleting the last row of a page strands the admin on a contradictory empty page**

Confirmed: after deleting every row on page 2, the page reads "Ungraded FRQs
(59)" directly above "No ungraded FRQs found." with the pager still on Page 2.
When a delete empties the current page and `pageIndex > 0`, step back a page (or
refetch the current cursor).

**MED-5 — File is no longer Prettier-clean**

`npx prettier --check src/app/frq-grading/page.tsx firebase.json` fails on both
changed files; the pre-PR version of `page.tsx` passed. Indentation is
inconsistent in places (`handleNextPage`/`handlePreviousPage` sit at column 0
while the sibling handlers are indented; the JSX return block is misaligned).
`npx prettier --write` on the two files clears it.

### LOW

- **LOW-1 — Unrelated change**: the `firebase.json` edit (reformat +
  `singleProjectMode: true`) is a local emulator convenience unrelated to the
  feature. Harmless, but it widens the diff.
- **LOW-2 — a11y**: `<th>` elements lack `scope="col"`. The Radix dialog itself
  is fine — I verified keyboard open, focus landing on Cancel, and Escape to
  close.
- **LOW-3 — Not a finding, checked**: `window.alert` on delete failure matches
  existing convention (`testRenderer.tsx`, `admin/subject/[slug]/page.tsx`).
- **LOW-4 — No tests**: the repo has no test runner configured, so this is not
  actionable for this PR.

## Verified as working (no action needed)

- **Cursor stability across deletes** — I deleted the exact document serving as
  `pageEndCursor`, then paged forward. Page 2 was unchanged with zero duplicates;
  `startAfter(snapshot)` reads the snapshot's sort values, so a deleted cursor is
  safe.
- **Back-navigation** — `pageCursors` correctly returns to page 1 with identical
  contents.
- **Missing template degradation** — a submission pointing at a nonexistent
  template renders "Unknown FRQ / Unknown subject · Unknown unit" instead of
  failing.
- **Header count semantics** — stays the collection total while paging, which is
  what #356 asks for.
- **Mobile** — table scrolls inside its own container; no page-level horizontal
  overflow at 390px.

## Pre-existing branch issue (not this PR)

The `frq` branch has a split template schema. The admin authoring UI writes to
top-level `frqTemplates` (`admin/subject/[slug]/page.tsx:218`), while the
user-facing test pages read `subjects/{slug}/units/{unit}/frqs`
(`subject/[slug]/(sidebar)/page.tsx:59`). Nothing in the codebase writes the
nested path, so no submission can currently be produced through the UI — which
is why this PR must be tested with seeded data. PR #369 reads `frqTemplates`,
matching where templates actually exist today, so it is on the correct side of
this. Worth resolving on the branch separately.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass |
| Lint (`eslint` on changed files) | Pass |
| Format (`prettier --check`) | **Fail** — both changed files |
| Build (`next build`) | Pass — `/frq-grading` 7.7 kB / 263 kB First Load |
| Tests | N/A — no test runner in the repo |
| Manual E2E (emulators + Playwright) | Run; results above |

Repo-wide note: 45 files under `src/app` already fail `prettier --check`, so the
repo is not uniformly formatted — but this file regressed from clean to unclean.

## Files Reviewed

| File | Change | Notes |
|---|---|---|
| `src/app/frq-grading/page.tsx` | Modified (+355/−32) | Full rewrite of the list page |
| `firebase.json` | Modified | Reformat + `singleProjectMode: true` |

## Test Environment

Firestore + Auth emulators on a demo project, seeded with an admin, a grader and
a plain user; 3 FRQ templates; 65 submissions (one deliberately pointing at a
missing template). The app has no emulator wiring committed
(`src/lib/firebase.ts` has no `connectFirestoreEmulator`), so that was added
temporarily for testing and reverted. Worktree
`.worktrees/pr-369-review` is back at the PR head with no local modifications.

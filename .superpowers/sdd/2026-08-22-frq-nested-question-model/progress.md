# SDD ledger — plan: C:/Users/ashay/AppData/Local/Temp/claude/C--Users-ashay-website/71008dfc-721b-4ffa-b0b6-db94cf61ccdd/scratchpad/frq-docs/2026-08-22-frq-nested-question-model.md

Spec: .../scratchpad/frq-docs/2026-08-21-frq-exam-structure-design.md (read)
Branch: frq-exam-structure, base a1398f7
User directives: commit at checkpoints; plan/spec docs must NOT be committed;
junk files deleted (done, 20 zero-byte shell artifacts); test the app at the end.

## Pre-flight conflict scan

Cross-task pairs sharing a file or interface:

| Pair | Produces -> Consumes | Finding |
|---|---|---|
| T1 -> T3,T4,T5 | creates `scripts/frq-template.test.ts`; T3/T4/T5 append tests | OK, sequential appends |
| T2 -> T3 | `FRQTemplatePart`/`FRQTemplateQuestion` -> normalizePart/normalizeQuestion | OK |
| T2 -> T4 | types -> flattening helpers | OK |
| T2 -> T6 | types -> 4 consumer files | OK (breakage is intended, T6 resolves) |
| T3 -> T4 | nested `normalizeFrqTemplate` output -> helpers | OK |
| T3 -> T6 | `LEGACY_QUESTION_ID` -> editorRenderer buildTemplatePayload | OK |
| T4 -> T6 | getAllParts/getStudentFacingParts/getPartPoints/getTemplatePoints -> consumers | OK |
| T5 -> T6 | `makeId` in lib -> editorRenderer import | OK, both edit editorRenderer sequentially |

Per-task self-consistency:

| Task | Finding |
|---|---|
| T1 | Self-consistent. Tests target current (pre-change) behaviour. |
| T1/T3 | CONFLICT: T1's "criteria are clamped" test reads `out.questions[0]?.criteria`, which stops existing at T2. T3 Step 4 explicitly updates it to `...parts[0]?.criteria`. |
| T2 | Self-consistent. Explicitly leaves tree non-compiling; no commit. |
| T3 | Self-consistent. Exports LEGACY_QUESTION_ID used by T6. |
| T4 | Self-consistent. Removes getQuestionPoints, adds getPartPoints; T6 updates both call sites. |
| T5 | Self-consistent. |
| T6 | Self-consistent. Only task that restores a compiling tree. |

Ruling: T1/T3 test-update conflict is intended sequencing, already handled by
T3 Step 4 — no plan change. Cost if wrong: one failing test at T3, caught by
`npm test` in that task.

Ruling: Tasks 2-5 batched into ONE dispatch. All four edit only
`src/types/frq.ts` + `src/lib/frq/template.ts`, all carry complete code in the
plan, and none can be committed separately (tree does not compile until T6).
Batching matches the skill's same-shape guidance. Cost if wrong: one larger
review surface instead of four small ones.

Ruling: commits land after T1 and after T6 only, per plan and confirmed to
user. Tasks 2-5 leave `tsc` failing by design, so committing there would put a
non-building commit on the branch. Cost if wrong: coarser history than the
user's "commit at each checkpoint" implies; both commits are still atomic and
green.

Note: after Tasks 2-5 the tree does NOT typecheck, but `npm test` DOES run —
type stripping does not typecheck, and `src/lib/frq/template.ts` has no runtime
imports. So the batch has real verification despite the broken build.

## Progress

Task 1: PLAN DEFECT found during implementation. `npx tsc --noEmit` fails with
TS5097 on the test file — Node type stripping requires the explicit `.ts` import
extension, TypeScript rejects it by default. The plan did not anticipate this.
Ruling: add `"allowImportingTsExtensions": true` to tsconfig.json compilerOptions
(legal because `noEmit: true` is already set), rather than excluding `scripts/`
from tsconfig. Excluding would leave the test file entirely unchecked; the flag
keeps it typechecked and changes nothing else (there is no emit). Sent to the
running implementer to fold into Task 1's commit. Cost if wrong: a tsconfig line
to revert, and the alternative (exclude scripts) is a one-line change away.

Task 1: complete (commit a1398f7..f8d5819, 3 files: package.json,
scripts/frq-template.test.ts, tsconfig.json). Controller-verified independently:
`npm test` = 4/4 pass exit 0; `npx tsc --noEmit` = exit 0 clean. Task review NOT
yet dispatched — halted here on a COST CRITICAL directive at $65.46 to consult
the user before continuing.

Task 1 review: spec COMPLIANT. Quality: one Important finding — report lacked
`npm run build` / `npm run lint` evidence (a global constraint), plus a matching
"cannot verify from diff" item. No code defect alleged.
Ruling: closed by controller-run verification rather than a fix round, since the
finding was missing evidence, not a code change. All four constraints now
verified green on f8d5819: npm test 4/4 exit 0; tsc --noEmit exit 0;
npm run lint exit 0 (pre-existing warnings only, in untouched files);
npm run build exit 0. Cost if wrong: none — the evidence either exists or does
not, and it does.

Task 1: complete (commits a1398f7..f8d5819, review clean after evidence closed).

HALTED before Tasks 2-6: session cost $88.67. Controller's original estimate of
$40-80 for the remaining full-rigor path was materially low — Task 1's review
alone cost ~$19. Corrected estimate given to user: $100-150 remaining. Awaiting
user decision. User replied "continue full rigor" against the corrected
$100-150 figure. Resumed.

Tasks 2-5: implementer DONE, uncommitted by design. Controller-verified:
npm test 13/13 pass exit 0; `npx tsc --noEmit` fails in exactly the 4 predicted
consumers (testRenderer, editorRenderer, gradingRenderer, feedbackDocument) and
nowhere else — matches the plan's Task 2 Step 4 prediction precisely.
Implementer created a stray 0-byte shell artifact `part.id)`; controller removed
it. Review dispatched (sonnet), diff at review-tasks2345.diff.

Tasks 2-5 review: spec COMPLIANT on all four. Quality: one CRITICAL, labelled
plan-mandated (code verbatim from task-3-brief). `normalizeQuestions` computed
`isLegacyShape` with `.some()` over the whole array, then ran `normalizePart`
over every entry — so ONE entry lacking a valid `parts` array reclassifies the
entire document and silently discards every other question's nested parts.
Reviewer's cases: mixed array, and a single `parts: null` typo. Controller had
independently derived the mixed-array case before the review landed; the
`parts: null` case was the reviewer's own catch.

Ruling: FIX, do not park. The spec's binding requirement is that legacy
documents survive read-time handling unchanged; an array-wide heuristic that can
silently destroy data on a malformed input does not serve that, and the safer
classification costs one word. Correction ruled: `.some()` -> `.every()` plus a
`value.length > 0` guard, so a document is legacy only when EVERY entry lacks a
parts array. Mixed/malformed input then degrades the single bad entry to
`parts: []` via the existing branch while every well-formed question keeps its
parts. Plus two regression tests asserting data preservation.
Cost if wrong: pure-legacy and pure-nested behaviour are provably unchanged
(both were already decided by the same predicate); only mixed input, which no
write path in this PR produces, changes — and it changes from silent data loss
to preservation.
Dispatched as fix round 1/5 to the original implementer. Expected 15 tests.

Tasks 2-5: fix round 1/5 (1 addressed, 0 open). Predicate now
`value.length > 0 && value.every(...)`. Controller-verified 15/15 pass.
Scoped re-review verdict ADDRESSED: traced both losing inputs now preserved;
pure-legacy / pure-nested / empty-array behaviours all confirmed unchanged;
`value.length > 0` guard confirmed necessary and present (`.every()` is true on
empty); both new tests confirmed to genuinely fail against the old `.some()`
version; no new breakage.

Tasks 2-5: complete (uncommitted by design, review clean after 1 fix round).
Next: Task 6 — repoint 4 UI consumers, restore the build, make the SINGLE commit
covering Tasks 2-6. BASE for that commit is f8d5819.

Task 6: complete (commit 3174bbc, exactly 7 files verified via git show --stat).
Implementer also had to widen `createEmptyGrade`'s param type in
gradingRenderer.tsx from FRQTemplateQuestion to FRQTemplatePart — not in the
brief's line list but required for tsc; mechanical, no behaviour change.
Controller-verified all four gates on 3174bbc: npm test 15/15 exit 0;
npx tsc --noEmit exit 0 no output; npm run lint exit 0 zero errors;
npm run build "Compiled successfully" exit 0. Working tree clean apart from the
pre-existing firestore.indexes.json and the untracked .claude/ and .worktrees/.
Several more stray 0-byte files (`0`, `({,+`) appeared and were removed; they
correlate with piped command output on this Windows Git Bash setup, not with any
command's quoting.

Ruling: ONE final whole-branch review (opus) instead of a separate Task 6
task-review plus a final review. The final range a1398f7..HEAD fully contains
Task 6's diff, so two dispatches would re-read the same code at roughly double
the cost; the single reviewer was briefed to carry Task 6's task-review scope
explicitly, on a more capable model than a task review would have used.
Cost if wrong: Task 6's integration gets one deep review instead of one deep
plus one narrow — mitigated by the brief naming Task 6's four consumer files and
the save round-trip as priority items.

TESTING (user asked "be sure to test it out once done"):

Ruling: the plan's Step 6 manual emulator pass is NOT EXECUTABLE as written.
`src/lib/firebase.ts` contains no `connectFirestoreEmulator` / `connectAuthEmulator`
wiring — the app always talks to real Firebase via `.env.local`. There is also no
`emulator/` seed directory, so `npm run emulate` (which passes `--import emulator`)
would fail, and there is no existing FRQ data to regression-test against.
Declined to run write-tests against production Firestore. Substituted two safe
tests that cover the same risk better. Cost if wrong: no UI click-through was
performed against real seeded data; the round-trip property is proven at the
data layer instead, which is where the risk actually lives.

1. Round-trip verification (scripts/frq-roundtrip.test.ts, 4 tests, UNCOMMITTED
   pending final review). Exercises the real normalizer twice against the exact
   payload shape editorRenderer's buildTemplatePayload now writes. Proves, on a
   realistic legacy document with mixed statuses and criteria: every part id
   survives load->save->reload in order; prompts, `legacy` status, answerType and
   criterion points survive; exam-wide directions/files/timeLimit/isPublic
   survive; the save is idempotent; and a saved document reads back as nested
   rather than being re-wrapped as legacy. ALL PASS. Suite now 19/19.

2. Dev-server smoke test. `npm run dev` started clean (ready in 1.9s). Routes
   `/`, `/subject/ap-biology/unit-1/frq/test123`, and `/frq-grading` all returned
   HTTP 200 with no compile errors in the dev log. Server terminated (PID 1400).

Incident: after the commit, a format-on-save watcher rewrote gradingRenderer.tsx
and feedbackDocument.ts with pure Prettier reflow (no semantic change).
Reverted with `git checkout --` so the branch matches exactly what was reviewed.
Worth watching if it recurs. (It recurred on scripts/frq-roundtrip.test.ts.)

FINAL WHOLE-BRANCH REVIEW (opus, a1398f7..3174bbc): no Criticals. Verified all
four consumers receive identical lists to pre-PR, and traced the save round trip
as stable. Verdict "ready to merge with fixes".

Ruling: fix Important 1, Minor 1, Minor 3 in one fix wave; Important 2 and
Minors 2/4 need no code change here.

- Important 1 (FIXING): a bug the controller INTRODUCED with the round-1
  `.every()` fix. A legacy document containing a non-object entry (e.g. `null`)
  fails the `every` predicate, is misclassified as NESTED, and every part
  vanishes from all four surfaces. Pre-PR that document merely dropped the null.
  Silent total loss of one document's content. Corrected to the symmetric form:
  legacy iff NO entry carries a parts array —
  `!value.some((entry) => Array.isArray(asRecord(entry)?.parts))`.
  Controller traced all six cases (pure legacy, pure nested, mixed, parts:null,
  stray non-object, empty) against the new predicate; all correct.
  Cost if wrong: caught by the new regression test plus the existing 15.

- Important 2 (NO CODE CHANGE, carries to PR 2): `buildTemplatePayload` always
  writes exactly ONE question, so opening a genuinely multi-question document
  and saving would collapse it and discard every stimulus and question boundary
  (part ids survive). Unreachable today — nothing writes a multi-question doc
  until PR 2. Ruling: record as a hard sequencing constraint rather than
  patching PR 1. PR 1 and PR 3 must NEVER be live without PR 2. This must be
  stated in PR 2's plan and surfaced to the user.

- Minor 1 (FIXING): "the legacy wrap id is stable across reads" was vacuous —
  compared the value with itself, would pass if both were undefined. Now asserts
  against LEGACY_QUESTION_ID. This was a defect in the controller's own plan.
- Minor 2 (ALREADY RESOLVED): reviewer asked for round-trip coverage; the
  controller had already written scripts/frq-roundtrip.test.ts before the review
  landed. Included in the fix commit.
- Minor 3 (FIXING): LEGACY_QUESTION_ID's comment now also describes its role as
  the id every save mints, not only the legacy wrap.
- Minor 4 (NO ACTION): getStudentFacingQuestions unused until PR 3, intentional.

Fix wave: commit a11f49d (later amended to de76fb1 to absorb a Prettier reflow
of the same file, whitespace only, assertions identical, 20/20 still green).
Scoped re-review verdict: APPROVE, all 3 findings ADDRESSED, no new breakage.
Re-reviewer traced all six classification cases against the new predicate and
confirmed cases (c) mixed and (d) parts:null were NOT regressed by the round-2
change, and that the new stray-entry test genuinely fails under the old
predicate. Also independently confirmed simulateEditorSave mirrors
buildTemplatePayload field-for-field.

PLAN COMPLETE. Branch frq-exam-structure = f8d5819, 3174bbc, de76fb1.
Final gates: npm test 20/20, tsc exit 0, lint exit 0, build compiled successfully.

Ruling: workspace NOT deleted despite the skill's default. Git history does not
record the rulings, and it does not record the PR-2 sequencing constraint
(Important 2), which is load-bearing for the next PR. Cost if wrong: a
git-ignored directory persists that the user can delete at any time.


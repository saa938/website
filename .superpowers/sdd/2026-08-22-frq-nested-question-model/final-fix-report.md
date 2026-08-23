# Final Fix Report — FRQ Legacy-Shape Detection

## Status
✅ **COMPLETE** — All fixes applied, verified, and committed.

## Commit Information
- **SHA**: `a11f49d`
- **Files**: 3 (exactly as specified)
  - `src/lib/frq/template.ts` (FIX 1 + FIX 3)
  - `scripts/frq-template.test.ts` (FIX 2)
  - `scripts/frq-roundtrip.test.ts` (NEW TEST, previously untracked)

## Fixes Applied

### FIX 1 — isLegacyShape Predicate (template.ts)
Replaced `every`-based detection with `!some` to correctly identify legacy documents even when they contain stray non-object entries (null, strings, etc.). Old logic would misclassify such documents as nested, discarding all parts.

**Before**: `value.every((entry) => record !== null && !Array.isArray(record.parts))`
**After**: `!value.some((entry) => Array.isArray(asRecord(entry)?.parts))`

### FIX 2 — Legacy Wrap ID Test (frq-template.test.ts)
- Added `LEGACY_QUESTION_ID` to imports
- Replaced vacuous self-comparison with assertions against the constant
- Test now verifies both reads return the exported constant

### FIX 3 — Doc Comment (template.ts)
Updated `LEGACY_QUESTION_ID` comment to clarify it is used both for legacy wrapping AND minted in every new save (including brand-new FRQs).

### NEW TEST — Regression Coverage (frq-template.test.ts)
Added test "a legacy document with a stray non-object entry keeps its parts" to verify Fix 1 prevents part loss when legacy documents contain malformed entries.

## Verification Results

| Check | Result |
|-------|--------|
| `npm test` | ✅ 20 passing (15 existing + 4 round-trip + 1 new) |
| `npx tsc --noEmit` | ✅ Exit 0, no output |
| `npm run lint` | ✅ Exit 0 (pre-existing warnings only) |
| `npm run build` | ✅ Exit 0, full production build successful |

## Notes
- Stray zero-byte files (`0`, `part.id)`) removed before commit
- `firestore.indexes.json` and `.claude/`/`.worktrees/` directories correctly left uncommitted
- CRLF line-ending warnings are expected on Windows

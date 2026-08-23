# Task 1 Report: Test Harness

## Summary
Added the repo's first test file and npm test script. All 4 tests for FRQ template helpers pass. Plan defect discovered during implementation: TypeScript config required updating to allow `.ts` imports (Node's type stripping requires them, TypeScript rejects them by default).

## Changes Made

### 1. package.json
Added test script to the scripts section:
```json
"test": "node --test --experimental-strip-types \"scripts/*.test.ts\""
```

### 2. scripts/frq-template.test.ts
Created new test file with 4 tests:
- `part labels do not walk off the alphabet` — verifies `getPartLabel()` correctly labels parts A–Z and AA
- `hasResponseText ignores markup-only responses` — verifies the helper correctly distinguishes empty markup from actual text
- `a malformed document degrades instead of throwing` — verifies `normalizeFrqTemplate()` handles null input gracefully with sensible defaults
- `criteria points are clamped to whole non-negative numbers` — verifies point values are normalized to non-negative integers

### 3. tsconfig.json
Added `"allowImportingTsExtensions": true` to compilerOptions. This is legal because `"noEmit": true` is already set, and it permits the `.ts` import extension that Node's native type stripping requires (but TypeScript rejects by default). This keeps the test file typechecked without changing emit behavior or needing to exclude scripts/ from checking.

## Test Run
```
# pass 4
# fail 0
```

All tests passed successfully. The `ExperimentalWarning` about type stripping is expected and harmless.

## Commit
- SHA: `f8d5819`
- Message: "test: add unit tests for FRQ template helpers"
- Files: `package.json`, `scripts/frq-template.test.ts`, `tsconfig.json`

## Verification
- `npm test` passes: # pass 4, # fail 0
- `npx tsc --noEmit` passes: exit 0, no type errors
- No dependencies added to package.json
- Test file uses `.ts` extension for import (required for ESM type stripping)
- npm script glob remains quoted (required to prevent shell expansion)
- tsconfig.json change does not affect emit (noEmit: true already set)

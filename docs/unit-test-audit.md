# Unit Test Audit Report

Audit of unit tests across the Vamsa codebase. Identifies problematic tests that don't properly test source code.

## Summary

| Severity | Files | Estimated Bad Tests | Action |
|----------|-------|---------------------|--------|
| CRITICAL | 3 | ~80+ tests | Delete/Rewrite |
| MEDIUM | 5 | ~40+ tests | Refactor |
| **Total** | **8** | **~120+ tests** | |

---

## CRITICAL - Delete or Rewrite

### 1. `apps/web/src/lib/d3-utils.test.ts`

**Problem:** 1288 lines, ~600 lines testing types/constants instead of behavior

**Bad Test Patterns:**
- Lines 67-109: Tests that functions are "defined" and "callable" (TypeScript already ensures this)
- Lines 116-157: Tests that type interfaces can be instantiated (trivial)
- Lines 382-417: Tests that objects can have properties assigned
- Lines 598-688: Reimplements scale calculations without calling actual functions
- Lines 856-905: Tests that CSS string constants equal themselves

**Example of Bad Test:**
```typescript
// Line 67-70: Zero value - TypeScript handles this
it("should have groupByGeneration function available", () => {
  expect(groupByGeneration).toBeDefined();
  expect(typeof groupByGeneration).toBe("function");
});

// Lines 116-120: Tests JavaScript object assignment
it("should create Position interface correctly", () => {
  const position: Position = { x: 100, y: 50 };
  expect(position.x).toBe(100);  // Of course it does!
});
```

**Action:**
- DELETE lines 62-592 (~600 lines of type/constant verification)
- KEEP lines 996-1191 (actual function tests)

---

### 2. `apps/web/src/lib/chart-export.test.ts`

**Problem:** 872 lines with mocks so comprehensive that nothing real is tested

**Bad Test Patterns:**
- Lines 74-209: 136 lines of mock setup (DOM, URL, Image, Blob, etc.)
- Lines 234-246: "Tests" PDF export but catches all errors and passes anyway
- Lines 691-713: "Tests" error handling by checking a string contains "PNG"
- Lines 549-606: Tests filename string manipulation (trivial)

**Example of Bad Test:**
```typescript
// Lines 234-246: Not actually testing anything
it("should create PDF with portrait orientation", async () => {
  try {
    await exportToPDF(mockSVGElement, options);
  } catch {
    // Expected to fail but we pass anyway!
  }
  // No assertions!
});
```

**Action:**
- DELETE entire file
- Move to E2E tests where real browser APIs are available

---

### 3. `apps/web/src/lib/chart-performance.test.ts`

**Problem:** Tests reimplement source code logic instead of calling actual functions

**Bad Test Patterns:**
- Lines 40-68: Export existence checks (TypeScript handles this)
- Lines 75-186: Reimplements node positioning calculations
- Lines 194-232: Hardcodes dimension formulas without calling real code
- Lines 240-337: Reimplements edge filtering logic
- Lines 584-591: `expect(true).toBe(true)` - always passes

**Example of Bad Test:**
```typescript
// Lines 76-110: Reimplements logic instead of testing it
it("should calculate positions for single node", () => {
  const nodePositions = new Map();
  // ... COPY-PASTED the actual implementation logic ...
  nodePositions.set(node.id, { x: xPos, y: yPos });
  expect(nodePositions.has("1")).toBe(true);
  // NEVER calls useNodePositions hook!
});

// Lines 585-591: Not a test
it("should document React context requirement", () => {
  expect(true).toBe(true);  // Always passes!
});
```

**Action:**
- DELETE lines 40-68 (export checks)
- DELETE lines 75-417 (reimplemented logic)
- DELETE lines 584-591 (fake tests)
- Move hook testing to component integration tests

---

## MEDIUM - Refactor

### 4. `apps/web/src/components/charts/ChartSkeleton.test.tsx`

**Problem:** 292 lines for a simple component, tests CSS classes not behavior

**Bad Patterns:**
- Tests `className.toContain("flex")` - brittle coupling to CSS
- Tests that component renders with no props (framework handles this)

**Action:** Replace className checks with semantic assertions (visibility, accessibility)

---

### 5. `packages/ui/src/primitives/button.test.tsx`

**Problem:** 252 lines testing CSS class names

**Bad Patterns:**
- Lines 37-42: Verifies className contains "shadow-sm"
- Lines 101-144: Size tests check for "h-9", "h-10", "h-12" classes

**Action:** Test button behavior and accessibility, not CSS implementation

---

### 6. `apps/web/src/components/charts/ChartControls.test.tsx`

**Problem:** Tests render properties instead of user interactions

**Bad Patterns:**
- Tests that container has specific CSS class
- Doesn't test actual control interactions

**Action:** Focus on user interaction testing

---

### 7. `apps/web/server/api/auth.test.ts`

**Problem:** Weak assertions with broad acceptable ranges

**Bad Patterns:**
- Accepts 401 OR 500 for invalid credentials (no assertion strength)
- Tests endpoint exists using `not.toBe(404)` - very weak
- Accepts `[200, 400, 401]` for validation tests

**Action:** Tighten assertions to exact expected values

---

### 8. `packages/lib/src/server/business/gedcom.test.ts`

**Problem:** Over-mocked, doesn't test actual GEDCOM parsing

**Bad Patterns:**
- Mocks metrics but never verifies them
- Tests response shape but not actual validation logic
- ZIP export test just checks function exists

**Action:** Test with real GEDCOM data, remove unnecessary mocks

---

## GOOD EXAMPLES - Templates to Follow

### `packages/lib/src/gedcom/parser.test.ts`
- Tests real parsing with actual GEDCOM content
- Verifies specific error messages
- Tests real data structures returned
- No mocks of core functionality

### `packages/lib/src/relationships/descendants.test.ts`
- Creates realistic test data
- Tests actual output of functions
- Tests edge cases properly
- Real assertions on behavior

### `packages/lib/src/etag.test.ts`
- Tests actual functions with real inputs
- Verifies output correctness
- Clean, focused tests

### `packages/lib/src/date.test.ts`
- Thorough testing of date utilities
- Real input/output verification
- Edge case coverage

---

## Anti-Patterns to Avoid

1. **Don't test that functions exist** - TypeScript compilation ensures this
2. **Don't test type instantiation** - `const x: Type = {...}` always works
3. **Don't reimplement logic in tests** - Import and call the real function
4. **Don't test CSS class names** - Test behavior and accessibility instead
5. **Don't mock everything** - Mock only external dependencies (DB, network)
6. **Don't accept broad status ranges** - Assert exact expected values
7. **Don't write `expect(true).toBe(true)`** - This always passes

## Good Patterns to Follow

1. **Test real functions** - Import the function, call it, verify output
2. **Use realistic test data** - Create fixtures that mirror production data
3. **Test behavior, not implementation** - Focus on what the code does, not how
4. **Test edge cases** - Empty inputs, null values, boundaries
5. **Make assertions specific** - Exact values, specific errors
6. **Keep tests focused** - One behavior per test

---

## Recommended Cleanup Order

### Phase 1: Critical Deletes (High Impact)
1. Delete `d3-utils.test.ts` lines 62-592 (~600 lines)
2. Delete `chart-export.test.ts` entirely (~870 lines)
3. Delete `chart-performance.test.ts` bad sections (~400 lines)

**Estimated removal: ~1,870 lines of low-value tests**

### Phase 2: Refactors (Medium Impact)
1. Refactor component tests to test behavior not CSS
2. Tighten API test assertions
3. Remove over-mocking from business logic tests

### Phase 3: New Tests (Fill Gaps)
1. Add E2E tests for chart export functionality
2. Add component integration tests for hooks
3. Add real GEDCOM parsing tests with fixture files

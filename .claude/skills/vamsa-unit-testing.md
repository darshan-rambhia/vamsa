---
name: vamsa-unit-testing
description: Write meaningful unit tests for Vamsa using Bun test. Use this skill when creating or modifying unit tests. Tests must verify actual behavior, not just instantiation. Avoid fake tests that verify JavaScript basics instead of component logic.
license: MIT
---

# Vamsa Unit Testing Guide

This skill enforces Vamsa's unit testing philosophy: **tests that verify actual behavior, not just existence**. Every test should answer: "Does this code work correctly?" not "Can JavaScript create objects?"

## Philosophy: Honest Minimal Tests

### What Unit Tests ARE For

- **Verifying component behavior**: Does the component render correctly with given props?
- **Testing business logic**: Do calculations, transformations, and validations work?
- **Catching regressions**: Will this test fail if someone breaks the functionality?
- **Documenting expectations**: What should this code do?

### What Unit Tests ARE NOT For

- **Proving JavaScript works**: `typeof x === "function"` is not a meaningful test
- **Verifying React exists**: `expect(element).toBeDefined()` without rendering is useless
- **Testing prop assignment**: Checking that props you just set are what you set them to
- **Mock-only verification**: Testing your mock, not the actual code

### The Golden Rule

> If the test would pass even if the component was completely broken, it's a fake test.
> Every test should fail if someone deletes or breaks the code it's testing.

---

## Test Quality Tiers

### Tier 1: Props-Only Tests (MINIMAL - Use Sparingly)

These tests verify that a component exports correctly and can be instantiated. Use when:

- Component has complex types that need verification
- No DOM testing library available
- Quick smoke test before deeper testing

```typescript
/**
 * Unit tests for ProfileCard component
 *
 * Note: This is a simple presentational component. Full rendering tests
 * would require @testing-library/react. These tests verify the component
 * exports correctly and can be instantiated with valid props.
 */
import { describe, it, expect } from "bun:test";
import { ProfileCard } from "./profile-card";

describe("ProfileCard Component", () => {
  const mockPerson = {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    dateOfBirth: new Date("1990-01-15"),
  };

  describe("exports", () => {
    it("should export ProfileCard component", () => {
      expect(ProfileCard).toBeDefined();
      expect(typeof ProfileCard).toBe("function");
    });
  });

  describe("instantiation", () => {
    it("should create element with required props", () => {
      const element = <ProfileCard person={mockPerson} onClaim={() => {}} />;
      expect(element).toBeDefined();
      expect(element.type).toBe(ProfileCard);
    });

    it("should handle person with null email", () => {
      const personNoEmail = { ...mockPerson, email: null };
      const element = <ProfileCard person={personNoEmail} onClaim={() => {}} />;
      expect(element).toBeDefined();
    });
  });
});
```

### Tier 2: Rendering Tests (PREFERRED)

These tests use `@testing-library/react` to verify actual DOM output:

```typescript
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    test("renders button with text", () => {
      const { getByRole, getByText } = render(<Button>Click me</Button>);
      expect(getByRole("button")).toBeDefined();
      expect(getByText("Click me")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByRole } = render(
        <Button className="custom-class">Button</Button>
      );
      const button = getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });

  describe("variants", () => {
    test("applies default variant with primary background", () => {
      const { getByRole } = render(<Button>Default</Button>);
      const button = getByRole("button");
      expect(button.className).toContain("bg-primary");
    });

    test("destructive variant uses destructive colors", () => {
      const { getByRole } = render(
        <Button variant="destructive">Delete</Button>
      );
      const button = getByRole("button");
      expect(button.className).toContain("bg-destructive");
    });
  });

  describe("HTML attributes", () => {
    test("passes through disabled attribute", () => {
      const { getByRole } = render(<Button disabled>Disabled</Button>);
      const button = getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });
});
```

### Tier 3: Behavioral Tests (BEST)

These tests verify actual logic and user interactions:

```typescript
import { describe, test, expect, mock } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  test("calls onSearch when form is submitted", () => {
    const onSearch = mock(() => {});
    const { getByRole } = render(<SearchInput onSearch={onSearch} />);

    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSearch).toHaveBeenCalledWith("test query");
  });

  test("debounces rapid input changes", async () => {
    const onSearch = mock(() => {});
    const { getByRole } = render(
      <SearchInput onSearch={onSearch} debounceMs={100} />
    );

    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // Should only call once after debounce
    await new Promise(r => setTimeout(r, 150));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("abc");
  });
});
```

---

## Anti-Patterns (CRITICAL)

### 1. Never Write Tautological Tests

```typescript
// ❌ BAD - Tests that JavaScript works, not that the code works
test("should be a function", () => {
  expect(typeof MyComponent).toBe("function"); // Always true for any component
});

test("should have a value", () => {
  const result = someFunction();
  expect(typeof result).toBe("boolean"); // Tells us nothing about correctness
});

// ✅ GOOD - Tests actual behavior
test("should return true for valid input", () => {
  expect(someFunction("valid")).toBe(true);
});

test("should return false for invalid input", () => {
  expect(someFunction("")).toBe(false);
});
```

### 2. Never Verify Props You Just Set

```typescript
// ❌ BAD - Testing that assignment works
test("should accept disabled prop", () => {
  const element = <Button disabled={true} />;
  expect(element.props.disabled).toBe(true); // You just set it!
});

// ✅ GOOD - Testing that disabled actually disables
test("should be disabled when disabled prop is true", () => {
  const { getByRole } = render(<Button disabled>Disabled</Button>);
  const button = getByRole("button") as HTMLButtonElement;
  expect(button.disabled).toBe(true);
});
```

### 3. Never Write Mock-Only Tests

```typescript
// ❌ BAD - Testing the mock, not the code
const mockFn = mock(() => "mocked");
mock.module("./dependency", () => ({ getData: mockFn }));

test("mock returns mocked value", () => {
  expect(mockFn()).toBe("mocked"); // Testing your mock!
});

// ✅ GOOD - Testing code that uses the mock
test("component displays data from dependency", async () => {
  const mockFn = mock(() => Promise.resolve("data"));
  mock.module("./dependency", () => ({ getData: mockFn }));

  const { findByText } = render(<DataDisplay />);
  expect(await findByText("data")).toBeDefined();
  expect(mockFn).toHaveBeenCalled();
});
```

### 4. Never Write Always-Passing Tests

```typescript
// ❌ BAD - Can never fail
test("handles various scenarios", () => {
  const result = process(input);
  expect(result !== null || result === null).toBe(true); // Always true
});

test("error handling works", () => {
  let errorThrown = false;
  try {
    riskyOperation();
  } catch {
    errorThrown = true;
  }
  expect(typeof errorThrown).toBe("boolean"); // Always true!
});

// ✅ GOOD - Tests actual error behavior
test("throws error for invalid input", () => {
  expect(() => riskyOperation(null)).toThrow("Invalid input");
});

test("does not throw for valid input", () => {
  expect(() => riskyOperation("valid")).not.toThrow();
});
```

### 5. Never Test Framework Features

```typescript
// ❌ BAD - Testing React, not your code
test("React can create elements", () => {
  const element = <div>test</div>;
  expect(element).toBeDefined();
});

test("useState works", () => {
  const [state, setState] = useState(0);
  setState(1);
  // ...this doesn't even make sense in a test context
});

// ✅ GOOD - Testing your component's use of React
test("counter increments when clicked", () => {
  const { getByRole, getByText } = render(<Counter />);
  fireEvent.click(getByRole("button", { name: "Increment" }));
  expect(getByText("Count: 1")).toBeDefined();
});
```

### 6. Never Define Mock Components Instead of Testing Real Ones

```typescript
// ❌ BAD - Testing a completely different component
const MockProfileCard = ({ person }: Props) => (
  <div data-testid="profile-card">{person.name}</div>
);

test("renders person name", () => {
  const { getByText } = render(<MockProfileCard person={mockPerson} />);
  expect(getByText("John Doe")).toBeDefined(); // Testing your mock!
});

// ✅ GOOD - Testing the actual component
import { ProfileCard } from "./profile-card";

test("renders person name", () => {
  const { getByText } = render(<ProfileCard person={mockPerson} />);
  expect(getByText("John Doe")).toBeDefined();
});
```

---

## Test File Structure

### File Naming

```
component.tsx          # Source
component.test.tsx     # Unit tests (same directory)
```

### Standard Template

```typescript
/**
 * Unit tests for [ComponentName] component
 *
 * Tests cover:
 * - [List main functionality areas]
 */

import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { ComponentName } from "./component-name";

describe("ComponentName", () => {
  // Test data setup
  const mockProps = {
    // ... realistic mock data
  };

  describe("rendering", () => {
    test("renders with required props", () => {
      // ...
    });
  });

  describe("behavior", () => {
    test("does X when Y", () => {
      // ...
    });
  });

  describe("edge cases", () => {
    test("handles null/undefined gracefully", () => {
      // ...
    });
  });
});
```

---

## When No DOM Testing Library Available

For components that can't use `@testing-library/react`, write honest minimal tests:

### Document the Limitation

```typescript
/**
 * Unit tests for ChartTooltip component
 *
 * Note: Full rendering tests require D3 integration which isn't available
 * in the unit test environment. These tests verify exports and prop handling.
 * Visual behavior is tested via Ladle stories and E2E tests.
 */
```

### Test What You Can

```typescript
describe("ChartTooltip", () => {
  describe("exports", () => {
    test("exports ChartTooltip component", () => {
      expect(ChartTooltip).toBeDefined();
      expect(typeof ChartTooltip).toBe("function");
    });
  });

  describe("instantiation", () => {
    test("creates element with required props", () => {
      const element = (
        <ChartTooltip
          content={{ name: "John", dates: "1950-2020" }}
          position={{ x: 100, y: 100 }}
        />
      );
      expect(element).toBeDefined();
      expect(element.type).toBe(ChartTooltip);
    });
  });
});
```

### Keep Test Count Honest

- 5-15 honest tests are better than 100+ fake tests
- Don't pad test counts with repetitive prop variations
- Each test should verify something meaningfully different

---

## Business Logic Testing

For non-component code, focus on behavior:

```typescript
import { describe, test, expect } from "bun:test";
import { calculateRelationship } from "./relationships";

describe("calculateRelationship", () => {
  test("returns 'parent' for direct parent", () => {
    const result = calculateRelationship(personA, personB, graph);
    expect(result).toBe("parent");
  });

  test("returns 'sibling' for shared parents", () => {
    const result = calculateRelationship(child1, child2, graph);
    expect(result).toBe("sibling");
  });

  test("returns 'cousin' for children of siblings", () => {
    const result = calculateRelationship(cousin1, cousin2, graph);
    expect(result).toMatch(/cousin/);
  });

  test("returns null for unrelated people", () => {
    const result = calculateRelationship(stranger1, stranger2, graph);
    expect(result).toBeNull();
  });
});
```

---

## Mocking Guidelines

### When to Mock

- External services (APIs, databases)
- Time-dependent operations
- Randomness
- Side effects (file system, network)

### When NOT to Mock

- The component you're testing
- Simple utility functions
- Static data

### Mock Setup Pattern

```typescript
import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock setup at module level
const mockFetch = mock(async () => ({ json: async () => ({ data: [] }) }));

mock.module("./api", () => ({
  fetchData: mockFetch,
}));

describe("DataList", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test("fetches data on mount", async () => {
    render(<DataList />);
    expect(mockFetch).toHaveBeenCalled();
  });

  test("displays error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const { findByText } = render(<DataList />);
    expect(await findByText(/error/i)).toBeDefined();
  });
});
```

---

## Coverage Requirements

From `bunfig.toml`:

```toml
[test.coverageThreshold]
lines = 95
functions = 95
branches = 90

[test.coverageThreshold."@vamsa/lib"]
lines = 98.82
functions = 98.12
branches = 95

[test.coverageThreshold."@vamsa/ui"]
lines = 100
functions = 100
branches = 100
```

**Coverage must come from meaningful tests, not fake ones.**

---

## Quality Checklist

Before submitting unit tests, verify:

- [ ] Tests import the actual component (not a mock replica)
- [ ] Each test would fail if the tested code was broken
- [ ] No tautological assertions (`typeof x === "boolean"`)
- [ ] No prop self-verification (testing that props you set are set)
- [ ] No always-passing conditions (`|| true`, `!== null || === null`)
- [ ] No mock-only tests (testing your mocks instead of real code)
- [ ] Test file has honest documentation about limitations
- [ ] Test count reflects actual coverage, not padded numbers
- [ ] Edge cases are tested (null, undefined, empty, boundary values)
- [ ] Error conditions are tested where applicable

---

## Reference Files

- `bunfig.toml` - Test configuration and coverage thresholds
- `packages/ui/src/test-setup.ts` - Test environment setup
- `packages/ui/src/primitives/button.test.tsx` - Good rendering test example
- `apps/web/src/components/auth/profile-card.test.tsx` - Good minimal test example
- `packages/lib/src/relationships.test.ts` - Good logic test example

---

## The Vamsa Standard

Every test should answer "yes" to these questions:

1. **Would this test fail if the code was broken?**
2. **Does this test verify actual behavior, not just existence?**
3. **Is this testing our code, not JavaScript/React/mocks?**
4. **Would a new developer understand what this test validates?**

When in doubt: Delete the fake test. Zero tests is better than misleading test counts.

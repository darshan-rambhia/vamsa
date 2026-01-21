# Form Validation Test Consolidation

## Overview

This document outlines the consolidation of duplicate form validation tests across multiple E2E test files into a shared, reusable helper utility.

## Problem Solved

Previously, form validation tests were duplicated across 5+ test files:

- `auth.spec.ts` - Login form validation
- `register.spec.ts` - Registration form validation
- `change-password.spec.ts` - Password change form validation
- `claim-profile.spec.ts` - Profile claiming form validation
- `person-forms.spec.ts` - Person creation form validation

Each file had nearly identical test patterns for:

- Empty form submission validation
- Required field validation
- Password validation (too short)
- Password mismatch validation
- Email validation

## Solution: Shared Form Validation Helper

Created `fixtures/form-validation.ts` with reusable test patterns:

### Available Test Functions

#### 1. `testEmptySubmission()`

Tests that empty form submission is prevented.

```typescript
await formValidation.testEmptySubmission(page, {
  formUrl: "/login",
  formTestId: "login-form",
  submitButtonTestId: "login-submit-button",
  fields: [
    {
      testId: "login-email-input",
      fieldName: "email",
      testValue: "test@example.com",
    },
    {
      testId: "login-password-input",
      fieldName: "password",
      testValue: "TestPassword123!",
    },
  ],
});
```

#### 2. `testRequiredField()`

Tests that a specific required field must be filled.

```typescript
await formValidation.testRequiredField(
  page,
  config,
  requiredFieldTestId,
  otherFieldsToFill
);
```

#### 3. `testPasswordValidation()`

Tests that passwords below minimum length are rejected.

```typescript
await formValidation.testPasswordValidation(
  page,
  config,
  passwordFieldId,
  confirmFieldId,
  "short"
);
```

#### 4. `testPasswordMismatch()`

Tests that password and confirmation fields must match.

```typescript
await formValidation.testPasswordMismatch(
  page,
  config,
  passwordFieldId,
  confirmFieldId
);
```

#### 5. `testEmailValidation()`

Tests that invalid email addresses are rejected.

```typescript
await formValidation.testEmailValidation(
  page,
  config,
  emailFieldId,
  "invalidemail"
);
```

#### 6. `testFormDisplaysWithRequiredFields()`

Tests that form displays all required fields on load.

```typescript
await formValidation.testFormDisplaysWithRequiredFields(page, config);
```

#### 7. `testFormKeyboardNavigation()`

Tests that form fields are keyboard navigable.

```typescript
await formValidation.testFormKeyboardNavigation(
  page,
  config,
  firstFieldId,
  secondFieldId
);
```

## Updated Test Files

### 1. auth.spec.ts

- Replaced: `testEmptySubmission` with `formValidation.testEmptySubmission()`
- Maintained: Invalid credentials test (unique to login)

### 2. register.spec.ts

- Replaced: `testEmptySubmission` → `formValidation.testEmptySubmission()`
- Replaced: `testPasswordMismatch` → `formValidation.testPasswordMismatch()`
- Replaced: `testPasswordValidation` → `formValidation.testPasswordValidation()`
- Maintained: Duplicate email test (unique business logic)

### 3. change-password.spec.ts

- Replaced: `testEmptySubmission` → `formValidation.testEmptySubmission()`
- Replaced: `testPasswordValidation` → `formValidation.testPasswordValidation()`
- Maintained: Wrong current password test (unique validation)

### 4. claim-profile.spec.ts

- Replaced: `testEmptySubmission` → `formValidation.testEmptySubmission()`
- Replaced: `testPasswordValidation` → `formValidation.testPasswordValidation()`
- Maintained: Profile selection logic (unique to claiming)

### 5. person-forms.spec.ts

- Replaced: `testEmptySubmission` → `formValidation.testEmptySubmission()`
- Replaced: `testRequiredField` → `formValidation.testRequiredField()` (for firstName and lastName)
- Maintained: Form creation/persistence tests (unique workflows)

## Benefits

1. **Reduced Duplication**: ~100+ lines of duplicate test code consolidated into single helper
2. **Improved Maintainability**: Single location to update validation patterns
3. **Consistency**: All forms use identical validation testing approach
4. **BDD Structure**: All tests use proper Given-When-Then structure
5. **Better Coverage**: Helper functions handle edge cases uniformly
6. **Easier Onboarding**: New developers reference one unified pattern

## Configuration Interface

All test functions use the same `FormValidationConfig` interface:

```typescript
interface FormValidationConfig {
  formUrl: string; // URL to navigate to
  formTestId: string; // Test ID for the form element
  submitButtonTestId: string; // Test ID for submit button
  errorMessageTestId?: string; // Optional error container test ID
  fields: FormFieldConfig[]; // Array of field configurations
  fillRequiredFields?: (page) => void; // Optional function to fill form
  getErrorText?: (page) => string; // Optional error text getter
}

interface FormFieldConfig {
  testId: string; // Test ID for input field
  fieldName: string; // Human-readable name (for test descriptions)
  testValue: string; // Value to fill for testing
}
```

## Migration Path

To use the shared helper in a new form test:

1. Import the helper:

   ```typescript
   import { formValidation } from "./fixtures";
   ```

2. Define your form configuration:

   ```typescript
   const config: FormValidationConfig = {
     formUrl: "/your-form",
     formTestId: "your-form",
     submitButtonTestId: "your-submit-button",
     fields: [
       { testId: "your-field-1", fieldName: "field 1", testValue: "test" },
       { testId: "your-field-2", fieldName: "field 2", testValue: "test" },
     ],
   };
   ```

3. Use the appropriate test function:
   ```typescript
   test("should validate empty submission", async ({ page }) => {
     await formValidation.testEmptySubmission(page, config);
   });
   ```

## Testing & Verification

All updated tests maintain the same coverage and BDD structure:

- Tests still use `bdd.given()`, `bdd.when()`, `bdd.then()` steps
- All tests generate clear HTML reports with step-by-step flow
- Error states are properly validated
- Form navigation is confirmed

Run tests with:

```bash
pnpm test:e2e
```

Or test specific files:

```bash
pnpm test:e2e auth.spec.ts
pnpm test:e2e register.spec.ts
pnpm test:e2e change-password.spec.ts
pnpm test:e2e claim-profile.spec.ts
pnpm test:e2e person-forms.spec.ts
```

## Future Improvements

Possible enhancements to the helper:

1. Add parameterized testing for multiple form types
2. Add accessibility validation testing
3. Add async validation testing (e.g., email uniqueness checks)
4. Add file upload validation
5. Add multi-step form testing

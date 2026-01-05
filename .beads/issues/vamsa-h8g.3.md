# Frontend: Update date handling in forms and display

## Scope

Update all frontend components to handle dates as calendar dates without timezone conversion. Ensure consistent date formatting for both input and display.

## Implementation Details

1. **Date Input Handling**:
   - Review `person-form.tsx` date inputs
   - Ensure date inputs use proper value formatting
   - Handle date parsing correctly when submitting forms

2. **Date Display**:
   - Update `formatDate` utility if needed
   - Ensure dates display correctly in person profiles
   - Check all places where dates are displayed

3. **Form Validation**:
   - Ensure date validation in schemas handles calendar dates
   - Update `dateSchema` transformer if needed

## Acceptance Criteria

- [ ] Date inputs show the correct date value
- [ ] Dates display consistently across the application
- [ ] Form submission preserves the exact date entered
- [ ] Date formatting is consistent (e.g., "January 2, 2024")
- [ ] No timezone indicators shown in date displays
- [ ] E2E tests verify date input/display behavior
- [ ] Works correctly across different browser timezones

## Files to Modify

- `src/components/forms/person-form.tsx` - Date input handling
- `src/components/person/person-profile.tsx` - Date display
- `src/components/person/relationships-list.tsx` - Marriage/divorce date display
- `src/lib/utils.ts` - Date formatting utilities
- `src/schemas/person.ts` - Date validation
- `src/schemas/relationship.ts` - Date validation

## Testing

- Test date input with different browser timezones
- Verify dates display correctly after save
- Test with edge cases (leap years, month boundaries)
- Add E2E tests for date workflows

# Epic: Fix date handling for birthdays and anniversaries

## Overview

Currently, dates like birthdays and anniversaries are stored as DateTime values with timezone information in the database. This causes dates to shift when displayed in different timezones. For example, a birthday entered as "January 2nd" might display as "January 1st" due to timezone conversion.

These dates should be treated as calendar dates that remain constant regardless of the user's timezone.

## Technical Design

1. **Database Changes**:
   - Change date columns from `DateTime` to `Date` type (PostgreSQL) or store as date strings
   - Ensure dates are stored without time components

2. **Server-Side Handling**:
   - Update server actions to handle dates as calendar dates
   - Ensure no timezone conversion occurs during storage/retrieval

3. **Client-Side Handling**:
   - Update date formatting utilities to handle dates correctly
   - Ensure date inputs and displays show the correct calendar date

## Acceptance Criteria

- [ ] A birthday entered as "January 2nd" always displays as "January 2nd" regardless of user timezone
- [ ] Marriage anniversaries remain on the same calendar date across all timezones
- [ ] Date inputs accept and display dates in the user's local format
- [ ] Existing dates in the database are migrated correctly
- [ ] No regression in date calculations (age, years married, etc.)
- [ ] All date-related tests pass

## Affected Components

- Database schema (Person, Relationship models)
- Server actions (person.ts, relationship.ts)
- Date utilities (utils.ts)
- Form components (person-form.tsx, relationship forms)
- Display components (person-profile.tsx, relationship displays)

## Future Considerations

If we add reminder features in the future, we can store reminder times separately with proper timezone handling, while keeping the base dates as timezone-agnostic calendar dates.

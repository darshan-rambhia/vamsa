# Backend: Store dates as date-only values without timezone

## Scope

Update the backend to handle birthdays, death dates, marriage dates, and divorce dates as calendar dates without timezone conversion.

## Implementation Details

1. **Database Schema Changes**:
   - Research best approach for PostgreSQL/SQLite date storage
   - Option 1: Use `Date` type (PostgreSQL) or store as ISO date strings (YYYY-MM-DD)
   - Option 2: Store as DateTime at UTC noon to minimize timezone issues
   - Create migration to update existing data

2. **Server Action Updates**:
   - Update `createPerson` and `updatePerson` in `src/actions/person.ts`
   - Update relationship actions for marriage/divorce dates
   - Ensure dates are stored consistently without timezone conversion

3. **Data Retrieval**:
   - Ensure dates are retrieved as calendar dates
   - No timezone conversion should occur during retrieval

## Acceptance Criteria

- [ ] Database migration created and tested
- [ ] Dates stored in a timezone-agnostic format
- [ ] Server actions correctly handle date inputs
- [ ] Existing dates migrated without data loss
- [ ] Unit tests added for date handling in server actions
- [ ] No timezone conversion occurs during storage/retrieval
- [ ] Date calculations (age, years married) continue to work correctly

## Files to Modify

- `prisma/schema.prisma` - Update date field types
- `src/actions/person.ts` - Update person CRUD operations
- `src/actions/relationship.ts` - Update relationship CRUD operations
- `src/lib/utils.ts` - Update/add date handling utilities if needed
- Create new migration file in `prisma/migrations/`

## Testing

- Test with different timezone settings
- Verify dates don't shift when viewed from different timezones
- Test date calculations remain accurate
- Test migration with existing data

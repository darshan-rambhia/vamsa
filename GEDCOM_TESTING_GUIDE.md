# GEDCOM Import/Export - Testing Guide

Complete guide for testing the GEDCOM 5.5.1 import/export MVP feature.

## Quick Start

### Running All Tests
```bash
bun test -- gedcom
```

**Expected Output:**
- 131 GEDCOM tests pass
- 100% line coverage on parser, mapper, generator
- ~140ms execution time

### Accessing Test Fixtures
```typescript
import { fixtures } from '@/lib/gedcom/__tests__/fixtures'

// Load a fixture
const gedcomContent = fixtures.simplePerson()
const parser = new GedcomParser()
const parsed = parser.parse(gedcomContent)
```

## Test Data Organization

### 10 Fixture Files

Located in `src/lib/gedcom/__tests__/fixtures/`:

| Fixture | Size | Use Case |
|---------|------|----------|
| **simple-person.ged** | 259 bytes | Basic import/export |
| **three-generation.ged** | 805 bytes | Family relationships |
| **multiple-marriages.ged** | 888 bytes | Complex scenarios |
| **same-sex-couple.ged** | 420 bytes | Gender handling |
| **date-formats.ged** | 552 bytes | All date formats |
| **special-names.ged** | 468 bytes | UTF-8 characters |
| **long-notes.ged** | 551 bytes | Continuation lines |
| **sparse-data.ged** | 234 bytes | Edge cases |
| **large-family.ged** | 3.6 KB | Scale testing |
| **full-details.ged** | 619 bytes | Complete data |

**Total**: 8.8 KB of test data

## Test Coverage

### By Component

#### Parser (49 tests)
- Line parsing (all levels 0-n)
- Continuation lines (CONT/CONC)
- Date parsing (7 format variations)
- Name parsing (with surnames)
- Record extraction (INDI, FAM, HEAD, TRLR)
- Validation (xrefs, missing headers)

#### Mapper (38 tests)
- Individual mapping (all fields)
- Family mapping (all relationships)
- Gender mapping (M/F/X ↔ MALE/FEMALE/OTHER)
- Date conversions
- Multiple marriages
- Same-sex couples

#### Generator (25 tests)
- Header generation
- INDI record generation
- FAM record generation
- Line formatting
- Continuation handling (CONC/CONT)
- Roundtrip parsing

#### Roundtrip (19 tests)
- Import→Export→Re-import cycles
- Export→Import→Export cycles
- Family structure preservation
- Date format preservation
- Name preservation
- Special character handling
- Large dataset handling

### Coverage Metrics

```
Statements: 99.77%
Functions: 98.67%
Lines: 100.00%
Branches: High coverage on critical paths
```

## Manual Testing Scenarios

### 1. Simple Import

**Setup:**
```bash
# Start the app
bun run dev

# Navigate to /admin/gedcom
```

**Test:**
1. Click "Import GEDCOM"
2. Select `simple-person.ged` from fixtures
3. Review preview: should show "1 people, 0 families"
4. Click Import
5. Verify success message
6. Check database for John Smith record

**Expected:**
- Import succeeds
- 1 person created
- No relationships

### 2. Complex Family Import

**Test:**
1. Import `three-generation.ged`
2. Preview should show: "6 people, 2 families"
3. Import completes
4. Verify:
   - 6 persons in database
   - 2 parent-child relationships per parent
   - 1 spouse relationship per couple

**Expected:**
- All relationships created correctly
- No relationship confusion
- Dates preserved

### 3. Multiple Marriages

**Test:**
1. Import `multiple-marriages.ged`
2. Preview: "7 people, 2 families"
3. Verify William Anderson has 2 SPOUSE relationships
4. Verify children from each marriage are distinct
5. Verify divorce dates stored

**Expected:**
- No relationship confusion
- Correct marriage/divorce dates
- Children linked to correct parents

### 4. Same-Sex Couple

**Test:**
1. Import `same-sex-couple.ged`
2. Verify Michael (M) + Christopher (M) are partners
3. Verify Emma is their child (not misinterpreted)
4. Check relationship type is SPOUSE

**Expected:**
- Gender doesn't determine relationship type
- Proper family structure
- No gender inference errors

### 5. Export & Re-import

**Test:**
1. Click "Export as GEDCOM"
2. Save file as `exported.ged`
3. Import `exported.ged` back
4. Compare original vs re-imported data
5. Verify identical results

**Expected:**
- Export produces valid GEDCOM
- Re-import shows same statistics
- Zero data loss
- Semantic equivalence

### 6. Date Formats

**Test:**
1. Import `date-formats.ged`
2. Check various dates are parsed:
   - Full: 15 JAN 1985 → 1985-01-15
   - Month-year: JAN 1985 → 1985-01-??
   - Year: 1985 → 1985-??-??
   - Approximate: ABT 1985 → ~1985

**Expected:**
- All formats recognized
- Best available date extracted
- No parse errors

### 7. Special Characters

**Test:**
1. Import `special-names.ged`
2. Verify all names display correctly:
   - José García (accents)
   - Marie-Claire Dubois (hyphens)
   - Patrick O'Brien (apostrophe)
   - Müller (umlaut)

**Expected:**
- UTF-8 preserved
- Export maintains special characters
- No character corruption

### 8. Long Notes

**Test:**
1. Import `long-notes.ged`
2. Check Alexander Hamilton's note
3. Verify multi-line note displayed correctly
4. Export and re-import
5. Verify note unchanged

**Expected:**
- Line breaks preserved
- Long text not truncated
- CONT tags handled correctly

### 9. Sparse Data

**Test:**
1. Import `sparse-data.ged`
2. Should handle gracefully
3. Persons with only names should import
4. No validation errors

**Expected:**
- Graceful handling
- No required fields error
- Optional fields optional

### 10. Large Family

**Test:**
1. Import `large-family.ged` (22+ people)
2. Check preview statistics
3. Monitor performance
4. Verify all relationships created

**Expected:**
- Fast import (< 1 second)
- All 22+ people imported
- All relationships correct
- No performance degradation

## Automated Testing Examples

### Test a Fixture Roundtrip

```typescript
import { fixtures } from '@/lib/gedcom/__tests__/fixtures'
import { GedcomParser } from '@/lib/gedcom/parser'
import { GedcomMapper } from '@/lib/gedcom/mapper'
import { GedcomGenerator } from '@/lib/gedcom/generator'

describe('Fixture Roundtrips', () => {
  const parser = new GedcomParser()
  const mapper = new GedcomMapper()
  const generator = new GedcomGenerator()

  it('three-generation survives import-export-reimport', () => {
    // Original
    const original = fixtures.threeGeneration()
    const parsed1 = parser.parse(original)

    // Map to Vamsa and back
    const mapped = mapper.mapFromGedcom(parsed1)
    const remapped = mapper.mapToGedcom(mapped.people, mapped.relationships)

    // Generate and re-parse
    const generated = generator.generate(remapped.individuals, remapped.families)
    const parsed2 = parser.parse(generated)

    // Verify
    expect(parsed2.individuals.length).toBe(parsed1.individuals.length)
    expect(parsed2.families.length).toBe(parsed1.families.length)
  })
})
```

### Test All Fixtures

```typescript
describe('All Fixtures', () => {
  Object.entries(fixtures).forEach(([name, loader]) => {
    it(`${name} parses without errors`, () => {
      const content = loader()
      const result = parser.parse(content)
      expect(result).toBeDefined()
      expect(result.individuals.length).toBeGreaterThan(0)
    })
  })
})
```

## Performance Benchmarks

Expected performance metrics:

```
Operation | Small | Medium | Large | Notes
-----------|-------|--------|-------|-------
Parse | 2ms | 5ms | 50ms | simple-person to large-family
Map | 1ms | 2ms | 20ms | From GEDCOM to Vamsa
Generate | 1ms | 3ms | 30ms | From Vamsa to GEDCOM
Export | 10ms | 25ms | 100ms | Including file I/O
Import | 50ms | 100ms | 500ms | Including validation + DB write
```

## Testing Checklist

- [ ] All 131 tests pass
- [ ] 100% coverage on parser/mapper/generator
- [ ] Import dialog appears on /admin/gedcom
- [ ] Export button downloads .ged file
- [ ] Validation preview shows before import
- [ ] simple-person imports successfully
- [ ] three-generation relationships correct
- [ ] multiple-marriages no confusion
- [ ] same-sex-couple handled properly
- [ ] date-formats all parsed
- [ ] special-names preserved
- [ ] long-notes line breaks intact
- [ ] sparse-data handled gracefully
- [ ] large-family completes quickly
- [ ] full-details complete preservation
- [ ] Roundtrip: import→export→reimport identical
- [ ] Roundtrip: export→import→export equivalent
- [ ] Error handling for invalid files
- [ ] File size limits enforced
- [ ] Admin-only access verified

## Troubleshooting

### Import fails with "Invalid GEDCOM"
- Check file is valid GEDCOM 5.5.1
- Verify HEAD and TRLR present
- Check for malformed xrefs
- Use `parser.validate()` for detailed errors

### Names not displaying correctly
- Verify UTF-8 encoding in header: `1 CHAR UTF-8`
- Check for invalid character codes
- Re-export to normalize

### Dates not parsing
- Check GEDCOM date format
- Verify month abbreviations (JAN, FEB, etc.)
- Check for extra spaces or typos

### Relationships missing
- Verify FAMC/FAMS links reference existing individuals
- Check FAM records have HUSB/WIFE and CHIL
- Verify xrefs match (e.g., @I1@ exactly)

## Resources

- **GEDCOM Spec**: https://github.com/FamilySearch/GEDCOM/tree/main/specification
- **Test Files**: `src/lib/gedcom/__tests__/`
- **Fixtures Guide**: `src/lib/gedcom/__tests__/FIXTURES.md`
- **Implementation**: `src/lib/gedcom/`
- **API Routes**: `src/app/api/admin/gedcom/`
- **Components**: `src/components/admin/gedcom-*`

## Next Steps

After successful testing:
1. Manual QA on production-like data
2. Performance testing with real genealogy software exports
3. User feedback on UI/UX
4. Performance optimization if needed
5. ANSEL encoding support (Phase 2)
6. GEDCOM 7.0 support (Phase 2)

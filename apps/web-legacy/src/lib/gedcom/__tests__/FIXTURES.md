# GEDCOM Test Fixtures

Comprehensive test data for GEDCOM 5.5.1 import/export functionality.

## Overview

This directory contains 10 real-world GEDCOM fixture files that cover various scenarios for meaningful testing of the import/export feature.

## Fixtures

### 1. simple-person.ged
**Size**: 259 bytes | **Entities**: 1 person

A single person with all common fields:
- Name: John Smith
- Gender: Male
- Birth: 15 JAN 1950 in Boston, Massachusetts, USA
- Profession: Software Engineer
- Notes: Single biographical note

**Use case**: Testing basic import/export with single individual

### 2. three-generation.ged
**Size**: 805 bytes | **Entities**: 6 people + 2 families

Three-generation family structure:
- **Generation 1**: John Smith (m) + Mary Johnson (f) - married 1945
- **Generation 2**: Robert Smith - their child
- **Generation 3**: David Smith + Elizabeth Smith - Robert's children

Demonstrates:
- Multi-generational parent-child relationships
- Spouse relationships with marriage dates
- Death dates
- FAMC/FAMS references

**Use case**: Testing complex family structures and relationship mapping

### 3. multiple-marriages.ged
**Size**: 888 bytes | **Entities**: 7 people + 2 families

Person with two marriages:
- **William Anderson** marries Dorothy Brown (1963, divorced 1973)
  - Children: James, Patricia
- **William Anderson** marries Margaret Davis (1980)
  - Children: Charles, Helen

Demonstrates:
- Multiple FAMS references in single person
- Divorce dates
- Children from different marriages
- No relationship confusion between families

**Use case**: Testing multiple marriage scenarios and FAMS handling

### 4. same-sex-couple.ged
**Size**: 420 bytes | **Entities**: 3 people + 1 family

Same-gender couple with child:
- **Michael Johnson** (m) + **Christopher Lee** (m) - married 2001
- Child: Emma Johnson (f)

Demonstrates:
- Two males as HUSB/WIFE (positional, not gendered)
- Same-sex couple not misinterpreted as parent-child
- Proper family structure

**Use case**: Testing gender handling and modern family structures

### 5. date-formats.ged
**Size**: 552 bytes | **Entities**: 7 people

Tests various GEDCOM date formats:
- Full date: 15 JAN 1985
- Month/year: JAN 1985
- Year only: 1985
- Approximate: ABT 1985
- Before: BEF 1980
- After: AFT 1990
- Between: BET 1975 AND 1985

**Use case**: Testing date parsing for all GEDCOM formats

### 6. special-names.ged
**Size**: 468 bytes | **Entities**: 5 people

Names with special characters:
- José García (accents)
- Marie-Claire Dubois (hyphen)
- Patrick O'Brien (apostrophe)
- Müller Von Bergen (umlaut + spaces)
- Jean-Pierre De La Cruz (complex multi-part)

Demonstrates:
- UTF-8 encoding handling
- International character support
- Name parsing with special characters
- Complex surname patterns

**Use case**: Testing UTF-8 encoding and international names

### 7. long-notes.ged
**Size**: 551 bytes | **Entities**: 1 person

Extended biography with CONT continuation lines:
- Alexander Hamilton
- Multi-line note spanning 5 continuation lines
- Historical biographical information

Demonstrates:
- CONT tag handling
- Line continuation and concatenation
- Multi-line note preservation

**Use case**: Testing continuation line handling and long text

### 8. sparse-data.ged
**Size**: 234 bytes | **Entities**: 3 people

Minimal data with missing optional fields:
- Person 1: Name only
- Person 2: Name + gender
- Person 3: Name + birth year only

Demonstrates:
- Graceful handling of missing fields
- No required fields except name
- Sparse data parsing

**Use case**: Testing robustness with incomplete data

### 9. large-family.ged
**Size**: 3.6 KB | **Entities**: 22+ people + 5 families

Comprehensive multi-generational family:
- 2 grandparents
- 4 children with different spouses
- 10+ grandchildren
- Multiple professions and places
- Complex relationship network

Demonstrates:
- Scaling with 20+ individuals
- Multiple family units
- Complex relationship networks
- Full biographical details

**Use case**: Testing performance and complex relationships at scale

### 10. full-details.ged
**Size**: 619 bytes | **Entities**: 2 people + 1 family

Complete biographical information:
- **Benjamin Franklin**
  - Birth: 17 JAN 1706 in Boston, Massachusetts, USA
  - Death: 17 APR 1790 in Philadelphia, Pennsylvania, USA
  - Professions: Printer, Publisher, Scientist, Diplomat
  - Notes: Founding Father and polymath
- **Deborah Read**
  - Birth: 1707 in Philadelphia, Pennsylvania, USA
  - Death: 1774 in Philadelphia, Pennsylvania, USA
- Married: 1730 in Philadelphia

Demonstrates:
- Complete biographical data
- Multiple professions
- Birth and death places
- Marriage with location
- Historical context in notes

**Use case**: Testing full data preservation

## Usage

### Import fixtures in tests

```typescript
import { fixtures } from './fixtures'

describe('GEDCOM Parser', () => {
  test('parses simple person', () => {
    const content = fixtures.simplePerson()
    const parser = new GedcomParser()
    const result = parser.parse(content)
    expect(result.individuals).toHaveLength(1)
  })
})
```

### Roundtrip testing

```typescript
test('three-generation family survives roundtrip', () => {
  const original = fixtures.threeGeneration()

  // Parse
  const parsed = parser.parse(original)

  // Map to Vamsa
  const mapped = mapper.mapFromGedcom(parsed)

  // Map back to GEDCOM
  const remapped = mapper.mapToGedcom(mapped.people, mapped.relationships)

  // Generate
  const generated = generator.generate(remapped.individuals, remapped.families)

  // Re-parse
  const reparsed = parser.parse(generated)

  // Verify data preserved
  expect(reparsed.individuals).toHaveLength(parsed.individuals.length)
  expect(reparsed.families).toHaveLength(parsed.families.length)
})
```

## Coverage Matrix

| Fixture | Single Person | Family | Marriage | Divorce | Children | Dates | Special Chars | Notes | Sparse | Large Scale |
|---------|---|---|---|---|---|---|---|---|---|---|
| simple-person | ✓ | - | - | - | - | ✓ | - | ✓ | - | - |
| three-generation | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - | - | - |
| multiple-marriages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| same-sex-couple | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - | - | - |
| date-formats | ✓ | - | - | - | - | ✓ | - | - | - | - |
| special-names | ✓ | - | - | - | - | ✓ | ✓ | - | - | - |
| long-notes | ✓ | - | - | - | - | ✓ | - | ✓ | - | - |
| sparse-data | ✓ | - | - | - | - | - | - | - | ✓ | - |
| large-family | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - | - | ✓ |
| full-details | ✓ | ✓ | ✓ | - | - | ✓ | - | ✓ | - | - |

## Testing Scenarios

### Parser Testing
- Use `simple-person` for basic parsing
- Use `date-formats` for date parsing variations
- Use `special-names` for UTF-8 and character handling
- Use `long-notes` for continuation line handling
- Use `sparse-data` for edge case handling

### Mapper Testing
- Use `three-generation` for relationship mapping
- Use `multiple-marriages` for FAMS handling
- Use `same-sex-couple` for gender handling
- Use `full-details` for all data mapping

### Generator Testing
- Use `simple-person` for basic output
- Use `large-family` for scaling
- Use `special-names` for UTF-8 output
- Use `long-notes` for CONT tag generation

### Roundtrip Testing
- Use all fixtures for complete roundtrip verification
- Verify no data loss through import→export→reimport
- Verify semantic equivalence through export→import→export

### UI Testing
- Use `simple-person` for basic import dialog
- Use `multiple-marriages` for complex preview
- Use `sparse-data` for error handling
- Use `large-family` for performance testing

## File Locations

All fixtures are in:
```
src/lib/gedcom/__tests__/fixtures/
├── index.ts
├── simple-person.ged
├── three-generation.ged
├── multiple-marriages.ged
├── same-sex-couple.ged
├── date-formats.ged
├── special-names.ged
├── long-notes.ged
├── sparse-data.ged
├── large-family.ged
└── full-details.ged
```

## Standards Compliance

All fixtures follow **GEDCOM 5.5.1 Final** (November 2019) specification:
- Proper line structure with level, tag, optional xref, optional value
- Valid xref format: `@I\d+@`, `@F\d+@`
- UTF-8 encoding declared in header
- All required records: HEAD, TRLR
- Valid tag nesting and hierarchy
- Proper date formatting

## Adding New Fixtures

To add a new fixture:
1. Create `new-scenario.ged` with valid GEDCOM 5.5.1 content
2. Add export to `index.ts`: `newScenario: () => fs.readFileSync(...)`
3. Document in this file with size, entities, and use cases
4. Add to coverage matrix

## References

- GEDCOM 5.5.1 Specification: https://edge.fscdn.org/assets/img/documents/ged551-5bac5e57fe88dd37df0e153d9c515335.pdf
- FamilySearch GEDCOM GitHub: https://github.com/FamilySearch/GEDCOM/tree/main/specification

/**
 * GEDCOM Test Fixtures
 *
 * Provides sample GEDCOM data for testing import/export functionality.
 * Each fixture represents a specific scenario that needs to be tested.
 */

/**
 * Multi-generation family with grandparents, parents, and children
 */
export const multiGenerationGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Robert /Johnson/
1 SEX M
1 BIRT
2 DATE 10 MAR 1940
2 PLAC Chicago, Illinois, USA
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mary /Williams/
1 SEX F
1 BIRT
2 DATE 15 JUN 1942
2 PLAC Chicago, Illinois, USA
1 FAMS @F1@
0 @I3@ INDI
1 NAME James /Johnson/
1 SEX M
1 BIRT
2 DATE 5 SEP 1965
2 PLAC Chicago, Illinois, USA
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Susan /Miller/
1 SEX F
1 BIRT
2 DATE 20 DEC 1967
2 PLAC Detroit, Michigan, USA
1 FAMS @F2@
0 @I5@ INDI
1 NAME Emily /Johnson/
1 SEX F
1 BIRT
2 DATE 12 APR 1995
2 PLAC New York, New York, USA
1 FAMC @F2@
0 @I6@ INDI
1 NAME Michael /Johnson/
1 SEX M
1 BIRT
2 DATE 8 NOV 1998
2 PLAC New York, New York, USA
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 20 JUN 1963
2 PLAC Chicago, Illinois, USA
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I5@
1 CHIL @I6@
1 MARR
2 DATE 15 AUG 1993
2 PLAC New York, New York, USA
0 TRLR`;

/**
 * Person with remarriage - divorced and remarried
 */
export const remarriageGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME David /Smith/
1 SEX M
1 BIRT
2 DATE 3 FEB 1970
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Linda /Brown/
1 SEX F
1 BIRT
2 DATE 15 MAY 1972
1 FAMS @F1@
0 @I3@ INDI
1 NAME Jennifer /Taylor/
1 SEX F
1 BIRT
2 DATE 22 SEP 1975
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 10 JUN 1995
1 DIV
2 DATE 15 MAR 2005
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I3@
1 MARR
2 DATE 20 OCT 2008
0 TRLR`;

/**
 * Person with notes attached
 */
export const personWithNotesGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Thomas /Anderson/
1 SEX M
1 BIRT
2 DATE 25 DEC 1960
2 PLAC Boston, Massachusetts, USA
1 NOTE This individual served in the military from 1980-1985.
2 CONT He was awarded the Bronze Star for valor.
2 CONT After service, he became a teacher.
0 TRLR`;

/**
 * Person with occupation/profession
 */
export const personWithOccupationGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Elizabeth /Clark/
1 SEX F
1 BIRT
2 DATE 8 JUL 1985
2 PLAC San Francisco, California, USA
1 OCCU Software Engineer
2 DATE FROM 2010 TO 2020
2 PLAC Silicon Valley, California
1 OCCU Engineering Manager
2 DATE FROM 2020
2 PLAC Remote
0 TRLR`;

/**
 * Deceased person with death information
 */
export const deceasedPersonGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME William /Harrison/
1 SEX M
1 BIRT
2 DATE 12 FEB 1920
2 PLAC Philadelphia, Pennsylvania, USA
1 DEAT
2 DATE 5 NOV 2010
2 PLAC Philadelphia, Pennsylvania, USA
2 CAUS Natural causes
1 BURI
2 DATE 10 NOV 2010
2 PLAC Laurel Hill Cemetery, Philadelphia
0 TRLR`;

/**
 * Invalid GEDCOM - missing required header fields
 */
export const invalidHeaderGedcom = `0 HEAD
1 SOUR TestSuite
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
0 TRLR`;

/**
 * Person with media/photo references
 */
export const personWithMediaGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Sarah /Wilson/
1 SEX F
1 BIRT
2 DATE 30 APR 1990
1 OBJE @M1@
0 @M1@ OBJE
1 FILE photos/sarah_portrait.jpg
2 FORM JPEG
2 TITL Portrait of Sarah Wilson
0 TRLR`;

/**
 * Large family with many children
 */
export const largeFamilyGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Charles /Davis/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
1 FAMS @F1@
0 @I2@ INDI
1 NAME Patricia /Moore/
1 SEX F
1 BIRT
2 DATE 15 MAR 1952
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child1 /Davis/
1 SEX M
1 FAMC @F1@
0 @I4@ INDI
1 NAME Child2 /Davis/
1 SEX F
1 FAMC @F1@
0 @I5@ INDI
1 NAME Child3 /Davis/
1 SEX M
1 FAMC @F1@
0 @I6@ INDI
1 NAME Child4 /Davis/
1 SEX F
1 FAMC @F1@
0 @I7@ INDI
1 NAME Child5 /Davis/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 CHIL @I5@
1 CHIL @I6@
1 CHIL @I7@
1 MARR
2 DATE 20 JUN 1975
0 TRLR`;

/**
 * Empty GEDCOM - minimal valid structure
 */
export const emptyGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 TRLR`;

/**
 * Person with custom events
 */
export const personWithEventsGedcom = `0 HEAD
1 SOUR TestSuite
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Richard /Thompson/
1 SEX M
1 BIRT
2 DATE 10 OCT 1980
1 BAPM
2 DATE 25 DEC 1980
2 PLAC St. Mary's Church, Boston
1 GRAD
2 DATE 15 MAY 2002
2 PLAC Harvard University
1 RETI
2 DATE 1 JAN 2045
0 TRLR`;

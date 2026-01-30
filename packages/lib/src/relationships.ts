/**
 * Relationship type utilities for family tree management
 *
 * Provides utilities for:
 * - Relationship type categorization
 * - Gender-aware relationship labels
 * - In-law and step relationship detection
 */

/**
 * All supported relationship types
 */
export type RelationshipType =
  // Core family relationships
  | "PARENT"
  | "CHILD"
  | "SPOUSE"
  | "SIBLING"
  // In-law relationships
  | "PARENT_IN_LAW"
  | "CHILD_IN_LAW"
  | "SIBLING_IN_LAW"
  // Step relationships
  | "STEP_PARENT"
  | "STEP_CHILD"
  | "STEP_SIBLING";

/**
 * Gender types for relationship label formatting
 */
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;

/**
 * Categories of relationship types
 */
export type RelationshipCategory = "blood" | "marriage" | "inlaw" | "step";

/**
 * Core blood relationships (biological/adoptive)
 */
export const BLOOD_RELATIONSHIPS: Array<RelationshipType> = [
  "PARENT",
  "CHILD",
  "SIBLING",
];

/**
 * Marriage relationship
 */
export const MARRIAGE_RELATIONSHIPS: Array<RelationshipType> = ["SPOUSE"];

/**
 * In-law relationships (created through marriage)
 */
export const INLAW_RELATIONSHIPS: Array<RelationshipType> = [
  "PARENT_IN_LAW",
  "CHILD_IN_LAW",
  "SIBLING_IN_LAW",
];

/**
 * Step relationships (created through remarriage)
 */
export const STEP_RELATIONSHIPS: Array<RelationshipType> = [
  "STEP_PARENT",
  "STEP_CHILD",
  "STEP_SIBLING",
];

/**
 * All relationship types
 */
export const ALL_RELATIONSHIP_TYPES: Array<RelationshipType> = [
  ...BLOOD_RELATIONSHIPS,
  ...MARRIAGE_RELATIONSHIPS,
  ...INLAW_RELATIONSHIPS,
  ...STEP_RELATIONSHIPS,
];

/**
 * Check if a relationship type is a blood/adoptive relationship
 */
export function isBloodRelationship(type: RelationshipType): boolean {
  return BLOOD_RELATIONSHIPS.includes(type);
}

/**
 * Check if a relationship type is an in-law relationship
 */
export function isInlawRelationship(type: RelationshipType): boolean {
  return INLAW_RELATIONSHIPS.includes(type);
}

/**
 * Check if a relationship type is a step relationship
 */
export function isStepRelationship(type: RelationshipType): boolean {
  return STEP_RELATIONSHIPS.includes(type);
}

/**
 * Check if a relationship type is automatically derived (in-law or step)
 */
export function isDerivedRelationship(type: RelationshipType): boolean {
  return isInlawRelationship(type) || isStepRelationship(type);
}

/**
 * Get the category of a relationship type
 */
export function getRelationshipCategory(
  type: RelationshipType
): RelationshipCategory {
  if (BLOOD_RELATIONSHIPS.includes(type)) return "blood";
  if (MARRIAGE_RELATIONSHIPS.includes(type)) return "marriage";
  if (INLAW_RELATIONSHIPS.includes(type)) return "inlaw";
  if (STEP_RELATIONSHIPS.includes(type)) return "step";
  return "blood"; // Default fallback
}

/**
 * Gender-neutral relationship labels
 */
const NEUTRAL_LABELS: Record<RelationshipType, string> = {
  PARENT: "Parent",
  CHILD: "Child",
  SPOUSE: "Spouse",
  SIBLING: "Sibling",
  PARENT_IN_LAW: "Parent-in-law",
  CHILD_IN_LAW: "Child-in-law",
  SIBLING_IN_LAW: "Sibling-in-law",
  STEP_PARENT: "Step-parent",
  STEP_CHILD: "Step-child",
  STEP_SIBLING: "Step-sibling",
};

/**
 * Male relationship labels
 */
const MALE_LABELS: Record<RelationshipType, string> = {
  PARENT: "Father",
  CHILD: "Son",
  SPOUSE: "Husband",
  SIBLING: "Brother",
  PARENT_IN_LAW: "Father-in-law",
  CHILD_IN_LAW: "Son-in-law",
  SIBLING_IN_LAW: "Brother-in-law",
  STEP_PARENT: "Step-father",
  STEP_CHILD: "Step-son",
  STEP_SIBLING: "Step-brother",
};

/**
 * Female relationship labels
 */
const FEMALE_LABELS: Record<RelationshipType, string> = {
  PARENT: "Mother",
  CHILD: "Daughter",
  SPOUSE: "Wife",
  SIBLING: "Sister",
  PARENT_IN_LAW: "Mother-in-law",
  CHILD_IN_LAW: "Daughter-in-law",
  SIBLING_IN_LAW: "Sister-in-law",
  STEP_PARENT: "Step-mother",
  STEP_CHILD: "Step-daughter",
  STEP_SIBLING: "Step-sister",
};

/**
 * Get a human-readable label for a relationship type
 *
 * @param type - The relationship type
 * @param gender - Optional gender for gender-specific labels
 * @returns Human-readable label
 *
 * @example
 * getRelationshipLabel("PARENT_IN_LAW")
 * // "Parent-in-law"
 *
 * getRelationshipLabel("PARENT_IN_LAW", "MALE")
 * // "Father-in-law"
 */
export function getRelationshipLabel(
  type: RelationshipType,
  gender?: Gender
): string {
  if (gender === "MALE") {
    return MALE_LABELS[type] || NEUTRAL_LABELS[type] || type;
  }
  if (gender === "FEMALE") {
    return FEMALE_LABELS[type] || NEUTRAL_LABELS[type] || type;
  }
  return NEUTRAL_LABELS[type] || type;
}

/**
 * Get the inverse relationship type
 *
 * @param type - The relationship type
 * @returns The inverse relationship type
 *
 * @example
 * getInverseRelationship("PARENT") // "CHILD"
 * getInverseRelationship("SIBLING_IN_LAW") // "SIBLING_IN_LAW"
 */
export function getInverseRelationship(
  type: RelationshipType
): RelationshipType {
  const inverses: Record<RelationshipType, RelationshipType> = {
    PARENT: "CHILD",
    CHILD: "PARENT",
    SPOUSE: "SPOUSE",
    SIBLING: "SIBLING",
    PARENT_IN_LAW: "CHILD_IN_LAW",
    CHILD_IN_LAW: "PARENT_IN_LAW",
    SIBLING_IN_LAW: "SIBLING_IN_LAW",
    STEP_PARENT: "STEP_CHILD",
    STEP_CHILD: "STEP_PARENT",
    STEP_SIBLING: "STEP_SIBLING",
  };
  return inverses[type] || type;
}

/**
 * Relationship type options grouped by category for UI select components
 */
export const RELATIONSHIP_TYPE_OPTIONS = [
  {
    category: "Blood Relatives",
    options: [
      { value: "PARENT" as RelationshipType, label: "Parent" },
      { value: "CHILD" as RelationshipType, label: "Child" },
      { value: "SIBLING" as RelationshipType, label: "Sibling" },
    ],
  },
  {
    category: "Marriage",
    options: [{ value: "SPOUSE" as RelationshipType, label: "Spouse" }],
  },
  {
    category: "In-Laws",
    options: [
      { value: "PARENT_IN_LAW" as RelationshipType, label: "Parent-in-law" },
      { value: "CHILD_IN_LAW" as RelationshipType, label: "Child-in-law" },
      { value: "SIBLING_IN_LAW" as RelationshipType, label: "Sibling-in-law" },
    ],
  },
  {
    category: "Step Family",
    options: [
      { value: "STEP_PARENT" as RelationshipType, label: "Step-parent" },
      { value: "STEP_CHILD" as RelationshipType, label: "Step-child" },
      { value: "STEP_SIBLING" as RelationshipType, label: "Step-sibling" },
    ],
  },
];

/**
 * Get relationship options for a UI select, optionally filtered by category
 */
export function getRelationshipOptions(
  categories?: Array<RelationshipCategory>
): Array<{ value: RelationshipType; label: string; category: string }> {
  const allOptions = RELATIONSHIP_TYPE_OPTIONS.flatMap((group) =>
    group.options.map((opt) => ({
      ...opt,
      category: group.category,
    }))
  );

  if (!categories || categories.length === 0) {
    return allOptions;
  }

  const categoryMap: Record<string, RelationshipCategory> = {
    "Blood Relatives": "blood",
    Marriage: "marriage",
    "In-Laws": "inlaw",
    "Step Family": "step",
  };

  return allOptions.filter((opt) => {
    const cat = categoryMap[opt.category];
    return cat && categories.includes(cat);
  });
}

/**
 * Check if two relationship types can coexist between the same two people
 *
 * For example, two people can be both siblings and step-siblings in
 * complex blended family situations, but they cannot be both parent and child.
 */
export function canCoexist(
  type1: RelationshipType,
  type2: RelationshipType
): boolean {
  // Same type always conflicts
  if (type1 === type2) return false;

  // Parent-child relationships conflict
  const parentChild = new Set(["PARENT", "CHILD"]);
  if (parentChild.has(type1) && parentChild.has(type2)) return false;

  // Step-parent and step-child conflict similarly
  const stepParentChild = new Set(["STEP_PARENT", "STEP_CHILD"]);
  if (stepParentChild.has(type1) && stepParentChild.has(type2)) return false;

  // In-law parent and in-law child conflict
  const inlawParentChild = new Set(["PARENT_IN_LAW", "CHILD_IN_LAW"]);
  if (inlawParentChild.has(type1) && inlawParentChild.has(type2)) return false;

  // All other combinations can coexist (e.g., sibling + sibling-in-law in complex families)
  return true;
}

/**
 * Information about what in-law relationships should be created
 * when a spouse relationship is established
 */
export interface InLawCreationPlan {
  /** The spouse relationship that triggers in-law creation */
  spouseRelationshipId: string;
  /** In-law relationships to create */
  relationships: Array<{
    personId: string;
    relatedPersonId: string;
    type: RelationshipType;
  }>;
}

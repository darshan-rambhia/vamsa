import { describe, it, expect } from "bun:test";
import {
  type RelationshipType,
  BLOOD_RELATIONSHIPS,
  MARRIAGE_RELATIONSHIPS,
  INLAW_RELATIONSHIPS,
  STEP_RELATIONSHIPS,
  ALL_RELATIONSHIP_TYPES,
  isBloodRelationship,
  isInlawRelationship,
  isStepRelationship,
  isDerivedRelationship,
  getRelationshipCategory,
  getRelationshipLabel,
  getInverseRelationship,
  RELATIONSHIP_TYPE_OPTIONS,
  getRelationshipOptions,
  canCoexist,
} from "./relationships";

describe("Relationship Type Constants", () => {
  it("BLOOD_RELATIONSHIPS contains core family types", () => {
    expect(BLOOD_RELATIONSHIPS).toContain("PARENT");
    expect(BLOOD_RELATIONSHIPS).toContain("CHILD");
    expect(BLOOD_RELATIONSHIPS).toContain("SIBLING");
    expect(BLOOD_RELATIONSHIPS).not.toContain("SPOUSE");
  });

  it("MARRIAGE_RELATIONSHIPS contains spouse", () => {
    expect(MARRIAGE_RELATIONSHIPS).toContain("SPOUSE");
    expect(MARRIAGE_RELATIONSHIPS).toHaveLength(1);
  });

  it("INLAW_RELATIONSHIPS contains in-law types", () => {
    expect(INLAW_RELATIONSHIPS).toContain("PARENT_IN_LAW");
    expect(INLAW_RELATIONSHIPS).toContain("CHILD_IN_LAW");
    expect(INLAW_RELATIONSHIPS).toContain("SIBLING_IN_LAW");
    expect(INLAW_RELATIONSHIPS).toHaveLength(3);
  });

  it("STEP_RELATIONSHIPS contains step types", () => {
    expect(STEP_RELATIONSHIPS).toContain("STEP_PARENT");
    expect(STEP_RELATIONSHIPS).toContain("STEP_CHILD");
    expect(STEP_RELATIONSHIPS).toContain("STEP_SIBLING");
    expect(STEP_RELATIONSHIPS).toHaveLength(3);
  });

  it("ALL_RELATIONSHIP_TYPES includes all types", () => {
    expect(ALL_RELATIONSHIP_TYPES).toHaveLength(10);
    expect(ALL_RELATIONSHIP_TYPES).toContain("PARENT");
    expect(ALL_RELATIONSHIP_TYPES).toContain("SPOUSE");
    expect(ALL_RELATIONSHIP_TYPES).toContain("PARENT_IN_LAW");
    expect(ALL_RELATIONSHIP_TYPES).toContain("STEP_PARENT");
  });
});

describe("isBloodRelationship", () => {
  it("returns true for blood relationships", () => {
    expect(isBloodRelationship("PARENT")).toBe(true);
    expect(isBloodRelationship("CHILD")).toBe(true);
    expect(isBloodRelationship("SIBLING")).toBe(true);
  });

  it("returns false for non-blood relationships", () => {
    expect(isBloodRelationship("SPOUSE")).toBe(false);
    expect(isBloodRelationship("PARENT_IN_LAW")).toBe(false);
    expect(isBloodRelationship("STEP_PARENT")).toBe(false);
  });
});

describe("isInlawRelationship", () => {
  it("returns true for in-law relationships", () => {
    expect(isInlawRelationship("PARENT_IN_LAW")).toBe(true);
    expect(isInlawRelationship("CHILD_IN_LAW")).toBe(true);
    expect(isInlawRelationship("SIBLING_IN_LAW")).toBe(true);
  });

  it("returns false for non-in-law relationships", () => {
    expect(isInlawRelationship("PARENT")).toBe(false);
    expect(isInlawRelationship("SPOUSE")).toBe(false);
    expect(isInlawRelationship("STEP_PARENT")).toBe(false);
  });
});

describe("isStepRelationship", () => {
  it("returns true for step relationships", () => {
    expect(isStepRelationship("STEP_PARENT")).toBe(true);
    expect(isStepRelationship("STEP_CHILD")).toBe(true);
    expect(isStepRelationship("STEP_SIBLING")).toBe(true);
  });

  it("returns false for non-step relationships", () => {
    expect(isStepRelationship("PARENT")).toBe(false);
    expect(isStepRelationship("SPOUSE")).toBe(false);
    expect(isStepRelationship("PARENT_IN_LAW")).toBe(false);
  });
});

describe("isDerivedRelationship", () => {
  it("returns true for in-law relationships", () => {
    expect(isDerivedRelationship("PARENT_IN_LAW")).toBe(true);
    expect(isDerivedRelationship("CHILD_IN_LAW")).toBe(true);
    expect(isDerivedRelationship("SIBLING_IN_LAW")).toBe(true);
  });

  it("returns true for step relationships", () => {
    expect(isDerivedRelationship("STEP_PARENT")).toBe(true);
    expect(isDerivedRelationship("STEP_CHILD")).toBe(true);
    expect(isDerivedRelationship("STEP_SIBLING")).toBe(true);
  });

  it("returns false for core relationships", () => {
    expect(isDerivedRelationship("PARENT")).toBe(false);
    expect(isDerivedRelationship("CHILD")).toBe(false);
    expect(isDerivedRelationship("SPOUSE")).toBe(false);
    expect(isDerivedRelationship("SIBLING")).toBe(false);
  });
});

describe("getRelationshipCategory", () => {
  it("returns blood for blood relationships", () => {
    expect(getRelationshipCategory("PARENT")).toBe("blood");
    expect(getRelationshipCategory("CHILD")).toBe("blood");
    expect(getRelationshipCategory("SIBLING")).toBe("blood");
  });

  it("returns marriage for spouse", () => {
    expect(getRelationshipCategory("SPOUSE")).toBe("marriage");
  });

  it("returns inlaw for in-law relationships", () => {
    expect(getRelationshipCategory("PARENT_IN_LAW")).toBe("inlaw");
    expect(getRelationshipCategory("CHILD_IN_LAW")).toBe("inlaw");
    expect(getRelationshipCategory("SIBLING_IN_LAW")).toBe("inlaw");
  });

  it("returns step for step relationships", () => {
    expect(getRelationshipCategory("STEP_PARENT")).toBe("step");
    expect(getRelationshipCategory("STEP_CHILD")).toBe("step");
    expect(getRelationshipCategory("STEP_SIBLING")).toBe("step");
  });
});

describe("getRelationshipLabel", () => {
  describe("without gender", () => {
    it("returns neutral labels for core relationships", () => {
      expect(getRelationshipLabel("PARENT")).toBe("Parent");
      expect(getRelationshipLabel("CHILD")).toBe("Child");
      expect(getRelationshipLabel("SPOUSE")).toBe("Spouse");
      expect(getRelationshipLabel("SIBLING")).toBe("Sibling");
    });

    it("returns neutral labels for in-law relationships", () => {
      expect(getRelationshipLabel("PARENT_IN_LAW")).toBe("Parent-in-law");
      expect(getRelationshipLabel("CHILD_IN_LAW")).toBe("Child-in-law");
      expect(getRelationshipLabel("SIBLING_IN_LAW")).toBe("Sibling-in-law");
    });

    it("returns neutral labels for step relationships", () => {
      expect(getRelationshipLabel("STEP_PARENT")).toBe("Step-parent");
      expect(getRelationshipLabel("STEP_CHILD")).toBe("Step-child");
      expect(getRelationshipLabel("STEP_SIBLING")).toBe("Step-sibling");
    });
  });

  describe("with MALE gender", () => {
    it("returns male-specific labels", () => {
      expect(getRelationshipLabel("PARENT", "MALE")).toBe("Father");
      expect(getRelationshipLabel("CHILD", "MALE")).toBe("Son");
      expect(getRelationshipLabel("SPOUSE", "MALE")).toBe("Husband");
      expect(getRelationshipLabel("SIBLING", "MALE")).toBe("Brother");
    });

    it("returns male-specific in-law labels", () => {
      expect(getRelationshipLabel("PARENT_IN_LAW", "MALE")).toBe(
        "Father-in-law"
      );
      expect(getRelationshipLabel("CHILD_IN_LAW", "MALE")).toBe("Son-in-law");
      expect(getRelationshipLabel("SIBLING_IN_LAW", "MALE")).toBe(
        "Brother-in-law"
      );
    });

    it("returns male-specific step labels", () => {
      expect(getRelationshipLabel("STEP_PARENT", "MALE")).toBe("Step-father");
      expect(getRelationshipLabel("STEP_CHILD", "MALE")).toBe("Step-son");
      expect(getRelationshipLabel("STEP_SIBLING", "MALE")).toBe("Step-brother");
    });
  });

  describe("with FEMALE gender", () => {
    it("returns female-specific labels", () => {
      expect(getRelationshipLabel("PARENT", "FEMALE")).toBe("Mother");
      expect(getRelationshipLabel("CHILD", "FEMALE")).toBe("Daughter");
      expect(getRelationshipLabel("SPOUSE", "FEMALE")).toBe("Wife");
      expect(getRelationshipLabel("SIBLING", "FEMALE")).toBe("Sister");
    });

    it("returns female-specific in-law labels", () => {
      expect(getRelationshipLabel("PARENT_IN_LAW", "FEMALE")).toBe(
        "Mother-in-law"
      );
      expect(getRelationshipLabel("CHILD_IN_LAW", "FEMALE")).toBe(
        "Daughter-in-law"
      );
      expect(getRelationshipLabel("SIBLING_IN_LAW", "FEMALE")).toBe(
        "Sister-in-law"
      );
    });

    it("returns female-specific step labels", () => {
      expect(getRelationshipLabel("STEP_PARENT", "FEMALE")).toBe("Step-mother");
      expect(getRelationshipLabel("STEP_CHILD", "FEMALE")).toBe(
        "Step-daughter"
      );
      expect(getRelationshipLabel("STEP_SIBLING", "FEMALE")).toBe(
        "Step-sister"
      );
    });
  });

  describe("with OTHER/null gender", () => {
    it("returns neutral labels for OTHER gender", () => {
      expect(getRelationshipLabel("PARENT", "OTHER")).toBe("Parent");
      expect(getRelationshipLabel("PARENT", "PREFER_NOT_TO_SAY")).toBe(
        "Parent"
      );
    });

    it("returns neutral labels for null gender", () => {
      expect(getRelationshipLabel("PARENT", null)).toBe("Parent");
    });
  });
});

describe("getInverseRelationship", () => {
  it("returns inverse for parent-child", () => {
    expect(getInverseRelationship("PARENT")).toBe("CHILD");
    expect(getInverseRelationship("CHILD")).toBe("PARENT");
  });

  it("returns self for symmetric relationships", () => {
    expect(getInverseRelationship("SPOUSE")).toBe("SPOUSE");
    expect(getInverseRelationship("SIBLING")).toBe("SIBLING");
    expect(getInverseRelationship("SIBLING_IN_LAW")).toBe("SIBLING_IN_LAW");
    expect(getInverseRelationship("STEP_SIBLING")).toBe("STEP_SIBLING");
  });

  it("returns inverse for in-law parent-child", () => {
    expect(getInverseRelationship("PARENT_IN_LAW")).toBe("CHILD_IN_LAW");
    expect(getInverseRelationship("CHILD_IN_LAW")).toBe("PARENT_IN_LAW");
  });

  it("returns inverse for step parent-child", () => {
    expect(getInverseRelationship("STEP_PARENT")).toBe("STEP_CHILD");
    expect(getInverseRelationship("STEP_CHILD")).toBe("STEP_PARENT");
  });
});

describe("RELATIONSHIP_TYPE_OPTIONS", () => {
  it("has all four categories", () => {
    const categories = RELATIONSHIP_TYPE_OPTIONS.map((g) => g.category);
    expect(categories).toContain("Blood Relatives");
    expect(categories).toContain("Marriage");
    expect(categories).toContain("In-Laws");
    expect(categories).toContain("Step Family");
  });

  it("has correct options in each category", () => {
    const bloodGroup = RELATIONSHIP_TYPE_OPTIONS.find(
      (g) => g.category === "Blood Relatives"
    );
    expect(bloodGroup?.options).toHaveLength(3);

    const marriageGroup = RELATIONSHIP_TYPE_OPTIONS.find(
      (g) => g.category === "Marriage"
    );
    expect(marriageGroup?.options).toHaveLength(1);

    const inlawGroup = RELATIONSHIP_TYPE_OPTIONS.find(
      (g) => g.category === "In-Laws"
    );
    expect(inlawGroup?.options).toHaveLength(3);

    const stepGroup = RELATIONSHIP_TYPE_OPTIONS.find(
      (g) => g.category === "Step Family"
    );
    expect(stepGroup?.options).toHaveLength(3);
  });
});

describe("getRelationshipOptions", () => {
  it("returns all options when no categories specified", () => {
    const options = getRelationshipOptions();
    expect(options).toHaveLength(10);
  });

  it("returns all options for empty array", () => {
    const options = getRelationshipOptions([]);
    expect(options).toHaveLength(10);
  });

  it("filters by blood category", () => {
    const options = getRelationshipOptions(["blood"]);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toContain("PARENT");
    expect(options.map((o) => o.value)).toContain("CHILD");
    expect(options.map((o) => o.value)).toContain("SIBLING");
  });

  it("filters by marriage category", () => {
    const options = getRelationshipOptions(["marriage"]);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe("SPOUSE");
  });

  it("filters by inlaw category", () => {
    const options = getRelationshipOptions(["inlaw"]);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toContain("PARENT_IN_LAW");
  });

  it("filters by step category", () => {
    const options = getRelationshipOptions(["step"]);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toContain("STEP_PARENT");
  });

  it("combines multiple categories", () => {
    const options = getRelationshipOptions(["blood", "marriage"]);
    expect(options).toHaveLength(4);
  });
});

describe("canCoexist", () => {
  it("returns false for same type", () => {
    expect(canCoexist("PARENT", "PARENT")).toBe(false);
    expect(canCoexist("SPOUSE", "SPOUSE")).toBe(false);
  });

  it("returns false for parent-child conflict", () => {
    expect(canCoexist("PARENT", "CHILD")).toBe(false);
    expect(canCoexist("CHILD", "PARENT")).toBe(false);
  });

  it("returns false for step parent-child conflict", () => {
    expect(canCoexist("STEP_PARENT", "STEP_CHILD")).toBe(false);
    expect(canCoexist("STEP_CHILD", "STEP_PARENT")).toBe(false);
  });

  it("returns false for in-law parent-child conflict", () => {
    expect(canCoexist("PARENT_IN_LAW", "CHILD_IN_LAW")).toBe(false);
    expect(canCoexist("CHILD_IN_LAW", "PARENT_IN_LAW")).toBe(false);
  });

  it("returns true for sibling and sibling-in-law", () => {
    expect(canCoexist("SIBLING", "SIBLING_IN_LAW")).toBe(true);
  });

  it("returns true for spouse and sibling-in-law", () => {
    // These could coexist in complex families (though unusual)
    expect(canCoexist("SPOUSE", "SIBLING_IN_LAW")).toBe(true);
  });

  it("returns true for parent and parent-in-law", () => {
    // Different categories, can coexist
    expect(canCoexist("PARENT", "PARENT_IN_LAW")).toBe(true);
  });
});

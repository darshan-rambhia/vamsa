/**
 * Profile Claiming Utilities for OIDC Users
 *
 * Provides matching algorithms and utilities for linking OIDC users
 * to their person profiles in the family tree.
 */

/**
 * Profile claim status
 */
export type ProfileClaimStatus = "PENDING" | "CLAIMED" | "SKIPPED" | "NA";

/**
 * Claimable person profile data
 */
export interface ClaimableProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date | string | null;
}

/**
 * User data for matching
 */
export interface ClaimingUser {
  email: string;
  name: string | null;
  oidcProvider?: string | null;
}

/**
 * Profile match with score and reasons
 */
export interface ProfileMatch {
  profile: ClaimableProfile;
  score: number;
  reasons: string[];
}

/**
 * Score a profile match based on various factors
 *
 * Scoring criteria:
 * - Exact email match: 100 points
 * - Exact name match: 80 points
 * - Partial name match: 50 points
 * - Email domain match: 30 points
 *
 * @param user - The claiming user
 * @param profile - The potential profile to claim
 * @returns Match score and reasons
 */
export function scoreProfileMatch(
  user: ClaimingUser,
  profile: ClaimableProfile
): ProfileMatch {
  let score = 0;
  const reasons: string[] = [];

  // Exact email match (strongest signal)
  if (user.email && profile.email) {
    const userEmail = user.email.toLowerCase().trim();
    const profileEmail = profile.email.toLowerCase().trim();

    if (userEmail === profileEmail) {
      score += 100;
      reasons.push("Email matches exactly");
    } else {
      // Email domain match (family domain)
      const userDomain = userEmail.split("@")[1];
      const profileDomain = profileEmail.split("@")[1];

      if (userDomain && profileDomain && userDomain === profileDomain) {
        score += 30;
        reasons.push("Same email domain");
      }
    }
  }

  // Name matching
  if (user.name && profile.firstName && profile.lastName) {
    const userName = normalizeName(user.name);
    const profileFullName = normalizeName(
      `${profile.firstName} ${profile.lastName}`
    );
    const profileFirstName = normalizeName(profile.firstName);
    const profileLastName = normalizeName(profile.lastName);

    // Exact full name match
    if (userName === profileFullName) {
      score += 80;
      reasons.push("Name matches exactly");
    }
    // First name and last name both present in user name
    else if (
      userName.includes(profileFirstName) &&
      userName.includes(profileLastName)
    ) {
      score += 70;
      reasons.push("First and last name found in user name");
    }
    // User name contains profile full name
    else if (userName.includes(profileFullName)) {
      score += 50;
      reasons.push("User name contains profile name");
    }
    // Profile full name contains user name
    else if (profileFullName.includes(userName) && userName.length > 2) {
      score += 50;
      reasons.push("Profile name contains user name");
    }
    // Just first name match
    else if (
      userName.includes(profileFirstName) &&
      profileFirstName.length > 2
    ) {
      score += 30;
      reasons.push("First name matches");
    }
    // Just last name match
    else if (userName.includes(profileLastName) && profileLastName.length > 2) {
      score += 20;
      reasons.push("Last name matches");
    }
  }

  return { profile, score, reasons };
}

/**
 * Normalize a name for comparison
 *
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes common titles/suffixes
 */
function normalizeName(name: string): string {
  // Use split/filter/join instead of regex for whitespace normalization to avoid ReDoS
  const normalized = name
    .toLowerCase()
    .split(/\s/)
    .filter((s) => s.length > 0)
    .join(" ");
  // Remove common titles and suffixes
  return normalized
    .replace(/^(mr|mrs|ms|dr|prof)\.\s*/i, "")
    .replace(/\s*(jr|sr|ii|iii|iv|v)\.?\s*$/i, "");
}

/**
 * Find suggested profile matches for a user
 *
 * @param user - The claiming user
 * @param profiles - All claimable profiles
 * @param minScore - Minimum score to include (default: 30)
 * @returns Sorted array of matching profiles
 */
export function findSuggestedMatches(
  user: ClaimingUser,
  profiles: ClaimableProfile[],
  minScore: number = 30
): ProfileMatch[] {
  const matches = profiles
    .map((profile) => scoreProfileMatch(user, profile))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Check if a profile is highly likely to match the user
 *
 * A profile is considered a "confident match" if:
 * - Score is 100+ (email match)
 * - OR score is 80+ with multiple matching factors
 *
 * @param match - The profile match
 * @returns true if this is a confident match
 */
export function isConfidentMatch(match: ProfileMatch): boolean {
  return match.score >= 100 || (match.score >= 80 && match.reasons.length >= 2);
}

/**
 * Get the best match from a list of profiles
 *
 * @param user - The claiming user
 * @param profiles - All claimable profiles
 * @returns The best match, or null if no good matches
 */
export function getBestMatch(
  user: ClaimingUser,
  profiles: ClaimableProfile[]
): ProfileMatch | null {
  const matches = findSuggestedMatches(user, profiles);

  if (matches.length === 0) {
    return null;
  }

  const best = matches[0];

  // Only return if it's a reasonable match
  if (best.score >= 50) {
    return best;
  }

  return null;
}

/**
 * Group profiles by match quality
 *
 * @param user - The claiming user
 * @param profiles - All claimable profiles
 * @returns Grouped profiles: confident, suggested, and other
 */
export function groupProfilesByMatch(
  user: ClaimingUser,
  profiles: ClaimableProfile[]
): {
  confident: ProfileMatch[];
  suggested: ProfileMatch[];
  other: ClaimableProfile[];
} {
  const allMatches = profiles.map((profile) =>
    scoreProfileMatch(user, profile)
  );

  const confident: ProfileMatch[] = [];
  const suggested: ProfileMatch[] = [];
  const matchedIds = new Set<string>();

  for (const match of allMatches) {
    if (isConfidentMatch(match)) {
      confident.push(match);
      matchedIds.add(match.profile.id);
    } else if (match.score >= 30) {
      suggested.push(match);
      matchedIds.add(match.profile.id);
    }
  }

  // Sort by score
  confident.sort((a, b) => b.score - a.score);
  suggested.sort((a, b) => b.score - a.score);

  // Other profiles not matched
  const other = profiles.filter((p) => !matchedIds.has(p.id));

  return { confident, suggested, other };
}

/**
 * Validate that a claim can be made
 *
 * @param user - The claiming user
 * @param profile - The profile being claimed
 * @param claimedPersonIds - IDs of already-claimed profiles
 * @returns Validation result
 */
export function validateClaim(
  user: {
    id: string;
    personId: string | null;
    profileClaimStatus: ProfileClaimStatus;
    oidcProvider: string | null;
  },
  profile: ClaimableProfile & { isLiving: boolean },
  claimedPersonIds: string[]
): { valid: boolean; error?: string } {
  // User already has a profile
  if (user.personId) {
    return { valid: false, error: "You have already claimed a profile" };
  }

  // User already claimed (shouldn't happen, but defensive)
  if (user.profileClaimStatus === "CLAIMED") {
    return {
      valid: false,
      error: "You have already completed profile claiming",
    };
  }

  // Profile is not living
  if (!profile.isLiving) {
    return { valid: false, error: "Cannot claim a non-living profile" };
  }

  // Profile already claimed by another user
  if (claimedPersonIds.includes(profile.id)) {
    return {
      valid: false,
      error: "This profile is already claimed by another user",
    };
  }

  return { valid: true };
}

/**
 * Get display text for claim status
 */
export function getClaimStatusText(status: ProfileClaimStatus): string {
  switch (status) {
    case "PENDING":
      return "Profile not yet claimed";
    case "CLAIMED":
      return "Profile claimed";
    case "SKIPPED":
      return "Profile claiming skipped";
    case "NA":
      return "Not applicable";
    default:
      return "Unknown status";
  }
}

/**
 * Check if a user should see the profile claim modal
 *
 * @param user - The user to check
 * @returns true if user should see claim modal
 */
export function shouldShowClaimModal(user: {
  oidcProvider: string | null;
  personId: string | null;
  profileClaimStatus: ProfileClaimStatus;
}): boolean {
  // Only show for OIDC users
  if (!user.oidcProvider) {
    return false;
  }

  // Only show if status is PENDING and no person linked
  return user.profileClaimStatus === "PENDING" && !user.personId;
}

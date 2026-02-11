/**
 * General utility functions shared across the application.
 */

/**
 * Generate a random password that meets complexity requirements.
 * Guarantees 12+ characters and at least 3 of 4 character classes.
 */
export function generateRandomPassword(length: number = 16): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;

  // Guarantee at least one from each class
  let password = "";
  password += upper.charAt(Math.floor(Math.random() * upper.length));
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  // Fill remaining with random characters
  for (let i = 4; i < Math.max(length, 12); i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }

  // Shuffle the password (Fisher-Yates)
  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

/**
 * Get initials from first and last name.
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

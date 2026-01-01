import { db } from "./db";

const defaultLabels = {
  dateOfPassing: "Date of Passing",
  dateOfBirth: "Date of Birth",
  nativePlace: "Native Place",
  birthPlace: "Birth Place",
  spouse: "Spouse",
  father: "Father",
  mother: "Mother",
  children: "Children",
  siblings: "Siblings",
  profession: "Profession",
  employer: "Employer",
  currentAddress: "Current Address",
  workAddress: "Work Address",
  email: "Email",
  phone: "Phone",
  maidenName: "Maiden Name",
  bio: "About",
};

export type Labels = typeof defaultLabels;

export async function getLabels(): Promise<Labels> {
  try {
    const settings = await db.familySettings.findFirst();
    if (settings?.customLabels) {
      return { ...defaultLabels, ...(settings.customLabels as Partial<Labels>) };
    }
  } catch {
    return defaultLabels;
  }
  return defaultLabels;
}

export { defaultLabels };

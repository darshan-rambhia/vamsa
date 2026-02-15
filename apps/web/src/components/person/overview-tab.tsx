import { Card, CardContent } from "@vamsa/ui/primitives";
import { AISuggestions } from "../ai/suggestions";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  maidenName: string | null;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  birthPlace: string | null;
  nativePlace: string | null;
  gender: string | null;
  photoUrl: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  currentAddress: unknown;
  workAddress: unknown;
  profession: string | null;
  employer: string | null;
  socialLinks: unknown;
  isLiving: boolean;
}

interface OverviewTabProps {
  person: PersonData;
}

export function OverviewTab({ person }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-foreground mb-4 text-lg">
              Personal Information
            </h3>
            <dl className="space-y-4">
              <DetailRow
                label="Gender"
                value={person.gender ?? "Not specified"}
              />
              {person.profession && (
                <DetailRow label="Profession" value={person.profession} />
              )}
              {person.employer && (
                <DetailRow label="Employer" value={person.employer} />
              )}
              {person.nativePlace && (
                <DetailRow label="Native Place" value={person.nativePlace} />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-foreground mb-4 text-lg">
              Contact Information
            </h3>
            <dl className="space-y-4">
              {person.email ? (
                <DetailRow
                  label="Email"
                  value={
                    <a
                      href={`mailto:${person.email}`}
                      className="text-primary hover:underline"
                    >
                      {person.email}
                    </a>
                  }
                />
              ) : (
                <DetailRow label="Email" value="Not provided" muted />
              )}
              {person.phone ? (
                <DetailRow label="Phone" value={person.phone} />
              ) : (
                <DetailRow label="Phone" value="Not provided" muted />
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Bio section */}
      {person.bio && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-foreground mb-4 text-lg">About</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {person.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions for missing fields */}
      <AISuggestions
        personId={person.id}
        personName={`${person.firstName} ${person.lastName}`}
        filledFields={getFilledFields(person)}
      />
    </div>
  );
}

/** Returns a list of person field names that already have values */
function getFilledFields(person: PersonData): Array<string> {
  const fields: Array<string> = [];
  if (person.dateOfBirth) fields.push("dateOfBirth");
  if (person.dateOfPassing) fields.push("dateOfPassing");
  if (person.birthPlace) fields.push("birthPlace");
  if (person.nativePlace) fields.push("nativePlace");
  if (person.profession) fields.push("profession");
  if (person.employer) fields.push("employer");
  if (person.gender) fields.push("gender");
  if (person.bio) fields.push("bio");
  return fields;
}

function DetailRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={
          muted ? "text-muted-foreground/60 text-sm" : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

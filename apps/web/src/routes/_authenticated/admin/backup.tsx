import { createFileRoute } from "@tanstack/react-router";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
});

function BackupPage() {
  return (
    <Container>
      <PageHeader
        title="Backup & Import"
        description="Import and export family tree data using GEDCOM format"
      />

      <div className="space-y-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle>Import GEDCOM</CardTitle>
            <CardDescription>
              Import family tree data from GEDCOM 5.5.1 or 7.0 files (Ancestry,
              FamilySearch, Gramps, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground py-8 text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
              <p className="font-medium">Import functionality coming soon</p>
              <p className="mt-1 text-sm">
                This feature is being migrated to the new architecture
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export GEDCOM</CardTitle>
            <CardDescription>
              Export your family tree data as a GEDCOM 5.5.1 file for backup or
              use in other genealogy software
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground py-8 text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              <p className="font-medium">Export functionality coming soon</p>
              <p className="mt-1 text-sm">
                This feature is being migrated to the new architecture
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

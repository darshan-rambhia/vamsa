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
import { GedcomImport } from "~/components/admin/gedcom-import";
import { GedcomExport } from "~/components/admin/gedcom-export";

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
            <GedcomImport />
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
            <GedcomExport />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

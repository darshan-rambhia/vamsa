import { createFileRoute } from "@tanstack/react-router";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vamsa/ui";
import { BackupExport } from "~/components/admin/backup-export";
import { BackupImport } from "~/components/admin/backup-import";
import { GedcomImport } from "~/components/admin/gedcom-import";
import { GedcomExport } from "~/components/admin/gedcom-export";
import { AdminRouteError } from "~/components/admin/route-error";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
  errorComponent: AdminRouteError,
});

function BackupPage() {
  return (
    <Container>
      <PageHeader
        title="Backup & Restore"
        description="Backup and restore your family tree data, or import/export using GEDCOM format"
      />

      <Tabs defaultValue="system-backup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system-backup">System Backup</TabsTrigger>
          <TabsTrigger value="gedcom">GEDCOM</TabsTrigger>
        </TabsList>

        {/* System Backup Tab */}
        <TabsContent value="system-backup" className="space-y-6 pt-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export Backup</CardTitle>
              <CardDescription>
                Download a complete backup of your family tree including all
                data, photos, and audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupExport />
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle>Import Backup</CardTitle>
              <CardDescription>
                Restore your family tree from a previously exported backup file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupImport />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GEDCOM Tab */}
        <TabsContent value="gedcom" className="space-y-6 pt-6">
          {/* GEDCOM Import Section */}
          <Card>
            <CardHeader>
              <CardTitle>Import GEDCOM</CardTitle>
              <CardDescription>
                Import family tree data from GEDCOM 5.5.1 or 7.0 files
                (Ancestry, FamilySearch, Gramps, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GedcomImport />
            </CardContent>
          </Card>

          {/* GEDCOM Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export GEDCOM</CardTitle>
              <CardDescription>
                Export your family tree data as a GEDCOM 5.5.1 file for backup
                or use in other genealogy software
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GedcomExport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}

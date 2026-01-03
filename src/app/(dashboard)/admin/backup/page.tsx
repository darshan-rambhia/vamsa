import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackupExport } from "@/components/admin/backup-export";
import { BackupImport } from "@/components/admin/backup-import";

export default async function BackupAdminPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Backup & Restore</h1>
      <p className="text-muted-foreground">
        Export your family tree data or import it from a backup file.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
          </CardHeader>
          <CardContent>
            <BackupExport />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
          </CardHeader>
          <CardContent>
            <BackupImport />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

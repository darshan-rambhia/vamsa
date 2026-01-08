import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GedcomExport } from "@/components/admin/gedcom-export";
import { GedcomImport } from "@/components/admin/gedcom-import";

export default async function GedcomAdminPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GEDCOM Exchange</h1>
      <p className="text-muted-foreground">
        Import from or export to GEDCOM format for compatibility with other
        genealogy software.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export GEDCOM</CardTitle>
          </CardHeader>
          <CardContent>
            <GedcomExport />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Import GEDCOM</CardTitle>
          </CardHeader>
          <CardContent>
            <GedcomImport />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

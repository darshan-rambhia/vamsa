import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vamsa/ui";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["admin", "common"]);

  return (
    <Container>
      <PageHeader
        title={t("admin:backupTitle")}
        description={t("admin:backupImportDescription")}
      />

      <Tabs defaultValue="system-backup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system-backup">{t("admin:backup")}</TabsTrigger>
          <TabsTrigger value="gedcom">GEDCOM</TabsTrigger>
        </TabsList>

        {/* System Backup Tab */}
        <TabsContent value="system-backup" className="space-y-6 pt-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin:backupExport")}</CardTitle>
              <CardDescription>
                {t("admin:backupExportDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupExport />
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin:backupImport")}</CardTitle>
              <CardDescription>
                {t("admin:backupImportDescription")}
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
              <CardTitle>{t("admin:backupImportGedcom")}</CardTitle>
              <CardDescription>
                {t("admin:backupExportGedcomDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GedcomImport />
            </CardContent>
          </Card>

          {/* GEDCOM Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin:backupExportGedcom")}</CardTitle>
              <CardDescription>
                {t("admin:backupExportGedcomDescription")}
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

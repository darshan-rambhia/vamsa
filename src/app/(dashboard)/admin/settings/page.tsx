import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const session = await getSession();

  if (session?.user?.role !== "ADMIN") {
    redirect("/tree");
  }

  const settings = await db.familySettings.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Vamsa application
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}

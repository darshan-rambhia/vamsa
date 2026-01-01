"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { FamilySettings } from "@prisma/client";

interface SettingsFormProps {
  settings: FamilySettings | null;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      familyName: settings?.familyName || "Our Family",
      description: settings?.description || "",
      allowSelfRegistration: settings?.allowSelfRegistration ?? true,
      requireApprovalForEdits: settings?.requireApprovalForEdits ?? true,
    },
  });

  async function onSubmit(data: {
    familyName: string;
    description: string;
    allowSelfRegistration: boolean;
    requireApprovalForEdits: boolean;
  }) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast({ title: "Settings saved" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Failed to save settings",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">Family Name</Label>
            <Input id="familyName" {...register("familyName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowSelfRegistration"
              {...register("allowSelfRegistration")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="allowSelfRegistration">
              Allow self-registration
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requireApprovalForEdits"
              {...register("requireApprovalForEdits")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="requireApprovalForEdits">
              Require approval for edits (non-admins submit suggestions)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

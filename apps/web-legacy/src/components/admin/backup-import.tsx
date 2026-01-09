"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImportPreview } from "./import-preview";
import { ValidationResult } from "@/schemas/backup";
import { Loader2, Upload } from "lucide-react";

function isFileListLike(value: unknown): boolean {
  if (typeof window === "undefined") return true;
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;
  const length = (value as { length?: unknown }).length;
  return typeof length === "number" && length > 0;
}

const formSchema = z.object({
  file: z.any().refine((files) => isFileListLike(files), "A file is required."),
});

type FormValues = z.infer<typeof formSchema>;

async function validateBackup(file: File): Promise<ValidationResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/backup/validate", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to validate backup file.");
  }

  return response.json();
}

export function BackupImport() {
  const { toast } = useToast();
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: (file: File) => validateBackup(file),
    onSuccess: (data) => {
      setValidationResult(data);
      toast({
        title: "Validation Successful",
        description: "Review the import preview below.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
      reset();
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const file = data.file[0];
    if (file) {
      setBackupFile(file);
      mutation.mutate(file);
    }
  };

  const handleReset = () => {
    setValidationResult(null);
    setBackupFile(null);
    reset();
  };

  if (validationResult && backupFile) {
    return (
      <ImportPreview
        result={validationResult}
        file={backupFile}
        onReset={handleReset}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="backup-file">Backup File (.zip)</Label>
        <Input
          id="backup-file"
          type="file"
          accept=".zip"
          {...register("file")}
        />
        {errors.file?.message && (
          <p className="text-destructive text-sm">
            {String(errors.file.message)}
          </p>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Importing will add or update data. It is strongly recommended to perform
        a backup first.
      </p>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {mutation.isPending ? "Validating..." : "Validate Backup"}
      </Button>
    </form>
  );
}

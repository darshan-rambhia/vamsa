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
import { GedcomImportPreview } from "./gedcom-import-preview";
import { Loader2, Upload } from "lucide-react";
import { validateGedcomFile } from "@/actions/gedcom";
import type { ValidateGedcomResult } from "@/actions/gedcom";

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

async function validateGedcom(file: File): Promise<ValidateGedcomResult> {
  const formData = new FormData();
  formData.append("file", file);
  return validateGedcomFile(formData);
}

export function GedcomImport() {
  const { toast } = useToast();
  const [validationResult, setValidationResult] =
    useState<ValidateGedcomResult | null>(null);
  const [gedcomFile, setGedcomFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: (file: File) => validateGedcom(file),
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        toast({
          title: "Validation Successful",
          description: "Review the import preview below.",
        });
      } else {
        toast({
          title: "Validation Issues",
          description: "The file has validation issues. Review them below.",
          variant: "destructive",
        });
      }
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
      if (!file.name.endsWith(".ged")) {
        toast({
          title: "Invalid file",
          description: "Please select a .ged file",
          variant: "destructive",
        });
        return;
      }
      setGedcomFile(file);
      mutation.mutate(file);
    }
  };

  const handleReset = () => {
    setValidationResult(null);
    setGedcomFile(null);
    reset();
  };

  if (validationResult && gedcomFile) {
    return (
      <GedcomImportPreview
        result={validationResult}
        file={gedcomFile}
        onReset={handleReset}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gedcom-file">GEDCOM File (.ged)</Label>
        <Input
          id="gedcom-file"
          type="file"
          accept=".ged"
          {...register("file")}
        />
        {errors.file?.message && (
          <p className="text-sm text-destructive">
            {String(errors.file.message)}
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Import a family tree from GEDCOM format. The file will be validated
        before import to ensure data integrity.
      </p>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {mutation.isPending ? "Validating..." : "Validate GEDCOM"}
      </Button>
    </form>
  );
}

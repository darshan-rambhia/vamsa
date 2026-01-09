"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { importGedcom } from "@/actions/gedcom";
import type {
  ValidateGedcomResult,
  ImportGedcomResult,
} from "@/actions/gedcom";

interface GedcomImportPreviewProps {
  result: ValidateGedcomResult;
  file: File;
  onReset: () => void;
}

async function performImport(file: File): Promise<ImportGedcomResult> {
  const formData = new FormData();
  formData.append("file", file);
  return importGedcom(formData);
}

export function GedcomImportPreview({
  result,
  file,
  onReset,
}: GedcomImportPreviewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);

  const mutation = useMutation({
    mutationFn: performImport,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        router.refresh();
        // Auto-close after a short delay
        setTimeout(() => {
          onReset();
        }, 2000);
      } else {
        toast({
          title: "Import Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const handleImport = () => {
    setIsImporting(true);
    mutation.mutate(file);
  };

  const hasErrors = result.preview?.errors && result.preview.errors.length > 0;
  const errorCount =
    result.preview?.errors?.filter(
      (e) => e.type === "validation_error" || e.type === "mapping_error"
    ).length || 0;
  const warningCount =
    result.preview?.errors?.filter(
      (e) => e.type === "validation_warning" || e.type === "warning"
    ).length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Validation complete. Review the data to be imported from{" "}
            <span className="font-semibold">{file.name}</span>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">People</div>
              <div className="text-2xl font-bold">
                {result.preview?.peopleCount || 0}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Families</div>
              <div className="text-2xl font-bold">
                {result.preview?.familiesCount || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.valid && !hasErrors ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Ready to Import</AlertTitle>
          <AlertDescription>
            The GEDCOM file is valid and ready to be imported.
          </AlertDescription>
        </Alert>
      ) : !result.valid ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Failed</AlertTitle>
          <AlertDescription>
            The GEDCOM file has critical errors that prevent import. Please fix
            these issues and try again.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings Detected</AlertTitle>
          <AlertDescription>
            The file has some warnings but can still be imported. Review the
            issues below.
          </AlertDescription>
        </Alert>
      )}

      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>
              Validation Issues ({errorCount} errors, {warningCount} warnings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 space-y-2 overflow-auto">
              {result.preview?.errors?.map((error, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    error.type === "validation_error" ||
                    error.type === "mapping_error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-yellow-200 bg-yellow-50 text-yellow-900"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {error.type === "validation_error" ||
                    error.type === "mapping_error" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">
                        {error.type === "validation_error" ||
                        error.type === "mapping_error"
                          ? "Error"
                          : "Warning"}
                      </div>
                      <div className="mt-1">{error.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end space-x-4">
        <Button variant="outline" onClick={onReset} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting || !result.valid}>
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isImporting ? "Importing..." : "Confirm and Import"}
        </Button>
      </div>
    </div>
  );
}

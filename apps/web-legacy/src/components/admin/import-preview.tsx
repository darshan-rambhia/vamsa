"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ValidationResult, ConflictResolutionStrategy } from "@/schemas/backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface ImportPreviewProps {
  result: ValidationResult;
  file: File;
  onReset: () => void;
}

async function importBackup({
  file,
  strategy,
}: {
  file: File;
  strategy: ConflictResolutionStrategy;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("strategy", strategy);

  const response = await fetch("/api/admin/backup/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to import backup.");
  }

  return response.json();
}

export function ImportPreview({ result, file, onReset }: ImportPreviewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [strategy, setStrategy] = useState<ConflictResolutionStrategy>("skip");
  const [isImporting, setIsImporting] = useState(false);

  const mutation = useMutation({
    mutationFn: importBackup,
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: "Your data has been imported.",
      });
      router.refresh();
      onReset();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
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
    mutation.mutate({ file, strategy });
  };

  const personConflicts = result.conflicts.filter((c) => c.type === "person");
  const relationshipConflicts = result.conflicts.filter(
    (c) => c.type === "relationship"
  );
  const hasConflicts =
    personConflicts.length > 0 || relationshipConflicts.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Validation successful. Review the data to be imported from{" "}
            <span className="font-semibold">{file.name}</span>.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">People</div>
              <div className="text-2xl font-bold">
                {result.metadata.statistics.totalPeople}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Relationships</div>
              <div className="text-2xl font-bold">
                {result.metadata.statistics.totalRelationships}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Conflicts</div>
              <div className="text-2xl font-bold">
                {result.statistics.totalConflicts}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Users</div>
              <div className="text-2xl font-bold">
                {result.metadata.statistics.totalUsers}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasConflicts ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conflicts Detected</AlertTitle>
          <AlertDescription>
            Some data in the backup file already exists in the database. Choose
            a strategy to resolve these conflicts.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>No Conflicts</AlertTitle>
          <AlertDescription>
            The backup file can be imported without any conflicts.
          </AlertDescription>
        </Alert>
      )}

      {hasConflicts && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="conflict-strategy"
                className="text-sm font-medium"
              >
                Conflict Strategy
              </label>
              <Select
                value={strategy}
                onValueChange={(value) =>
                  setStrategy(value as ConflictResolutionStrategy)
                }
              >
                <SelectTrigger id="conflict-strategy">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Conflicting Data</SelectItem>
                  <SelectItem value="replace">Replace Existing Data</SelectItem>
                  <SelectItem value="merge">Merge Existing Data</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-muted-foreground">
                - <span className="font-semibold">Skip:</span> Ignore data from
                the backup file if it already exists.
                <br />- <span className="font-semibold">Replace:</span>{" "}
                Overwrite existing data with data from the backup file.
                <br />- <span className="font-semibold">Merge:</span> Combine
                existing and backup data (new fields are added).
              </p>
            </div>
            {personConflicts.length > 0 && (
              <>
                <h3 className="font-semibold">
                  Conflicting People ({personConflicts.length})
                </h3>
                <div className="max-h-60 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personConflicts.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {(c.existingData?.firstName as string) || ""}{" "}
                            {(c.existingData?.lastName as string) || ""}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.description}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            {relationshipConflicts.length > 0 && (
              <>
                <h3 className="font-semibold">
                  Conflicting Relationships ({relationshipConflicts.length})
                </h3>
                <div className="max-h-60 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relationshipConflicts.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.existingId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.description}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end space-x-4">
        <Button variant="outline" onClick={onReset} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isImporting ? "Importing..." : "Confirm and Import"}
        </Button>
      </div>
    </div>
  );
}

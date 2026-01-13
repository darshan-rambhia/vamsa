"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@vamsa/ui/primitives";
import { generateCitation } from "~/server/sources";

interface CitationGeneratorProps {
  sourceId: string;
}

export function CitationGenerator({ sourceId }: CitationGeneratorProps) {
  const [format, setFormat] = useState<"MLA" | "APA" | "CHICAGO">("MLA");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["citation", sourceId, format],
    queryFn: () => generateCitation({ data: { sourceId, format } }),
  });

  const handleCopy = async () => {
    if (data?.citation) {
      await navigator.clipboard.writeText(data.citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatFields: Record<string, string[]> = {
    MLA: ["Author", "Title", "Publication Date", "Repository", "URL", "DOI"],
    APA: ["Author", "Publication Date", "Title", "Repository", "URL", "DOI"],
    CHICAGO: [
      "Author",
      "Title",
      "Publication Date",
      "Repository",
      "URL",
      "DOI",
    ],
  };

  return (
    <div className="space-y-4">
      {/* Format selector */}
      <div className="space-y-2">
        <Label htmlFor="citationFormat">Citation Format</Label>
        <Select
          value={format}
          onValueChange={(value) =>
            setFormat(value as "MLA" | "APA" | "CHICAGO")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MLA">
              MLA (Modern Language Association)
            </SelectItem>
            <SelectItem value="APA">
              APA (American Psychological Association)
            </SelectItem>
            <SelectItem value="CHICAGO">
              Chicago (Chicago Manual of Style)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fields used indicator */}
      <div>
        <h4 className="text-muted-foreground mb-2 text-sm font-medium">
          Fields Used in Citation
        </h4>
        <div className="flex flex-wrap gap-2">
          {formatFields[format]?.map((field) => (
            <Badge key={field} variant="outline">
              {field}
            </Badge>
          ))}
        </div>
      </div>

      {/* Generated citation */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Generated Citation</p>
        <div className="bg-muted border-border relative rounded-md border-2 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <svg
                className="text-muted-foreground h-6 w-6 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          ) : (
            <p className="text-foreground font-serif text-sm leading-relaxed whitespace-pre-wrap">
              {data?.citation || "No citation available"}
            </p>
          )}
        </div>
      </div>

      {/* Copy button */}
      <div className="flex justify-end">
        <Button
          onClick={handleCopy}
          variant="outline"
          disabled={isLoading || !data?.citation}
        >
          {copied ? (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>

      {/* Preview explanation */}
      <div className="bg-muted/50 text-muted-foreground rounded-md p-4 text-sm">
        <p>
          <strong>Note:</strong> This citation is automatically generated based
          on the source information. Please verify it matches your style guide
          requirements before using in your research.
        </p>
      </div>
    </div>
  );
}

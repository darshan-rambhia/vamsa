import { Loader2 } from "lucide-react";

interface ChartSkeletonProps {
  message?: string;
  estimatedTime?: string;
}

export function ChartSkeleton({ message, estimatedTime }: ChartSkeletonProps) {
  return (
    <div className="bg-card flex h-full w-full items-center justify-center rounded-lg border">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
        {message && (
          <div className="space-y-2">
            <p className="text-foreground text-lg font-medium">{message}</p>
            {estimatedTime && (
              <p className="text-muted-foreground text-sm">
                Estimated time: {estimatedTime}
              </p>
            )}
          </div>
        )}
        <div className="text-muted-foreground text-sm">
          <p>Optimizing layout for large family tree...</p>
        </div>
      </div>
    </div>
  );
}

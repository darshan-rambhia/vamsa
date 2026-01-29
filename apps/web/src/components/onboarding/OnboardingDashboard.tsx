"use client";

import { useState } from "react";
import { Card, CardContent, Button } from "@vamsa/ui";
import { Users } from "lucide-react";
import { SetupWizard } from "./SetupWizard";

export function OnboardingDashboard() {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-2 p-8 text-center">
        <CardContent className="space-y-6 p-0">
          <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
            <Users className="text-primary h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-medium">
              Welcome to Your Family Tree
            </h2>
            <p className="text-muted-foreground">
              Start building your family history by adding yourself and your
              family members.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => setShowWizard(true)}
          >
            Start My Tree
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

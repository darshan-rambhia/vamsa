"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@vamsa/ui";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PersonForm } from "../person/person-form";
import { createRelationship } from "~/server/relationships";
import { updateUser } from "~/server/users";
import { getSession } from "~/server/auth.functions";

interface SetupWizardProps {
  onComplete: () => void;
}

type WizardStep = "me" | "parents" | "complete";

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("me");
  const [myPersonId, setMyPersonId] = useState<string | null>(null);
  const [fatherAdded, setFatherAdded] = useState(false);
  const [motherAdded, setMotherAdded] = useState(false);

  const handleMyProfileCreated = async (personId?: string) => {
    if (!personId) return;

    // Link the user to this person
    try {
      const session = await getSession();
      if (session?.id) {
        await updateUser({
          data: {
            id: session.id,
            personId,
          },
        });
      }
    } catch (_error) {
      // Error logged on server side - user can continue with onboarding
    }

    setMyPersonId(personId);
    setCurrentStep("parents");
  };

  const handleParentCreated = async (
    parentId: string,
    type: "father" | "mother"
  ) => {
    if (!myPersonId) return;

    try {
      // Create parent-child relationship
      await createRelationship({
        data: {
          personId: parentId,
          relatedPersonId: myPersonId,
          type: "PARENT",
        },
      });

      if (type === "father") {
        setFatherAdded(true);
      } else {
        setMotherAdded(true);
      }
    } catch (_error) {
      // Error logged on server side - relationship creation failed
    }
  };

  const handleSkipParents = () => {
    setCurrentStep("complete");
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        <StepIndicator
          number={1}
          label="About Me"
          active={currentStep === "me"}
          complete={currentStep === "parents" || currentStep === "complete"}
        />
        <div className="bg-border h-0.5 w-12" />
        <StepIndicator
          number={2}
          label="Parents"
          active={currentStep === "parents"}
          complete={currentStep === "complete"}
        />
        <div className="bg-border h-0.5 w-12" />
        <StepIndicator
          number={3}
          label="Done"
          active={currentStep === "complete"}
          complete={false}
        />
      </div>

      {/* Step Content */}
      {currentStep === "me" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              Tell us about yourself
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Create your profile to anchor your family tree. This will be
              linked to your account.
            </p>
          </CardHeader>
          <CardContent>
            <PersonForm onSuccess={handleMyProfileCreated} />
          </CardContent>
        </Card>
      )}

      {currentStep === "parents" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display">
                    Add Your Parents
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Optional: Add your father and mother to start building your
                    tree.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSkipParents}>
                  Skip for Now
                </Button>
              </div>
            </CardHeader>
          </Card>

          {!fatherAdded && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Father</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonForm
                  onSuccess={(id) => id && handleParentCreated(id, "father")}
                />
              </CardContent>
            </Card>
          )}

          {fatherAdded && !motherAdded && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Mother</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonForm
                  onSuccess={(id) => id && handleParentCreated(id, "mother")}
                />
              </CardContent>
            </Card>
          )}

          {fatherAdded && motherAdded && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-primary h-6 w-6" />
                  <div>
                    <p className="font-medium">Parents Added!</p>
                    <p className="text-muted-foreground text-sm">
                      You can add more family members later.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setCurrentStep("complete")}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {currentStep === "complete" && (
        <Card className="text-center">
          <CardContent className="space-y-6 py-12">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-medium">
                You&apos;re All Set!
              </h2>
              <p className="text-muted-foreground">
                Your family tree has been created. You can now explore your
                dashboard and add more family members.
              </p>
            </div>

            <Button size="lg" onClick={handleFinish}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}

function StepIndicator({
  number,
  label,
  active,
  complete,
}: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
          complete
            ? "bg-primary border-primary text-primary-foreground"
            : active
              ? "border-primary text-primary"
              : "border-border text-muted-foreground"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <span className="font-mono text-sm font-medium">{number}</span>
        )}
      </div>
      <span
        className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}

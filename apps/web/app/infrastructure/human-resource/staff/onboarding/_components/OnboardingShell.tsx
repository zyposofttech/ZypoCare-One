"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

import { STAFF_ONBOARDING_STEPS, StaffOnboardingStepId } from "../_lib/steps";

type Props = {
  title: string;
  description?: string;
  /** Accept both stepId and stepKey — stepKey is the preferred alias */
  stepId?: StaffOnboardingStepId;
  stepKey?: string;
  draftId?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function OnboardingShell({ title, description, stepId: stepIdProp, stepKey, draftId: draftIdProp, footer, children }: Props) {
  const stepId = (stepKey ?? stepIdProp ?? "start") as StaffOnboardingStepId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = draftIdProp ?? searchParams.get("draftId") ?? "";
  const { toast } = useToast();

  const goTo = React.useCallback(
    (nextStepId: StaffOnboardingStepId) => {
      const step = STAFF_ONBOARDING_STEPS.find((s) => s.id === nextStepId);
      if (!step) return;

      const href = draftId ? `${step.href}?draftId=${encodeURIComponent(draftId)}` : step.href;
      router.push(href as any);
    },
    [draftId, router],
  );

  const handleSaveDraft = () => {
    toast({
      title: "Saved",
      description: "Draft is saved locally in this browser (auto-saved as you type as well).",
    });
  };

  // Hide the "Done" tab while onboarding is in progress (still reachable after submit)
  const visibleSteps = STAFF_ONBOARDING_STEPS.filter((s) => s.id !== "done");

  return (
    <div className="space-y-4">
      <Card className="border-zc-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-xs">{description}</CardDescription>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button
                variant="outline"
                className="h-8"
                onClick={() => router.push("/infrastructure/staff" as any)}
              >
                Exit
              </Button>
            </div>
          </div>

          {/*
            TAB NAV (replaces ugly sidebar links)
            With 17 steps, the strip is wider than the viewport.
            Keep it on one row and allow horizontal scrolling.
          */}
          <div className="mt-3 overflow-x-auto pb-2">
            <Tabs value={stepId} onValueChange={(v) => goTo(v as StaffOnboardingStepId)}>
              <TabsList className={cn("h-auto w-max flex-nowrap whitespace-nowrap gap-1 bg-transparent p-0")}>
                {visibleSteps.map((s) => (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className={cn(
                      "h-8 shrink-0 whitespace-nowrap rounded-md border border-zc-border bg-zc-panel px-3 text-xs",
                      "data-[state=active]:bg-zc-accent data-[state=active]:text-white",
                    )}
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {children}
          {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

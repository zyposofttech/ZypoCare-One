"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TITLES: Record<string, { title: string; desc: string }> = {
  roster: { title: "Roster", desc: "Shift rosters, duty allocation, and schedule publishing." },
  attendance: { title: "Attendance", desc: "Attendance capture, corrections, and audit trail." },
  leaves: { title: "Leaves", desc: "Leave requests, approvals, balances, and policies." },
  training: { title: "Training", desc: "Mandatory training, certifications, and compliance tracking." },
  appraisals: { title: "Appraisals", desc: "Probation reviews, periodic appraisals, and performance records." },
  separation: { title: "Separation", desc: "Resignation / termination processing and exit checklist." },
};

export default function Page() {
  const key = "roster";
  const meta = TITLES[key] ?? { title: "Human Resource", desc: "" };

  return (
    <AppShell title={meta.title}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zc-foreground">{meta.title}</h1>
            <p className="mt-1 text-sm text-zc-muted">{meta.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-zc-border">
              <Link href="/infrastructure/human-resource">Back to Human Resource</Link>
            </Button>
          </div>
        </div>

        <Card className="border-zc-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Coming soon</CardTitle>
            <CardDescription>We’ll build this page next, aligned to the Staff workflow document.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-zc-muted">
            This route exists so navigation is stable. Implementation will be delivered page-by-page.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

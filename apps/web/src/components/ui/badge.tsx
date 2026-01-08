"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
  {
    variants: {
      variant: {
        default: "border-xc-border bg-xc-panel text-xc-text",
        secondary:
          "border-xc-border bg-[rgb(var(--xc-hover-rgb)/0.04)] text-xc-muted",
        outline: "border-xc-border bg-transparent text-xc-text",
        accent: "border-xc-accent/40 bg-xc-accent/15 text-xc-accent",
        destructive: "border-xc-danger/40 bg-xc-danger/15 text-xc-danger",
        success: "border-xc-ok/40 bg-xc-ok/15 text-xc-ok",
        warning: "border-xc-warn/40 bg-xc-warn/15 text-xc-warn",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

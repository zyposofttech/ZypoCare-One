"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
  {
    variants: {
      variant: {
        default: "border-zc-border bg-zc-panel text-zc-text",
        secondary:
          "border-zc-border bg-[rgb(var(--zc-hover-rgb)/0.04)] text-zc-muted",
        outline: "border-zc-border bg-transparent text-zc-text",
        accent: "border-zc-accent/40 bg-zc-accent/15 text-zc-accent",
        destructive: "border-zc-danger/40 bg-zc-danger/15 text-zc-danger",
        success: "border-zc-ok/40 bg-zc-ok/15 text-zc-ok",
        warning: "border-zc-warn/40 bg-zc-warn/15 text-zc-warn",
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

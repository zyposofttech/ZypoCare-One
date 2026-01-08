"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[96px] w-full rounded-xl border border-xc-border bg-transparent px-3 py-2 text-sm text-xc-text",
      "placeholder:text-xc-muted",
      "focus:outline-none focus:ring-2 focus:ring-xc-ring",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

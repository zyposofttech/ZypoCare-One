"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-zc-border bg-transparent px-3 text-sm text-zc-text placeholder:text-zc-muted",
        "focus:outline-none focus:ring-2 focus:ring-zc-ring",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

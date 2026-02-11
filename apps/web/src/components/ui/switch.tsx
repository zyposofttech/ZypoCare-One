"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-zc-accent",
      "bg-[rgb(var(--zc-hover-rgb)/0.06)] transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-zc-ring",
      "data-[state=checked]:border-zc-accent data-[state=checked]:bg-zc-accent/80",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-zc-card shadow-elev-1 transition-transform",
        "data-[state=checked]:translate-x-[1.35rem]"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

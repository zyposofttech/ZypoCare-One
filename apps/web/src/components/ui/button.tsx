"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// ChatGPT-like buttons: flatter, cleaner, and consistent across dark/light.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zc-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-zc-accent text-white shadow-elev-1 hover:bg-zc-accent2 active:opacity-95",
        secondary:
          "bg-[rgb(var(--zc-accent)/0.1)] text-zc-white hover:bg-[rgb(var(--zc-accent)/0.05)] border border-transparent",

        // Outline: Becomes "alive" on hover by adopting the accent color for the border/text
        outline:
          "border border-zc-border bg-transparent text-zc-text hover:border-zc-accent hover:text-zc-accent hover:bg-[rgb(var(--zc-accent)/0.03)]",

        // Ghost: Subtle gray hover, uses your 'muted' text color by default so it's not distracting
        ghost:
          "bg-transparent text-zc-muted hover:text-zc-text hover:bg-[rgb(var(--zc-text)/0.05)]",
        destructive: "bg-zc-danger text-white hover:opacity-90",
        
        // Success variant added exactly as requested
        success: "bg-[rgb(4,120,87)] text-white shadow-elev-1 hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        iconSm: "h-8 w-8 p-0",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

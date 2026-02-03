"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title = "ZypoCare One" }: BrandLogoProps) {
  return (
    <div
      role="img"
      aria-label={title}
      title={title}
      className={cn("bg-center bg-no-repeat bg-contain", className)}
      style={{ backgroundImage: "url('/brand/ZypocareLogo.png')" }}
    />
  );
}

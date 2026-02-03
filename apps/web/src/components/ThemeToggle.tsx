"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { IconMoon, IconSun } from "@/components/icons";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <IconMoon className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </Button>
  );
}

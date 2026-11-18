"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { effectiveResources } from "@/lib/platform/performance-policy";

/** Keep catalogue and navigation prefetches out of the initial page load. */
export function IntentLink({
  onMouseEnter,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(event) => {
        // Low-resource mode loads a page when it is opened, not on hover.
        if (effectiveResources() !== "low") setActive(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        if (effectiveResources() !== "low") setActive(true);
        onFocus?.(event);
      }}
    />
  );
}

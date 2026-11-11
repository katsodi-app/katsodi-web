"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

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
        setActive(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
    />
  );
}

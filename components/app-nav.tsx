"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "看板", roles: ["super_admin", "dept_manager", "member"] },
  { href: "/okr", label: "OKR", roles: ["super_admin", "dept_manager", "member"] },
  { href: "/weekly", label: "本周", roles: ["super_admin", "dept_manager", "member"] },
  { href: "/health", label: "健康", roles: ["super_admin", "dept_manager", "member"] },
  { href: "/reports", label: "报表", roles: ["super_admin", "dept_manager", "member"] },
  { href: "/quarters", label: "季度", roles: ["super_admin"] },
  { href: "/settings", label: "设置", roles: ["super_admin"] }
];

export function AppNav({ user, layout = "stacked" }: { user: SessionUser; layout?: "stacked" | "compact" }) {
  const pathname = usePathname();
  const visibleItems = nav.filter((item) => item.roles.includes(user.role));

  return (
    <nav className={layout === "compact" ? "grid grid-cols-5 gap-1" : "mt-4 space-y-1"}>
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              layout === "compact"
                ? "flex min-h-14 flex-col items-center justify-center rounded-md px-2 py-2 text-xs font-medium text-steel transition hover:bg-hover hover:text-ink"
                : "relative flex h-12 items-center rounded-md px-4 text-sm font-medium text-steel transition hover:bg-hover hover:text-ink",
              active && (layout === "compact" ? "bg-primary-light text-primary" : "bg-primary-light pl-4 text-primary")
            )}
          >
            {active && layout !== "compact" ? <span className="absolute left-0 top-2 h-8 w-[3px] rounded-r bg-primary" /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

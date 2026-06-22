import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { SessionUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-line bg-card">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-semibold text-white">OK</span>
            <span className="text-sm font-semibold text-ink sm:text-base">OKR 团队工具</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-steel sm:gap-4">
            <span className="hidden sm:inline">当前季度</span>
            <span className="hidden sm:block h-6 w-px bg-line" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-light text-xs font-semibold text-primary">
              {user.name.slice(0, 1)}
            </span>
            <span className="hidden md:inline">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-14 hidden w-[200px] border-r border-line bg-card px-3 py-4 lg:block">
        <AppNav user={user} />
        <div className="absolute bottom-4 left-3 right-3 rounded-md border border-line bg-hover p-3">
          <div className="font-semibold text-ink">{user.name}</div>
          <div className="mt-1 text-xs text-muted">{roleLabel(user.role)}</div>
        </div>
      </aside>

      <div className="pt-14 lg:pl-[200px]">
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>

      <div
        aria-label="移动导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 lg:hidden"
      >
        <AppNav user={user} layout="compact" />
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  return role === "super_admin" ? "超级管理员" : role === "dept_manager" ? "部门管理者" : "成员";
}

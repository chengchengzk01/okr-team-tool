"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        redirect: "follow"
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-md border border-line bg-card px-2.5 py-1.5 text-sm text-steel transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
    >
      {isPending ? "退出中..." : "退出"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isMockLoginEnabled } from "@/lib/auth-mode";

const roles = [
  { role: "super_admin", label: "超级管理员", hint: "全公司视图、季度和集成配置" },
  { role: "dept_manager", label: "部门管理者", hint: "部门 OKR、健康指标和障碍汇总" },
  { role: "member", label: "成员", hint: "个人 OKR、信心值和周仪式" }
];

export function LoginButtons({ mockLoginEnabled = isMockLoginEnabled() }: { mockLoginEnabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  async function login(role: string) {
    setError(null);
    setLoadingRole(role);
    try {
      const response = await fetch("/api/v1/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "开发登录失败，请稍后重试");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("开发登录失败，请检查本地服务是否正常运行");
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <a
        href="/api/v1/auth/feishu"
        className="focus-ring flex w-full items-center justify-between rounded-md bg-primary px-4 py-4 text-left text-white transition hover:bg-primary-hover"
      >
        <span>
          <span className="block font-semibold">用飞书账号登录</span>
          <span className="mt-1 block text-sm text-white/80">正式入口：OAuth SSO、自动同步通讯录</span>
        </span>
        <span className="text-sm font-semibold">登录</span>
      </a>
      {mockLoginEnabled ? (
        <>
          <div className="pt-3 text-xs font-medium text-muted">开发入口 · 本地模拟登录</div>
          {roles.map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => login(item.role)}
              disabled={loadingRole !== null}
              className="focus-ring flex w-full items-center justify-between rounded-md border border-line bg-card px-4 py-4 text-left transition hover:border-primary hover:bg-primary-light"
            >
              <span>
                <span className="block font-semibold text-ink">{item.label}</span>
                <span className="mt-1 block text-sm text-steel">{item.hint}</span>
              </span>
              <span className="text-sm font-semibold text-primary">{loadingRole === item.role ? "进入中..." : "进入"}</span>
            </button>
          ))}
        </>
      ) : (
        <div className="rounded-md border border-line bg-hover px-4 py-3 text-sm text-steel">
          当前环境仅开放正式登录，请使用飞书 OAuth 入口进入系统。
        </div>
      )}
      {error ? <div className="rounded-md border border-status-red bg-status-red-bg px-4 py-3 text-sm text-status-red">{error}</div> : null}
    </div>
  );
}

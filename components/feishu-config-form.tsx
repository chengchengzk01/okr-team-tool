"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type InitialConfig = {
  provider: "mock" | "real";
  appId?: string;
  redirectUri?: string;
  rootDepartmentId: string;
  calendarId: string;
  hasAppSecret: boolean;
  bitableAppToken?: string;
  calendarSettings: {
    inviteScope: "company" | "department";
    inviteDepartmentId?: string;
    monday: { summary: string; startTime: string; endTime: string; description: string };
    friday: { summary: string; startTime: string; endTime: string; description: string };
  };
  bitableTableIds: Record<string, string>;
  hasDriveFolderToken: boolean;
};

export function FeishuConfigForm({ initialConfig }: { initialConfig: InitialConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [helpUrl, setHelpUrl] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage("保存中...");
    setHelpUrl(null);
    const tableIdsText = String(formData.get("bitableTableIds") ?? "{}");
    let tableIds: Record<string, string>;
    try {
      tableIds = JSON.parse(tableIdsText);
    } catch {
      setMessage("多维表格 Table ID 必须是合法 JSON");
      return;
    }

    const payload = pruneEmpty({
      provider: formData.get("provider"),
      app_id: formData.get("appId"),
      app_secret: formData.get("appSecret"),
      redirect_uri: formData.get("redirectUri"),
      root_department_id: formData.get("rootDepartmentId"),
      calendar_id: formData.get("calendarId"),
      calendar_settings: {
        inviteScope: formData.get("calendarInviteScope"),
        inviteDepartmentId: formData.get("calendarInviteDepartmentId"),
        monday: {
          summary: formData.get("mondaySummary"),
          startTime: formData.get("mondayStartTime"),
          endTime: formData.get("mondayEndTime"),
          description: formData.get("mondayDescription")
        },
        friday: {
          summary: formData.get("fridaySummary"),
          startTime: formData.get("fridayStartTime"),
          endTime: formData.get("fridayEndTime"),
          description: formData.get("fridayDescription")
        }
      },
      bitable_url: formData.get("bitableUrl"),
      bitable_app_token: formData.get("bitableAppToken"),
      bitable_table_ids: tableIds,
      drive_folder_token: formData.get("driveFolderToken")
    });

    const response = await fetch("/api/v1/integrations/feishu/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "保存失败");
      setHelpUrl(result.helpUrl ?? null);
      return;
    }
    setMessage(result.config?.ready ? "飞书配置已保存" : `飞书配置已保存，但仍缺少：${result.config?.missingItems?.join("、") ?? "部分配置项"}`);
    startTransition(() => router.refresh());
  }

  async function verifySavedConfig() {
    setMessage("验证中...");
    setHelpUrl(null);
    const response = await fetch("/api/v1/integrations/feishu/config/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "验证失败");
      setHelpUrl(result.helpUrl ?? null);
      return;
    }
    setMessage(`真实飞书权限验证通过：${(result.validatedItems ?? []).join("、")}`);
  }

  return (
    <section className="mb-4 rounded-lg border border-line bg-card p-5 shadow-panel">
      <h2 className="font-semibold text-ink">飞书配置</h2>
      <form action={submit} className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-steel">模式</span>
          <select name="provider" defaultValue={initialConfig.provider} className="okr-input">
            <option value="mock">Mock 模式</option>
            <option value="real">真实飞书</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">App ID</span>
          <input name="appId" defaultValue={initialConfig.appId} className="okr-input" placeholder="cli_xxx" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">App Secret</span>
          <input name="appSecret" type="password" className="okr-input" placeholder="留空则不覆盖已有密钥" />
          {initialConfig.hasAppSecret ? <span className="text-xs text-muted">当前已保存 App Secret，留空会保持现有密钥。</span> : null}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">OAuth 回调地址</span>
          <input name="redirectUri" defaultValue={initialConfig.redirectUri} className="okr-input" placeholder="https://.../api/v1/auth/feishu/callback" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">根部门 ID</span>
          <input name="rootDepartmentId" defaultValue={initialConfig.rootDepartmentId} className="okr-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-steel">日历 ID</span>
          <input name="calendarId" defaultValue={initialConfig.calendarId} className="okr-input" />
        </label>
        <fieldset className="grid gap-3 rounded-md border border-line p-3 lg:col-span-2">
          <legend className="px-1 text-sm font-medium text-ink">日历事件配置</legend>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-steel">受邀范围</span>
              <select name="calendarInviteScope" defaultValue={initialConfig.calendarSettings.inviteScope} className="okr-input">
                <option value="company">全公司</option>
                <option value="department">指定部门</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-steel">受邀部门 ID</span>
              <input name="calendarInviteDepartmentId" defaultValue={initialConfig.calendarSettings.inviteDepartmentId} className="okr-input" placeholder="选择指定部门时填写" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-steel">周一事件名称</span>
              <input name="mondaySummary" defaultValue={initialConfig.calendarSettings.monday.summary} className="okr-input" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="text-steel">周一开始</span>
                <input name="mondayStartTime" type="time" defaultValue={initialConfig.calendarSettings.monday.startTime} className="okr-input" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-steel">周一结束</span>
                <input name="mondayEndTime" type="time" defaultValue={initialConfig.calendarSettings.monday.endTime} className="okr-input" />
              </label>
            </div>
            <label className="grid gap-1 text-sm lg:col-span-2">
              <span className="text-steel">周一描述</span>
              <input name="mondayDescription" defaultValue={initialConfig.calendarSettings.monday.description} className="okr-input" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-steel">周五事件名称</span>
              <input name="fridaySummary" defaultValue={initialConfig.calendarSettings.friday.summary} className="okr-input" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="text-steel">周五开始</span>
                <input name="fridayStartTime" type="time" defaultValue={initialConfig.calendarSettings.friday.startTime} className="okr-input" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-steel">周五结束</span>
                <input name="fridayEndTime" type="time" defaultValue={initialConfig.calendarSettings.friday.endTime} className="okr-input" />
              </label>
            </div>
            <label className="grid gap-1 text-sm lg:col-span-2">
              <span className="text-steel">周五描述</span>
              <input name="fridayDescription" defaultValue={initialConfig.calendarSettings.friday.description} className="okr-input" />
            </label>
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">多维表格链接</span>
          <input name="bitableUrl" className="okr-input" placeholder="粘贴飞书多维表格链接，系统会解析 app token" />
        </label>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">多维表格 App Token</span>
          <input
            name="bitableAppToken"
            defaultValue={initialConfig.bitableAppToken}
            className="okr-input"
            placeholder="app_xxx；已有链接时可留空，留空也不会覆盖已保存值"
          />
        </label>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">4 张表 Table ID JSON</span>
          <textarea
            name="bitableTableIds"
            className="okr-input min-h-28"
            defaultValue={JSON.stringify(initialConfig.bitableTableIds, null, 2)}
          />
        </label>
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span className="text-steel">云空间文件夹 Token</span>
          <input name="driveFolderToken" className="okr-input" placeholder="留空则不覆盖已有配置" />
          {initialConfig.hasDriveFolderToken ? <span className="text-xs text-muted">当前已保存云空间目录 Token，留空会保持现有配置。</span> : null}
        </label>
        <div className="flex items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {isPending ? "保存中..." : "保存配置"}
          </button>
          {initialConfig.provider === "real" ? (
            <button
              type="button"
              onClick={verifySavedConfig}
              disabled={isPending}
              className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
              验证已保存配置
            </button>
          ) : null}
          {message ? <span className="text-sm text-steel">{message}</span> : null}
          {helpUrl ? <a className="text-sm font-medium text-primary underline" href={helpUrl} target="_blank" rel="noreferrer">查看飞书权限配置</a> : null}
        </div>
      </form>
    </section>
  );
}

function pruneEmpty(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

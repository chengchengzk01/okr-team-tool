import { DemoDataBootstrapPanel } from "@/components/demo-data-bootstrap-panel";
import { DepartmentManagementPanel } from "@/components/department-management-panel";
import { EmptyGuidanceCard } from "@/components/empty-guidance-card";
import { FeishuConfigForm } from "@/components/feishu-config-form";
import { FeishuIntegrationActions } from "@/components/feishu-integration-actions";
import { PageHeader } from "@/components/page-header";
import { UserManagementPanel } from "@/components/user-management-panel";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { getFeishuConfigReadiness, getFeishuRuntimeConfig } from "@/lib/integrations/feishu-config";
import { listFeishuTasks } from "@/lib/integrations/feishu-task-store";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") redirect("/dashboard");

  const allUsers = (await prismaQueries.listUsers()) ?? repository.listUsers();
  const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
  const quarters = (await prismaQueries.listQuarters()) ?? repository.listQuarters();
  const currentQuarter = quarters.find((quarter) => quarter.status === "active") ?? quarters[0] ?? null;
  const dashboard = currentQuarter ? ((await prismaQueries.getDashboard(user.id)) ?? repository.getDashboard(user.id)) : null;
  const logs = dashboard?.exportLogs.slice(0, 20) ?? [];
  const usersById = new Map(allUsers.map((item) => [item.id, item.name]));
  const departmentsById = new Map(departments.map((item) => [item.id, item.name]));
  const runtimeConfig = await getFeishuRuntimeConfig();
  const config = getFeishuConfigReadiness(runtimeConfig);
  const tasks = listFeishuTasks().slice(0, 12);

  return (
    <>
      <PageHeader title="系统设置与飞书集成" eyebrow={config.mode === "mock" ? "当前为 MockFeishuProvider" : "当前为 RealFeishuProvider"} />
      <section className="mb-4 rounded-lg border border-line bg-card p-4 text-sm shadow-panel">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-semibold text-ink">飞书集成状态</div>
            <div className="mt-1 text-steel">{config.message}</div>
          </div>
          <span className={config.ready ? "text-primary" : "text-status-red"}>{config.ready ? "ready" : "not ready"}</span>
        </div>
      </section>
      <section className="mb-4 rounded-lg border border-line bg-card p-5 shadow-panel">
        <h2 className="font-semibold text-ink">配置检查</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {config.checks.map((item) => (
            <ReadinessItem key={item.key} item={item} />
          ))}
        </div>
        {config.mode === "real" && config.missingItems.length ? (
          <div className="mt-4 rounded-md border border-status-red bg-status-red-bg px-4 py-3 text-sm text-status-red">
            尚缺配置：{config.missingItems.join("、")}
          </div>
        ) : null}
      </section>
      <section className="mb-4 rounded-lg border border-line bg-card p-5 shadow-panel">
        <h2 className="font-semibold text-ink">页面回归建议顺序</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {[
            {
              title: "1. 登录前提",
              body: "先从 /login 完成正式飞书登录，或在本地使用超级管理员模拟入口，确认能进入 dashboard。"
            },
            {
              title: "2. 设置页执行任务",
              body: "依次执行组织同步、日历创建/更新/终止、多维表格同步，并在下方最近集成任务里确认状态与错误信息。"
            },
            {
              title: "3. Review 导出闭环",
              body: "去 /review 导出季度报告，再回到本页查看最近集成任务与导出日志，确认文档链接和范围描述。"
            }
          ].map((item) => (
            <div key={item.title} className="rounded-md border border-line bg-hover p-4 text-sm leading-6 text-steel">
              <div className="font-semibold text-ink">{item.title}</div>
              <p className="mt-2">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mb-4">
        <EmptyGuidanceCard
          title="首次使用建议顺序"
          description="如果这是你第一次把系统跑起来，建议先创建季度，再完成组织同步，然后补一套最小演示数据，最后回到看板、周仪式和报表页做验收。"
          actions={[
            { href: "/quarters", label: "先看季度" },
            { href: "/dashboard", label: "回到看板", tone: "secondary" }
          ]}
          tip="当前设置页已经集中了真实飞书配置、演示数据、部门管理、用户管理和导出日志，适合作为首用引导中心。"
        />
      </section>
      <FeishuConfigForm
        initialConfig={{
          provider: runtimeConfig.provider,
          appId: runtimeConfig.appId,
          redirectUri: runtimeConfig.redirectUri,
          rootDepartmentId: runtimeConfig.rootDepartmentId,
          calendarId: runtimeConfig.calendarId,
          hasAppSecret: Boolean(runtimeConfig.appSecret),
          bitableAppToken: runtimeConfig.bitableAppToken,
          calendarSettings: runtimeConfig.calendarSettings,
          bitableTableIds: runtimeConfig.bitableTableIds,
          hasDriveFolderToken: Boolean(runtimeConfig.driveFolderToken)
        }}
      />
      {currentQuarter ? (
        <FeishuIntegrationActions
          mode={config.mode}
          quarterId={currentQuarter.id}
          readiness={{
            oauthReady: config.oauthReady,
            orgSyncReady: config.orgSyncReady,
            calendarReady: config.calendarReady,
            bitableReady: config.bitableReady,
            driveReady: config.driveReady
          }}
        />
      ) : (
        <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
          <h2 className="font-semibold text-ink">系统尚未初始化季度</h2>
          <p className="mt-2 text-sm leading-6 text-steel">
            设置页已可访问，但涉及季度的数据同步、日历和文档导出需要先创建至少一个季度。
          </p>
          <a className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white" href="/quarters">
            先去创建季度
          </a>
        </section>
      )}
      <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-ink">最近集成任务</h2>
          <p className="text-sm text-steel">查看组织同步、日历、多维表格和文档导出的当前执行状态。</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted-surface text-xs text-steel">
              <tr>
                <th className="px-3 py-2 font-medium">任务类型</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">最近进度</th>
                <th className="px-3 py-2 font-medium">更新时间</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-line">
                  <td className="px-3 py-2">{taskTypeLabel(task.type)}</td>
                  <td className="px-3 py-2">
                    <span className={taskStatusClass(task.status)}>{taskStatusLabel(task.status)}</span>
                  </td>
                  <td className="px-3 py-2 text-steel">
                    {task.exportLog?.feishuDocUrl ? (
                      <a className="text-primary underline" href={task.exportLog.feishuDocUrl} target="_blank" rel="noreferrer">
                        {task.exportLog.message ?? task.message}
                      </a>
                    ) : (
                      task.error ?? task.message
                    )}
                  </td>
                  <td className="px-3 py-2 text-steel">{formatDateTime(task.updatedAt)}</td>
                </tr>
              ))}
              {tasks.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-steel" colSpan={4}>
                    当前还没有集成任务记录。请先执行上方组织同步、日历、多维表格或导出动作，再回到这里确认状态。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <DemoDataBootstrapPanel />
      <DepartmentManagementPanel departments={departments} />
      <UserManagementPanel users={allUsers} departments={departments} />
      <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
        <h2 className="font-semibold">导出日志</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted-surface text-xs text-steel">
              <tr>
                <th className="px-3 py-2 font-medium">类型</th>
                <th className="px-3 py-2 font-medium">导出人</th>
                <th className="px-3 py-2 font-medium">范围</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">说明</th>
                <th className="px-3 py-2 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line">
                  <td className="px-3 py-2">{log.exportType}</td>
                  <td className="px-3 py-2">{usersById.get(log.exportedBy) ?? log.exportedBy}</td>
                  <td className="px-3 py-2">{formatExportScope(log.scope, log.departmentId, departmentsById)}</td>
                  <td className={log.status === "failed" ? "px-3 py-2 text-status-red" : "px-3 py-2 text-primary"}>{log.status}</td>
                  <td className="px-3 py-2 text-steel">
                    {log.feishuDocUrl ? (
                      <a className="text-primary underline" href={log.feishuDocUrl} target="_blank" rel="noreferrer">
                        {log.message ?? "查看文档"}
                      </a>
                    ) : (
                      log.message
                    )}
                  </td>
                  <td className="px-3 py-2 text-steel">{new Date(log.exportedAt).toLocaleString("zh-CN", { hour12: false })}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-steel" colSpan={6}>
                    暂无导出日志。可先到 /review 执行季度报告导出，再回到这里确认范围、导出人和文档链接。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReadinessItem({
  item
}: {
  item: {
    title: string;
    ready: boolean;
    detail: string;
    missingFields: string[];
    helpUrl?: string;
  };
}) {
  return (
    <div className="rounded-md border border-line bg-hover p-3">
      <div className="text-xs text-muted">{item.title}</div>
      <div className={item.ready ? "mt-1 font-semibold text-primary" : "mt-1 font-semibold text-status-red"}>
        {item.ready ? "已就绪" : "待配置"}
      </div>
      <p className="mt-2 text-xs leading-5 text-steel">{item.detail}</p>
      {item.missingFields.length ? (
        <div className="mt-2 text-[11px] leading-5 text-status-red">缺少：{item.missingFields.join("、")}</div>
      ) : null}
      {item.helpUrl ? (
        <a className="mt-2 inline-block text-[11px] font-medium text-primary underline" href={item.helpUrl} target="_blank" rel="noreferrer">
          查看官方文档
        </a>
      ) : null}
    </div>
  );
}

function taskTypeLabel(value: string) {
  const labels: Record<string, string> = {
    directory_sync: "组织同步",
    calendar_events: "日历事件",
    bitable_sync: "多维表格",
    feishu_doc: "季度文档",
    v2_report_doc: "V2 报表文档"
  };
  return labels[value] ?? value;
}

function taskStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "待执行",
    running: "执行中",
    success: "成功",
    failed: "失败"
  };
  return labels[value] ?? value;
}

function taskStatusClass(value: string) {
  if (value === "success") return "font-medium text-primary";
  if (value === "failed") return "font-medium text-status-red";
  if (value === "running") return "font-medium text-ink";
  return "font-medium text-muted";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatExportScope(scope: string, departmentId: string | undefined, departmentsById: Map<string, string>) {
  if (scope === "company") return "全公司";
  if (scope === "department") {
    const departmentName = departmentId ? departmentsById.get(departmentId) : undefined;
    return departmentName ? `指定部门 · ${departmentName}` : "指定部门";
  }
  if (scope === "individual") return "个人 OKR";
  return scope;
}

import { HealthMetricManagementPanel } from "@/components/health-metric-management-panel";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { redirect } from "next/navigation";

export default async function HealthMetricDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id);
  if (!fullUser) redirect("/login");

  const { id } = await params;
  const metric = (await prismaQueries.getHealthMetricDetail(fullUser, id)) ?? repository.getHealthMetricDetail(fullUser, id);
  const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
  const owner = users.find((item) => item.id === metric.ownerId);
  const canManage =
    fullUser.role === "super_admin" ||
    (fullUser.role === "dept_manager" && metric.level === "department" && metric.departmentId === fullUser.departmentId);

  return (
    <>
      <PageHeader title={metric.name} eyebrow="健康指标历史记录">
        <a href="/health" className="rounded-md border border-line bg-card px-3 py-2 text-sm font-medium text-steel hover:bg-hover">返回健康指标</a>
      </PageHeader>

      <section className="rounded-lg border border-line bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="层级" value={metric.level === "company" ? "公司级" : "部门级"} />
          <Info label="负责人" value={owner?.name ?? "-"} />
          <Info label="阈值" value={formatThreshold(metric)} />
          <Info label="更新频率" value={frequencyLabel(metric.updateFrequency)} />
        </div>
        {metric.description ? <p className="mt-4 text-sm leading-6 text-steel">{metric.description}</p> : null}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-panel">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">历史记录</h2>
          </div>
          {metric.records.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-hover text-xs text-muted">
                  <tr>
                    <Th>记录时间</Th>
                    <Th>数值</Th>
                    <Th>状态</Th>
                    <Th>备注</Th>
                  </tr>
                </thead>
                <tbody>
                  {metric.records.map((record) => (
                    <tr key={record.id} className="border-t border-line">
                      <Td>{formatDateTime(record.recordedAt)}</Td>
                      <Td>{record.currentValue.toFixed(1)}</Td>
                      <Td>
                        <StatusPill tone={record.status === "healthy" ? "green" : record.status === "warning" ? "yellow" : "red"}>
                          {statusLabel(record.status)}
                        </StatusPill>
                      </Td>
                      <Td>{record.note || "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-muted">暂无历史记录。</div>
          )}
        </section>

        <HealthMetricManagementPanel
          metricId={metric.id}
          isActive={metric.isActive}
          canManage={canManage}
          initialValues={{
            name: metric.name,
            description: metric.description,
            ownerId: metric.ownerId,
            thresholdType: metric.thresholdType,
            thresholdValue: metric.thresholdValue,
            thresholdMin: metric.thresholdMin,
            thresholdMax: metric.thresholdMax,
            updateFrequency: metric.updateFrequency,
            level: metric.level,
            departmentId: metric.departmentId
          }}
          users={users}
        />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-hover p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-3 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-5 py-3 text-steel">{children}</td>;
}

function formatThreshold(metric: {
  thresholdType: "gte" | "lte" | "between";
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
}) {
  if (metric.thresholdType === "gte" && metric.thresholdValue === 7) return "0-10 健康度";
  if (metric.thresholdType === "gte") return `不低于 ${metric.thresholdValue}`;
  if (metric.thresholdType === "lte") return `不超过 ${metric.thresholdValue}`;
  return `${metric.thresholdMin} - ${metric.thresholdMax}`;
}

function frequencyLabel(value: string) {
  const labels: Record<string, string> = {
    weekly: "每周",
    monthly: "每月",
    quarterly: "每季度"
  };
  return labels[value] ?? value;
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    healthy: "健康",
    warning: "预警",
    exceeded: "超限"
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

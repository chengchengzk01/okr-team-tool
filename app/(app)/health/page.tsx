import { HealthMetricCreateForm } from "@/components/health-metric-create-form";
import { HealthMetricRecordForm } from "@/components/health-metric-record-form";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { redirect } from "next/navigation";

export default async function HealthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id)!;
  const metrics = (await prismaQueries.listHealthMetrics(fullUser)) ?? repository.listHealthMetrics(fullUser);
  const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
  const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
  const companyMetrics = metrics.filter((metric) => metric.level === "company");
  const departmentMetrics = metrics.filter((metric) => metric.level === "department");

  return (
    <>
      <PageHeader title="健康指标" eyebrow="不要为了 OKR 放弃的底线" />
      <div className="space-y-6">
        <HealthMetricCreateForm
          canCreate={fullUser.role !== "member"}
          role={fullUser.role}
          departments={departments.filter((department) => department.id !== "dept-company")}
          users={users}
          currentDepartmentId={fullUser.departmentId}
        />
        <MetricGroup title="公司级健康指标" metrics={companyMetrics} userId={fullUser.id} userRole={fullUser.role} userDepartmentId={fullUser.departmentId} users={users} />
        <MetricGroup title="部门健康指标" metrics={departmentMetrics} userId={fullUser.id} userRole={fullUser.role} userDepartmentId={fullUser.departmentId} users={users} />
      </div>
    </>
  );
}

type MetricItem = ReturnType<typeof repository.listHealthMetrics>[number];

function MetricGroup({ title, metrics, userId, userRole, userDepartmentId, users }: { title: string; metrics: MetricItem[]; userId: string; userRole: string; userDepartmentId?: string; users: Array<{ id: string; name: string }> }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-panel">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-base font-semibold leading-6 text-ink">{title}</h2>
      </div>
      {metrics.length ? (
        <div className="divide-y divide-line">
          {metrics.map((metric) => {
            const owner = users.find((item) => item.id === metric.ownerId);
            const canUpdate =
              userRole === "super_admin" ||
              metric.ownerId === userId ||
              (userRole === "dept_manager" && metric.level === "department" && metric.departmentId === userDepartmentId);
            return (
              <div key={metric.id} className="px-6 py-4">
                <div className="grid items-center gap-4 lg:grid-cols-[minmax(220px,1.4fr)_90px_130px_120px_150px_96px_92px]">
                  <div>
                    <div className="font-semibold text-ink">{metric.name}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">{metric.description}</div>
                  </div>
                  <div className="text-sm text-steel">{formatHealthScore(metric.latestRecord?.currentValue)}</div>
                  <div className="text-sm text-steel">{formatThreshold(metric)}</div>
                  <StatusPill tone={metric.latestRecord?.status === "healthy" ? "green" : metric.latestRecord?.status === "warning" ? "yellow" : "red"}>
                    {metric.latestRecord?.status ?? "未记录"}
                  </StatusPill>
                  <div className="text-xs text-muted">{formatRecordedAt(metric.latestRecord?.recordedAt)}</div>
                  <div className="text-sm text-steel">{owner?.name ?? "-"}</div>
                  <a href={`/health/${metric.id}`} className="text-sm font-medium text-primary underline">查看历史</a>
                </div>
                <HealthMetricRecordForm
                  metricId={metric.id}
                  canUpdate={canUpdate}
                  latestValue={metric.latestRecord?.currentValue}
                  thresholdType={metric.thresholdType}
                  thresholdValue={metric.thresholdValue}
                  thresholdMin={metric.thresholdMin}
                  thresholdMax={metric.thresholdMax}
                  inputMin={metric.inputMin}
                  inputMax={metric.inputMax}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-8 text-sm text-muted">还没有健康指标，添加一个团队不愿放弃的底线指标。</div>
      )}
    </section>
  );
}

function formatThreshold(metric: {
  thresholdType: "gte" | "lte" | "between";
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
}) {
  if (metric.thresholdType === "gte" && metric.thresholdValue === 7) return "0-10 健康度";
  if (metric.thresholdType === "gte") return `>= ${metric.thresholdValue}`;
  if (metric.thresholdType === "lte") return `<= ${metric.thresholdValue}`;
  return `${metric.thresholdMin} - ${metric.thresholdMax}`;
}

function formatHealthScore(value: number | undefined) {
  return value === undefined ? "-" : value.toFixed(1);
}

function formatRecordedAt(value: string | undefined) {
  if (!value) return "未更新";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

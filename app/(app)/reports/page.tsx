import { PageHeader } from "@/components/page-header";
import { ReportExportAction } from "@/components/report-export-action";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import type { ConfidenceAlert, ConfidenceTrend } from "@/lib/domain/types";
import { redirect } from "next/navigation";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ departmentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  const currentQuarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
  const requestedDepartmentId = params.departmentId && params.departmentId !== "all" ? params.departmentId : undefined;
  const reportFilter = { departmentId: requestedDepartmentId };
  const report =
    (await prismaQueries.getV2Report(user.id, currentQuarter.id, reportFilter)) ??
    repository.getV2Report(user.id, currentQuarter.id, reportFilter);
  const currentSummary = report.quarterSummaries.find((item) => item.quarterId === currentQuarter.id) ?? report.quarterSummaries[0];
  const selectedDepartment = requestedDepartmentId ? departments.find((item) => item.id === requestedDepartmentId) : undefined;
  const filterLabel = selectedDepartment ? `当前范围：${selectedDepartment.name}` : "当前范围：全公司";

  return (
    <>
      <PageHeader title="统计报表" eyebrow="V2.0 · 跨季度对比与趋势预警">
        <ReportExportAction
          canExport={user.role !== "member"}
          quarterId={currentQuarter.id}
          scope={user.role === "dept_manager" || requestedDepartmentId ? "department" : "company"}
          departmentId={user.role === "dept_manager" ? user.departmentId : requestedDepartmentId}
        />
      </PageHeader>
      <ReportScopeTabs
        userRole={user.role}
        departments={departments}
        selectedDepartmentId={requestedDepartmentId}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="KR 平均完成率" value={formatPercent(currentSummary?.averageKrCompletionRate)} />
        <MetricCard title="平均信心值" value={formatScore(currentSummary?.averageConfidenceScore)} />
        <MetricCard title="周一承诺提交率" value={formatPercent(currentSummary?.weeklyCommitmentRate)} />
        <MetricCard title="风险 KR 数" value={`${report.confidenceAlerts.length}`} />
      </section>

      <section className="mt-4 rounded-lg border border-line bg-card shadow-panel">
        <SectionHeader title="季度对比" description={`${filterLabel} · 当前季度与历史归档季度的 OKR 执行结果。`} />
        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-line text-left text-sm">
            <thead className="bg-hover text-xs text-muted">
              <tr>
                <Th>季度</Th>
                <Th>状态</Th>
                <Th>Objective</Th>
                <Th>KR</Th>
                <Th>KR 完成率</Th>
                <Th>平均信心值</Th>
                <Th>周一提交率</Th>
                <Th>周五提交率</Th>
                <Th>健康指标</Th>
              </tr>
            </thead>
            <tbody>
              {report.quarterSummaries.map((quarter) => (
                <tr key={quarter.quarterId} className="border-t border-line">
                  <Td className="font-semibold text-ink">{quarter.quarterName}</Td>
                  <Td><StatusPill tone="blue">{quarter.quarterStatus}</StatusPill></Td>
                  <Td>{quarter.objectiveCount}</Td>
                  <Td>{quarter.keyResultCount}</Td>
                  <Td>{formatPercent(quarter.averageKrCompletionRate)}</Td>
                  <Td>{formatScore(quarter.averageConfidenceScore)}</Td>
                  <Td>{formatPercent(quarter.weeklyCommitmentRate)}</Td>
                  <Td>{formatPercent(quarter.weeklyCelebrationRate)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <StatusPill tone="green">{quarter.healthStatusCounts.healthy} healthy</StatusPill>
                      <StatusPill tone="yellow">{quarter.healthStatusCounts.warning} warning</StatusPill>
                      <StatusPill tone="red">{quarter.healthStatusCounts.exceeded} exceeded</StatusPill>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border border-line bg-card shadow-panel">
          <SectionHeader title="信心值趋势预警" description={`${filterLabel} · 低分、连续下降、本周未提交和进度滞后的 KR。`} />
          <div className="divide-y divide-line">
            {report.confidenceAlerts.length ? report.confidenceAlerts.map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <a href={`/key-results/${alert.keyResultId}`} className="font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
                      {alert.keyResultDescription}
                    </a>
                    <div className="mt-1 text-xs text-steel">
                      {alert.quarterName} · {alert.departmentName ?? "公司级"} · 负责人：{alert.ownerName}
                    </div>
                  </div>
                  <StatusPill tone={alertTone(alert)}>{alertLabel(alert)}</StatusPill>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-steel sm:grid-cols-3">
                  <div>最新信心值：{alert.latestScore ?? "本周未提交"}</div>
                  <div>最近三周：{alert.recentScores.length ? alert.recentScores.join(" / ") : "-"}</div>
                  <div>KR 完成率：{formatPercent(alert.completionRate)}</div>
                </div>
              </div>
            )) : (
              <div className="p-4 text-sm text-steel">当前没有信心值趋势预警。</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-card shadow-panel">
          <SectionHeader title="KR 信心值趋势" description={`${filterLabel} · 按周展示可见 KR 的历史信心值，辅助判断趋势变化。`} />
          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
            {report.confidenceTrends.length ? report.confidenceTrends.map((trend) => (
              <ConfidenceTrendRow key={trend.keyResultId} trend={trend} />
            )) : (
              <div className="text-sm text-steel">暂无信心值历史记录。</div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border border-line bg-card shadow-panel">
          <SectionHeader title="部门对比" description={`${filterLabel} · 按当前用户可见范围统计部门执行情况。`} />
          <div className="space-y-3 p-4">
            {report.departmentSummaries.length ? report.departmentSummaries.map((department) => (
              <div key={department.departmentId} className="rounded-md border border-line bg-hover p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-ink">{department.departmentName}</div>
                  <StatusPill tone={department.alertCount > 0 ? "yellow" : "blue"}>{department.alertCount} 个风险</StatusPill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-steel">
                  <div>Objective：{department.objectiveCount}</div>
                  <div>KR：{department.keyResultCount}</div>
                  <div>完成率：{formatPercent(department.averageKrCompletionRate)}</div>
                  <div>信心值：{formatScore(department.averageConfidenceScore)}</div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-steel">当前范围暂无部门对比数据。</div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-line bg-card shadow-panel">
        <SectionHeader title="健康指标季度走势" description={`${filterLabel} · 按可见健康指标展示历史记录，便于复盘底线指标变化。`} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {report.healthTrends.length ? report.healthTrends.map((trend) => (
            <div key={trend.metricId} className="rounded-md border border-line bg-hover p-3">
              <a href={`/health/${trend.metricId}`} className="font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
                {trend.metricName}
              </a>
              <div className="mt-3 space-y-2">
                {trend.records.map((record) => (
                  <div key={`${trend.metricId}-${record.recordedAt}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-steel">{formatDate(record.recordedAt)}</span>
                    <span className="font-medium">{record.value.toFixed(1)}</span>
                    <StatusPill tone={record.status === "healthy" ? "green" : record.status === "warning" ? "yellow" : "red"}>{record.status}</StatusPill>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="text-sm text-steel">当前范围暂无健康指标季度走势。</div>
          )}
        </div>
      </section>
    </>
  );
}

function ReportScopeTabs({
  userRole,
  departments,
  selectedDepartmentId
}: {
  userRole: string;
  departments: Array<{ id: string; name: string }>;
  selectedDepartmentId?: string;
}) {
  if (userRole !== "super_admin") return null;

  const tabs = [
    { href: "/reports?departmentId=all", label: "全公司", active: !selectedDepartmentId },
    ...departments
      .filter((department) => department.id !== "dept-company")
      .map((department) => ({
        href: `/reports?departmentId=${department.id}`,
        label: department.name,
        active: selectedDepartmentId === department.id
      }))
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            tab.active ? "border-primary bg-primary-light text-primary" : "border-line bg-card text-steel hover:bg-hover"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}

function ConfidenceTrendRow({ trend }: { trend: ConfidenceTrend }) {
  const maxWeek = Math.max(13, ...trend.scores.map((point) => point.weekNumber));
  const scoreByWeek = new Map(trend.scores.map((point) => [point.weekNumber, point]));

  return (
    <div className="rounded-md border border-line bg-hover p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a href={`/key-results/${trend.keyResultId}`} className="font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
            {trend.keyResultDescription}
          </a>
          <div className="mt-1 text-xs text-steel">
            {trend.objectiveTitle} · {trend.departmentName ?? "公司级"} · 负责人：{trend.ownerName}
          </div>
        </div>
        <StatusPill tone={scoreTone(trend.scores.at(-1)?.score)}>{trend.scores.at(-1)?.score ?? "无数据"}</StatusPill>
      </div>
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${maxWeek}, minmax(18px, 1fr))` }}>
        {Array.from({ length: maxWeek }, (_, index) => {
          const weekNumber = index + 1;
          const point = scoreByWeek.get(weekNumber);
          return (
            <div key={`${trend.keyResultId}-${weekNumber}`} className="text-center">
              <div
                className={`flex h-7 items-center justify-center rounded border text-xs font-semibold ${
                  point ? scoreBoxClass(point.score) : "border-line bg-card text-muted"
                }`}
                title={point ? `第 ${weekNumber} 周：${point.score}${point.note ? `，${point.note}` : ""}` : `第 ${weekNumber} 周未提交`}
              >
                {point?.score ?? "-"}
              </div>
              <div className="mt-1 text-[10px] text-muted">{weekNumber}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-panel">
      <div className="text-xs font-medium text-muted">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-line px-4 py-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-steel">{description}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 ${className}`}>{children}</td>;
}

function formatPercent(value: number | undefined) {
  if (value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : value.toFixed(1);
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function alertTone(alert: ConfidenceAlert): "red" | "yellow" | "gray" {
  if (alert.severity === "critical") return "red";
  if (alert.severity === "missing") return "gray";
  return "yellow";
}

function alertLabel(alert: ConfidenceAlert) {
  const labels: Record<ConfidenceAlert["reason"], string> = {
    low_score: "低信心值",
    medium_score: "信心值需关注",
    declining_trend: "连续下降",
    progress_lagging: "进度滞后",
    missing_this_week: "本周未提交"
  };
  return labels[alert.reason];
}

function scoreTone(score: number | undefined): "green" | "yellow" | "red" | "gray" {
  if (score === undefined) return "gray";
  if (score >= 7) return "green";
  if (score >= 4) return "yellow";
  return "red";
}

function scoreBoxClass(score: number) {
  if (score >= 7) return "border-green-200 bg-green-50 text-green-700";
  if (score >= 4) return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-red-200 bg-red-50 text-red-700";
}

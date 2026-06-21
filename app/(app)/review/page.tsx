import { QuarterReviewForm } from "@/components/quarter-review-form";
import { QuarterDocumentExportAction } from "@/components/quarter-document-export-action";
import { KeyResultReviewForm } from "@/components/key-result-review-form";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import type { QuarterReview } from "@/lib/domain/types";
import { redirect } from "next/navigation";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullUser = (await prismaQueries.getUser(user.id)) ?? repository.getUser(user.id)!;
  const quarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const rows = (await prismaQueries.getQuarterReviewSummary(fullUser, quarter.id)) ?? repository.getQuarterReviewSummary(quarter.id, fullUser);
  const quarterReviews = (await prismaQueries.listQuarterReviews(fullUser, quarter.id)) ?? [];
  const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
  const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();
  const isReadOnly = quarter.status === "archived";
  const currentQuarterReview = pickCurrentQuarterReview(quarterReviews, fullUser);

  return (
    <>
      <PageHeader title="季度 Review" eyebrow={`${quarter.name} · KR 最终复盘与下季度启示`}>
        <QuarterDocumentExportAction
          canExport={fullUser.role === "super_admin" || fullUser.role === "dept_manager" || fullUser.role === "member"}
          quarterId={quarter.id}
          scope={fullUser.role === "dept_manager" ? "department" : fullUser.role === "member" ? "individual" : "company"}
          availableScopes={
            fullUser.role === "super_admin"
              ? [
                  { value: "company", label: "全公司季度报告" },
                  { value: "department", label: "指定部门季度报告" },
                  { value: "individual", label: "个人 OKR 报告" }
                ]
              : fullUser.role === "dept_manager"
                ? [{ value: "department", label: "指定部门季度报告" }]
                : [{ value: "individual", label: "个人 OKR 报告" }]
          }
          availableDepartments={
            fullUser.role === "super_admin"
              ? departments.map((department) => ({ id: department.id, name: department.name }))
              : fullUser.departmentId
                ? departments.filter((department) => department.id === fullUser.departmentId).map((department) => ({ id: department.id, name: department.name }))
                : []
          }
          defaultDepartmentId={fullUser.departmentId}
          availableUsers={
            fullUser.role === "super_admin"
              ? users.map((item) => ({ id: item.id, name: item.name }))
              : [{ id: fullUser.id, name: fullUser.name }]
          }
          defaultUserId={fullUser.id}
        />
        <StatusPill tone="blue">{quarter.status}</StatusPill>
      </PageHeader>
      <div className="space-y-4">
        <QuarterReviewForm
          quarterId={quarter.id}
          quarterStatus={quarter.status}
          role={fullUser.role}
          review={currentQuarterReview}
        />
        {rows.map(({ keyResult, completionRate, review }) => {
          const owner = users.find((item) => item.id === keyResult.ownerId);
          const objective = repository.getObjective(keyResult.objectiveId);
          const canReview =
            fullUser.role === "super_admin" ||
            keyResult.ownerId === fullUser.id ||
            (fullUser.role === "dept_manager" && objective?.departmentId === fullUser.departmentId);
          return (
            <section key={keyResult.id} className="rounded-lg border border-line bg-card p-5 shadow-panel">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">负责人：{owner?.name ?? "-"}</div>
                  <h2 className="mt-1 text-lg font-semibold">{keyResult.description}</h2>
                  <div className="mt-2 text-sm text-steel">
                    当前值 {keyResult.currentValue} / 目标值 {keyResult.targetValue}
                    {keyResult.unit ? ` ${keyResult.unit}` : ""}
                  </div>
                </div>
                <div className="min-w-36 border border-line bg-paper p-3 text-sm">
                  <div className="text-steel">完成率</div>
                  <div className="mt-1 text-2xl font-semibold text-ink">{Math.round(completionRate * 100)}%</div>
                </div>
              </div>
              {review ? (
                <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                  <ReviewNote label="最终值" value={String(review.finalValue)} />
                  <ReviewNote label="复盘信心值" value={`${review.confidenceScore}/10`} />
                  <ReviewNote label="下季度动作" value={review.nextStep || "-"} />
                </div>
              ) : null}
              <KeyResultReviewForm
                keyResultId={keyResult.id}
                quarterId={quarter.id}
                canReview={canReview}
                isReadOnly={isReadOnly}
                isReviewing={quarter.status === "reviewing"}
                currentValue={keyResult.currentValue}
                review={review}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}

function pickCurrentQuarterReview(
  reviews: QuarterReview[],
  user: { id: string; role: "super_admin" | "dept_manager" | "member"; departmentId?: string }
) {
  if (user.role === "super_admin") return reviews.find((review) => review.level === "company" && review.ownerId === user.id);
  if (user.role === "dept_manager") return reviews.find((review) => review.level === "department" && review.departmentId === user.departmentId);
  return reviews.find((review) => review.level === "individual" && review.ownerId === user.id);
}

function ReviewNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-paper p-3">
      <div className="text-xs text-steel">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

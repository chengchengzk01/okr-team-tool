import { EmptyGuidanceCard } from "@/components/empty-guidance-card";
import { OkrAuthoringForms } from "@/components/okr-authoring-forms";
import { PageHeader } from "@/components/page-header";
import { OkrTree } from "@/components/okr-tree";
import { OkrTreeFilters } from "@/components/okr-tree-filters";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleOkrTreeFilter, repository } from "@/lib/data/repository";
import { prismaQueries } from "@/lib/data/prisma-queries";
import type { OkrTreeNode } from "@/lib/data/repository";

export default async function OkrPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; departmentId?: string }>;
}) {
  const quarter = (await prismaQueries.getCurrentQuarter()) ?? repository.getCurrentQuarter();
  const user = await getCurrentUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const departmentId = params.departmentId ?? "all";
  const effectiveFilter = user ? getVisibleOkrTreeFilter(user, { query, departmentId }) : { query, departmentId };
  const nodes = (await prismaQueries.buildOkrTree(quarter.id, effectiveFilter)) ?? repository.buildOkrTree(quarter.id, effectiveFilter);
  const objectives = (await prismaQueries.listObjectives(quarter.id)) ?? repository.listObjectives(quarter.id);
  const users = (await prismaQueries.listUsers()) ?? repository.listUsers();
  const departments = (await prismaQueries.listDepartments()) ?? repository.listDepartments();

  return (
    <>
      <PageHeader title="OKR 树状视图" eyebrow={quarter.name}>
        <OkrTreeFilters departments={departments} query={query} departmentId={departmentId} />
      </PageHeader>
      {quarter.status !== "archived" ? (
        <OkrAuthoringForms
          quarterId={quarter.id}
          quarterStatus={quarter.status}
          currentUser={user}
          users={users}
          departments={departments}
          objectives={objectives}
          parentKeyResults={collectParentKeyResults(nodes)}
        />
      ) : null}
      {nodes.length ? (
        <OkrTree nodes={nodes} />
      ) : (
        <EmptyGuidanceCard
          title="当前季度还没有可展示的 OKR"
          description={
            query || departmentId !== "all"
              ? "当前筛选条件下没有找到匹配的 OKR。你可以先清空筛选，或先补一套演示数据查看完整结构。"
              : "当前季度还没有录入 OKR。你可以先创建一套演示数据，或直接从公司级 / 部门级 / 个人级 Objective 开始录入。"
          }
          actions={[
            ...(query || departmentId !== "all" ? [{ href: "/okr", label: "清空筛选", tone: "secondary" as const }] : []),
            ...(user?.role === "super_admin"
              ? [
                  { href: "/settings", label: "去补演示数据" },
                  { href: "/quarters", label: "查看季度设置", tone: "secondary" as const }
                ]
              : [{ href: "/weekly", label: "先去周仪式页", tone: "secondary" as const }])
          ]}
          tip="如果你刚刚补了演示数据，刷新本页后就能看到公司、部门和个人三级 OKR 结构。"
        />
      )}
    </>
  );
}

function collectParentKeyResults(nodes: OkrTreeNode[]): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    ...node.keyResults.map((keyResult) => ({
      id: keyResult.id,
      label: `${node.title} / ${keyResult.description}`
    })),
    ...node.keyResults.flatMap((keyResult) => collectParentKeyResults(keyResult.children))
  ]);
}

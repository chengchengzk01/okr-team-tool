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
        <div className="rounded-lg border border-dashed border-line bg-card p-8 text-sm text-steel">没有找到匹配的 OKR。</div>
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

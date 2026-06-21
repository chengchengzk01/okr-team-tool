import type { Department } from "@/lib/domain/types";

export function OkrTreeFilters({
  departments,
  query,
  departmentId
}: {
  departments: Department[];
  query: string;
  departmentId: string;
}) {
  return (
    <form className="flex flex-wrap gap-2" action="/okr">
      <input
        className="rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        name="q"
        defaultValue={query}
        placeholder="搜索 Objective / KR"
      />
      <select className="rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-primary" name="departmentId" defaultValue={departmentId || "all"}>
        <option value="all">全部部门</option>
        {departments
          .filter((department) => department.id !== "dept-company")
          .map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
      </select>
      <button className="rounded-md border border-primary bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-hover">筛选</button>
      {(query || (departmentId && departmentId !== "all")) ? (
        <a className="rounded-md border border-line bg-card px-3 py-2 text-sm text-ink transition hover:border-primary" href="/okr">
          清除
        </a>
      ) : null}
    </form>
  );
}

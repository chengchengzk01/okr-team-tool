import { QuarterEditorPanel } from "@/components/quarter-editor-panel";
import { QuarterStatusActions } from "@/components/quarter-status-actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { repository } from "@/lib/data/repository";
import { redirect } from "next/navigation";

export default async function QuartersPage() {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") redirect("/dashboard");
  const canManage = user?.role === "super_admin";
  const quarters = (await prismaQueries.listQuarters()) ?? repository.listQuarters();

  return (
    <>
      <PageHeader title="季度节奏管理" eyebrow="planning → active → reviewing → archived" />
      <QuarterEditorPanel canManage={canManage} quarters={quarters} />
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-panel">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-hover">
            <tr>
              <th className="border-b border-line px-4 py-3">季度</th>
              <th className="border-b border-line px-4 py-3">起止日期</th>
              <th className="border-b border-line px-4 py-3">状态</th>
              <th className="border-b border-line px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter) => (
              <tr key={quarter.id}>
                <td className="border-b border-line px-4 py-3 font-medium">{quarter.name}</td>
                <td className="border-b border-line px-4 py-3 text-steel">{quarter.startDate} 至 {quarter.endDate}</td>
                <td className="border-b border-line px-4 py-3"><StatusPill tone="blue">{quarter.status}</StatusPill></td>
                <td className="border-b border-line px-4 py-3">
                  <QuarterStatusActions quarterId={quarter.id} currentStatus={quarter.status} canManage={canManage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

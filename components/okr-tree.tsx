import type { OkrTreeNode } from "@/lib/data/repository";
import { StatusPill } from "@/components/status-pill";

export function OkrTree({ nodes }: { nodes: OkrTreeNode[] }) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <ObjectiveNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function ObjectiveNode({ node, depth }: { node: OkrTreeNode; depth: number }) {
  return (
    <section className="rounded-lg border border-line bg-card">
      <div className="border-b border-line bg-hover px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={depth === 0 ? "blue" : "gray"}>{levelLabel(node.level)}</StatusPill>
          <a href={`/objectives/${node.id}`} className="font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
            {node.title}
          </a>
          {node.owner ? <span className="text-sm text-steel">负责人：{node.owner.name}</span> : null}
        </div>
      </div>
      <div className="divide-y divide-line">
        {node.keyResults.map((kr) => (
          <div key={kr.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={dotClass(kr.confidenceColor)} />
                  <a href={`/key-results/${kr.id}`} className="font-medium text-ink underline-offset-2 hover:text-primary hover:underline">
                    {kr.description}
                  </a>
                </div>
                <div className="mt-2 text-sm text-steel">
                  当前 {kr.currentValue}{kr.unit} / 目标 {kr.targetValue}{kr.unit}
                </div>
              </div>
              <StatusPill tone={kr.confidenceColor as "green" | "yellow" | "red" | "gray"}>
                {kr.confidenceScore ? `信心值 ${kr.confidenceScore.score}` : "本周未更新"}
              </StatusPill>
              {kr.sprintWarning ? <StatusPill tone={kr.sprintWarning.tone}>{kr.sprintWarning.label}</StatusPill> : null}
            </div>
            {kr.children.length ? (
              <div className="mt-4 border-l-2 border-primary-light pl-4">
                <OkrTree nodes={kr.children} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function levelLabel(level: string) {
  return level === "company" ? "公司级" : level === "department" ? "部门级" : "个人级";
}

function dotClass(color: string) {
  const colorClass = {
    green: "bg-status-green",
    yellow: "bg-status-yellow",
    red: "bg-status-red",
    gray: "bg-status-gray"
  }[color] ?? "bg-status-gray";
  return `inline-block h-2.5 w-2.5 rounded-full ${colorClass}`;
}

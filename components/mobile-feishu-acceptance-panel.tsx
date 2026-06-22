import Link from "next/link";

const checklist = [
  "从飞书客户端内打开系统登录页",
  "完成一次飞书内嵌 H5 登录回跳",
  "在 /weekly、/review、/settings 中验证触控、滚动和安全区表现",
  "在飞书客户端内直接打开导出后的文档链接"
];

const passCriteria = [
  "关键页面都有导航入口",
  "顶部和底部固定区域不会遮挡主要操作",
  "表单可输入、按钮可点击、提示可见",
  "表格在窄屏下至少可以横向滚动查看",
  "OAuth 登录可闭环",
  "文档导出完成后可从客户端打开结果链接"
];

const blockers = [
  "如果登录后落到接口 JSON 页，优先检查飞书应用回调地址和线上 APP URL 配置。",
  "如果底部按钮被遮挡，优先在 /weekly、/settings 复查底部安全区和滚动容器。",
  "如果导出链路不通，先去 /review 重新触发导出，再回设置页查看最近集成任务和导出日志。"
];

export function MobileFeishuAcceptancePanel() {
  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5 shadow-panel">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-ink">移动端 / 飞书 H5 验收准备</h2>
          <p className="mt-2 text-sm leading-6 text-steel">
            这一轮只需要确认真机飞书客户端里的登录、滚动、安全区和导出链路不阻断，不要求单独做移动端视觉重构。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            打开登录页
          </Link>
          <Link href="/review" className="rounded-md border border-line px-4 py-2 text-sm font-medium text-steel hover:bg-hover">
            去导出页
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <AcceptanceColumn
          title="建议顺序"
          items={[
            "先在浏览器确认线上 /login、/review、/settings 可打开。",
            "再用真实手机从飞书客户端内打开登录页并完成回跳。",
            "最后补看 /weekly、/review、/settings 的触控、滚动和导出结果。"
          ]}
        />
        <AcceptanceColumn title="真机检查项" items={checklist} />
        <AcceptanceColumn title="验收通过标准" items={passCriteria} />
      </div>

      <div className="mt-4 rounded-md border border-dashed border-line bg-hover p-4">
        <div className="text-sm font-semibold text-ink">常见阻断提示</div>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-steel">
          {blockers.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AcceptanceColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-line bg-hover p-4">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-steel">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

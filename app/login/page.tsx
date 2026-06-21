import { LoginButtons } from "@/components/login-buttons";
import { isMockLoginEnabled } from "@/lib/auth-mode";
import { getFeishuConfigReadiness, getFeishuRuntimeConfig } from "@/lib/integrations/feishu-config";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const loginError = params.error ? decodeURIComponent(params.error) : "";
  const mockLoginEnabled = isMockLoginEnabled();
  const feishuConfig = getFeishuConfigReadiness(await getFeishuRuntimeConfig());

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1200px] items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-6 inline-flex items-center rounded-md border border-line bg-card px-3 py-2 text-sm text-steel">
            《OKR工作法》周节奏执行系统
          </div>
          <h1 className="max-w-3xl text-[32px] font-semibold leading-tight tracking-normal text-ink">
            OKR 团队工具
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-steel">
            用周一承诺、信心值追踪、周五庆祝和健康指标，把季度目标变成团队每周都能推进的执行节奏。
          </p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              ["三层 OKR", "公司、部门、个人对齐"],
              ["信心值", "提前发现执行风险"],
              ["健康指标", "守住业务底线"]
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-line bg-card p-4 shadow-panel">
                <div className="text-sm font-semibold text-ink">{title}</div>
                <div className="mt-2 text-sm leading-6 text-steel">{body}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-card p-6 shadow-panel">
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary-light text-sm font-semibold text-primary">登</div>
            <div>
              <h2 className="text-base font-semibold">正式登录</h2>
              <p className="mt-1 text-sm text-steel">默认通过飞书 OAuth SSO 进入系统；开发环境可按需启用模拟入口。</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-line bg-hover px-4 py-3 text-sm text-steel">
            {feishuConfig.mode === "real"
              ? feishuConfig.oauthReady
                ? "当前环境已启用真实飞书模式，正式入口将跳转到飞书 OAuth 授权页。"
                : "当前环境为真实飞书模式，但 OAuth 尚未配置完整；正式入口会提示缺少 app_id、app_secret 或 redirect_uri。"
              : "当前环境为 Mock 集成模式，正式飞书 OAuth 未启用；本地验收请使用下方开发入口。"}
          </div>
          {loginError ? (
            <div className="mt-4 rounded-md border border-status-red bg-status-red-bg px-4 py-3 text-sm text-status-red">
              {loginError}
            </div>
          ) : null}
          <LoginButtons mockLoginEnabled={mockLoginEnabled} />
          <div className="mt-6 rounded-md bg-hover p-4 text-sm leading-6 text-steel">
            <p>{mockLoginEnabled ? "进入系统后可以切换角色视角，验证 Super Admin、部门管理者和成员的权限差异。" : "当前环境已关闭模拟入口，登录与组织架构以正式飞书链路为准。"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

import { NextResponse } from "next/server";
import { assertRole, getCurrentUser } from "@/lib/auth";
import { getFeishuConfigReadiness, getFeishuRuntimeConfig } from "@/lib/integrations/feishu-config";
import { feishuProvider } from "@/lib/integrations/feishu";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  try {
    assertRole(user, ["super_admin"]);
    const runtimeConfig = await getFeishuRuntimeConfig();
    const readiness = getFeishuConfigReadiness(runtimeConfig);
    if (readiness.mode !== "real") {
      return NextResponse.json({ error: "当前仍是 Mock 模式，请先切换到真实飞书并保存配置" }, { status: 400 });
    }
    if (!readiness.ready) {
      return NextResponse.json({ error: readiness.message, missingItems: readiness.missingItems }, { status: 400 });
    }

    const validatedItems = await feishuProvider.validateConfigAccess();
    return NextResponse.json({ validatedItems, message: "真实飞书权限验证通过" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "真实飞书权限验证失败";
    return NextResponse.json({
      error: message,
      helpUrl: resolveHelpUrl(message)
    }, { status: user ? 400 : 401 });
  }
}

function resolveHelpUrl(message: string) {
  if (/tenant_access_token|OAuth|app_id|app_secret|redirect_uri/i.test(message)) {
    return "https://open.feishu.cn/document/common-capabilities/sso/web-application-end-user-consent/guide";
  }
  if (/department|部门|contact/i.test(message)) {
    return "https://open.feishu.cn/document/server-docs/contact-v3/department/introduction";
  }
  if (/calendar|日历/i.test(message)) {
    return "https://open.feishu.cn/document/server-docs/calendar-v4/overview";
  }
  if (/多维表格|bitable|table/i.test(message)) {
    return "https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview";
  }
  if (/drive|folder|文档目录|docx/i.test(message)) {
    return "https://open.feishu.cn/document/docs/drive-v1/folder/folder-overview";
  }
  return undefined;
}

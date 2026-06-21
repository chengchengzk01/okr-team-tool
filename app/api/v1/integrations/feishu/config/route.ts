import { NextResponse } from "next/server";
import { assertRole, getCurrentUser } from "@/lib/auth";
import {
  getFeishuConfigReadiness,
  getFeishuRuntimeConfig,
  getStoredFeishuConfig,
  parseBitableAppToken,
  updateStoredFeishuConfig
} from "@/lib/integrations/feishu-config";
import { feishuProvider } from "@/lib/integrations/feishu";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  try {
    assertRole(user, ["super_admin"]);
    const runtimeConfig = await getFeishuRuntimeConfig();
    const storedConfig = await getStoredFeishuConfig();
    return NextResponse.json({
      config: {
        ...getFeishuConfigReadiness(runtimeConfig),
        values: {
          provider: runtimeConfig.provider,
          appId: mask(runtimeConfig.appId),
          redirectUri: runtimeConfig.redirectUri,
          rootDepartmentId: runtimeConfig.rootDepartmentId,
          calendarId: runtimeConfig.calendarId,
          calendarSettings: runtimeConfig.calendarSettings,
          hasAppSecret: Boolean(runtimeConfig.appSecret),
          bitableAppToken: mask(runtimeConfig.bitableAppToken),
          bitableTableIds: runtimeConfig.bitableTableIds,
          driveFolderToken: mask(runtimeConfig.driveFolderToken),
          updatedAt: storedConfig?.updatedAt
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取配置失败" }, { status: user ? 400 : 401 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  try {
    assertRole(user, ["super_admin"]);
    const body = await request.json();
    if (body.calendar_settings?.inviteScope === "department" && !body.calendar_settings?.inviteDepartmentId) {
      return NextResponse.json({
        error: "按部门邀请日历事件时，必须填写受邀部门 ID",
        helpUrl: "https://open.feishu.cn/document/server-docs/calendar-v4/overview"
      }, { status: 400 });
    }
    if (hasBitableConfigChange(body)) {
      const appToken = body.bitable_app_token ?? (body.bitable_url ? parseBitableAppToken(body.bitable_url) : undefined);
      if (body.bitable_url && !appToken) {
        return NextResponse.json({
          error: "无法从多维表格链接中解析 app token，请检查链接是否为飞书多维表格地址",
          helpUrl: "https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview?lang=zh-CN"
        }, { status: 400 });
      }
      await feishuProvider.validateBitableAccess(appToken, body.bitable_table_ids);
    }
    const saved = await updateStoredFeishuConfig({
      provider: body.provider,
      appId: body.app_id,
      appSecret: body.app_secret,
      redirectUri: body.redirect_uri,
      rootDepartmentId: body.root_department_id,
      calendarId: body.calendar_id,
      calendarEventIds: body.calendar_event_ids,
      calendarSettings: body.calendar_settings,
      bitableUrl: body.bitable_url,
      bitableAppToken: body.bitable_app_token,
      bitableTableIds: body.bitable_table_ids,
      driveFolderToken: body.drive_folder_token,
      updatedBy: user?.id
    });
    const runtimeConfig = await getFeishuRuntimeConfig();
    return NextResponse.json({ config: getFeishuConfigReadiness(runtimeConfig), updatedAt: saved.updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新配置失败";
    const isBitableError = /多维表格|bitable|table/i.test(message);
    return NextResponse.json({
      error: isBitableError ? `没有目标多维表格的写入权限，请前往飞书侧确认权限：${message}` : message,
      helpUrl: isBitableError ? "https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview" : undefined
    }, { status: user ? 400 : 401 });
  }
}

function hasBitableConfigChange(body: Record<string, unknown>) {
  return Boolean(body.bitable_url || body.bitable_app_token || body.bitable_table_ids);
}

function mask(value?: string) {
  if (!value) return undefined;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

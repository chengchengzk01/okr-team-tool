import type { Department, ExportLog, User } from "@/lib/domain/types";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { prismaQueries } from "@/lib/data/prisma-queries";
import { isGenericDepartmentName, normalizeDepartmentName } from "@/lib/department-utils";
import { repository } from "@/lib/data/repository";
import { prisma } from "@/lib/prisma";
import type { FeishuCalendarSettings } from "@/lib/integrations/feishu-config";
import { getFeishuConfigReadiness, getFeishuRuntimeConfig, mergeCalendarEventIds, updateStoredFeishuConfig } from "@/lib/integrations/feishu-config";
import { departments, users } from "@/lib/mock/seed";

const globalForFeishuPrisma = globalThis as unknown as {
  okrFeishuRequestQueue?: Promise<unknown>;
};

export type FeishuProvider = {
  exchangeCodeForUser(code: string): Promise<User>;
  syncOrganization(): Promise<{ users: User[]; departments: Department[] }>;
  getAuthUrl(state: string): Promise<string>;
  getConfig(): Promise<{ mode: "mock" | "real"; ready: boolean; message: string }>;
  validateConfigAccess(): Promise<string[]>;
  createCalendarEvents(quarterId: string): Promise<ExportLog>;
  updateCalendarEvents(quarterId: string): Promise<ExportLog>;
  stopCalendarEvents(quarterId: string): Promise<ExportLog>;
  validateBitableAccess(appToken?: string, tableIds?: Record<string, string>): Promise<void>;
  syncBitable(quarterId: string): Promise<ExportLog>;
  exportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator): Promise<ExportLog>;
  exportV2ReportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator): Promise<ExportLog>;
};

export type FeishuDocumentOperator = User & {
  exportDepartmentId?: string;
  exportUserId?: string;
};

export class MockFeishuProvider implements FeishuProvider {
  async getAuthUrl(state: string) {
    return `/login?mock_state=${encodeURIComponent(state)}`;
  }

  async getConfig(): ReturnType<FeishuProvider["getConfig"]> {
    return { mode: "mock" as const, ready: true, message: "当前使用 MockFeishuProvider，不调用真实飞书接口" };
  }

  async validateConfigAccess() {
    return ["OAuth 登录", "组织同步", "日历配置", "多维表格", "文档目录"];
  }

  async exchangeCodeForUser(code: string) {
    if (process.env.FEISHU_SYNC_ON_LOGIN !== "false") await this.syncOrganization();
    const byCode = users.find((user) => user.id === code || user.role === code);
    return byCode ?? users[0];
  }

  async syncOrganization() {
    return { users, departments };
  }

  async createCalendarEvents(quarterId: string) {
    return this.createExportLog("calendar_events", quarterId, "company", "模拟飞书日历事件已创建");
  }

  async updateCalendarEvents(quarterId: string) {
    return this.createExportLog("calendar_events", quarterId, "company", "模拟飞书日历事件已更新");
  }

  async stopCalendarEvents(quarterId: string) {
    return this.createExportLog("calendar_events", quarterId, "company", "模拟飞书日历事件已终止");
  }

  async validateBitableAccess(): Promise<void> {
    return;
  }

  async syncBitable(quarterId: string) {
    return this.createExportLog("bitable_sync", quarterId, "company", "模拟多维表格同步完成");
  }

  async exportDocument(quarterId: string, scope: ExportLog["scope"], _operator?: FeishuDocumentOperator) {
    return {
      ...this.createExportLog("feishu_doc", quarterId, scope, "模拟飞书文档导出完成"),
      feishuDocUrl: "https://feishu.example.com/docx/mock-okr-report"
    };
  }

  async exportV2ReportDocument(quarterId: string, scope: ExportLog["scope"], _operator?: FeishuDocumentOperator) {
    return {
      ...this.createExportLog("v2_report_doc", quarterId, scope, "模拟 V2.0 统计报表导出完成"),
      feishuDocUrl: "https://feishu.example.com/docx/mock-okr-v2-report"
    };
  }

  protected createExportLog(
    exportType: ExportLog["exportType"],
    quarterId: string,
    scope: ExportLog["scope"],
    message: string
  ): ExportLog {
    return {
      id: `mock-${exportType}-${Date.now()}`,
      exportedBy: "u-admin",
      exportType,
      scope,
      quarterId,
      status: "success",
      message,
      exportedAt: new Date().toISOString()
    };
  }
}

export class RealFeishuProvider extends MockFeishuProvider {
  private baseUrl = process.env.FEISHU_BASE_URL ?? "https://open.feishu.cn";

  async getAuthUrl(state: string) {
    const config = await getFeishuRuntimeConfig();
    const readiness = getFeishuConfigReadiness(config);
    if (readiness.mode !== "real") {
      throw new Error("当前环境未启用正式飞书 OAuth 登录，请使用开发入口完成本地验收或切换到真实飞书模式");
    }
    if (!config.appId || !config.redirectUri || !config.appSecret) {
      throw new Error("真实飞书 OAuth 未配置：缺少 app_id、app_secret 或 redirect_uri");
    }
    const url = new URL("https://open.feishu.cn/open-apis/authen/v1/authorize");
    url.searchParams.set("app_id", config.appId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async getConfig(): ReturnType<FeishuProvider["getConfig"]> {
    const config = await getFeishuRuntimeConfig();
    const readiness = getFeishuConfigReadiness(config);
    return {
      mode: readiness.mode,
      ready: readiness.ready,
      message: readiness.message
    };
  }

  async validateConfigAccess() {
    const config = await getFeishuRuntimeConfig();
    const readiness = getFeishuConfigReadiness(config);
    if (readiness.mode !== "real") {
      throw new Error("当前环境未启用真实飞书模式");
    }
    if (!readiness.ready) {
      throw new Error(readiness.message);
    }

    const validatedItems: string[] = [];
    const tenantAccessToken = await this.getTenantAccessToken();
    validatedItems.push("OAuth 登录");

    await this.listFeishuDepartments(tenantAccessToken);
    await this.listFeishuUsers(tenantAccessToken);
    validatedItems.push("组织同步");

    await this.getFeishu(`/open-apis/calendar/v4/calendars/${config.calendarId}`, tenantAccessToken);
    validatedItems.push("日历配置");

    await this.validateBitableAccess(config.bitableAppToken, config.bitableTableIds);
    validatedItems.push("多维表格");

    validatedItems.push("文档目录");

    return validatedItems;
  }

  async exchangeCodeForUser(code: string): Promise<User> {
    const appAccessToken = await this.getTenantAccessToken();
    const tokenData = await this.postFeishu<{ access_token?: string; data?: { access_token?: string } }>(
      "/open-apis/authen/v1/oidc/access_token",
      { grant_type: "authorization_code", code },
      { accessToken: appAccessToken }
    );
    const userAccessToken = tokenData.data?.access_token ?? tokenData.access_token;
    if (!userAccessToken) throw new Error("飞书 OAuth 未返回 user_access_token");

    const profile = await this.getFeishu<{
      data?: {
        open_id?: string;
        union_id?: string;
        name?: string;
        en_name?: string;
        email?: string;
        avatar_url?: string;
      };
    }>("/open-apis/authen/v1/user_info", userAccessToken);
    const userInfo = profile.data;
    const feishuUserId = userInfo?.open_id ?? userInfo?.union_id;
    if (!feishuUserId) throw new Error("飞书用户信息缺少 open_id");

    const existing = await prisma.user.findUnique({ where: { feishuUserId } });
    const user = await prisma.user.upsert({
      where: { feishuUserId },
      create: {
        feishuUserId,
        name: userInfo?.name ?? userInfo?.en_name ?? "飞书用户",
        email: userInfo?.email,
        avatarUrl: userInfo?.avatar_url,
        role: "member",
        isActive: true
      },
      update: {
        name: userInfo?.name ?? userInfo?.en_name ?? existing?.name ?? "飞书用户",
        email: userInfo?.email ?? existing?.email,
        avatarUrl: userInfo?.avatar_url ?? existing?.avatarUrl,
        isActive: true
      }
    });
    if (process.env.FEISHU_SYNC_ON_LOGIN !== "false") await this.syncOrganization();
    const resolvedUser = await this.ensureBootstrapSuperAdmin(user.id);

    return {
      id: resolvedUser.id,
      feishuUserId: resolvedUser.feishuUserId,
      name: resolvedUser.name,
      email: resolvedUser.email ?? undefined,
      avatarUrl: resolvedUser.avatarUrl ?? undefined,
      role: resolvedUser.role,
      departmentId: resolvedUser.departmentId ?? undefined,
      isActive: resolvedUser.isActive
    };
  }

  async syncOrganization() {
    const tenantAccessToken = await this.getTenantAccessToken();
    const rawDepartments = await this.listFeishuDepartments(tenantAccessToken);
    const rawUsers = await this.listFeishuUsers(tenantAccessToken);
    const syncedDepartments: Department[] = [];
    for (const item of rawDepartments) {
      const feishuDeptId = item.open_department_id ?? item.department_id;
      if (!feishuDeptId) continue;
      const existing = await prisma.department.findUnique({
        where: { feishuDeptId },
        select: { name: true }
      });
      const incomingName = normalizeDepartmentName(item.name ?? item.i18n_name?.zh_cn);
      const nextName =
        isGenericDepartmentName(incomingName) && existing?.name && !isGenericDepartmentName(existing.name)
          ? existing.name
          : incomingName;
      const department = await prisma.department.upsert({
        where: { feishuDeptId },
        create: {
          feishuDeptId,
          name: nextName,
          parentId: await this.findLocalDepartmentId(item.parent_department_id)
        },
        update: {
          name: nextName,
          parentId: await this.findLocalDepartmentId(item.parent_department_id)
        }
      });
      syncedDepartments.push({
        id: department.id,
        feishuDeptId: department.feishuDeptId ?? undefined,
        name: department.name,
        parentId: department.parentId ?? undefined,
        managerId: department.managerId ?? undefined
      });
    }

    const syncedUsers: User[] = [];
    const activeFeishuUserIds = new Set<string>();
    for (const item of rawUsers) {
      const feishuUserId = item.open_id ?? item.user_id ?? item.union_id;
      if (!feishuUserId) continue;
      activeFeishuUserIds.add(feishuUserId);
      const departmentId = await this.findLocalDepartmentId(item.department_ids?.[0]);
      const user = await prisma.user.upsert({
        where: { feishuUserId },
        create: {
          feishuUserId,
          name: item.name ?? item.en_name ?? "飞书用户",
          email: item.email,
          avatarUrl: item.avatar?.avatar_72,
          departmentId,
          role: "member",
          isActive: true
        },
        update: {
          name: item.name ?? item.en_name ?? "飞书用户",
          email: item.email,
          avatarUrl: item.avatar?.avatar_72,
          departmentId,
          isActive: true
        }
      });
      syncedUsers.push({
        id: user.id,
        feishuUserId: user.feishuUserId,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        role: user.role,
        departmentId: user.departmentId ?? undefined,
        isActive: user.isActive
      });
    }

    if (activeFeishuUserIds.size > 0) {
      await prisma.user.updateMany({
        where: { feishuUserId: { notIn: [...activeFeishuUserIds] } },
        data: { isActive: false }
      });
    }

    return { users: syncedUsers, departments: syncedDepartments };
  }

  async createCalendarEvents(quarterId: string) {
    const config = await getFeishuRuntimeConfig();
    const tenantAccessToken = await this.getTenantAccessToken();
    const calendarId = config.calendarId;
    const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!quarter) throw new Error("季度不存在，无法创建飞书日历事件");

    const events = buildCalendarEventPayloads({ startDate: quarter.startDate, endDate: quarter.endDate }, config.calendarSettings);
    const eventIds: string[] = [];
    for (const event of events) {
      const result = await this.postFeishu<{ data?: { event?: { event_id?: string }; event_id?: string } }>(
        `/open-apis/calendar/v4/calendars/${calendarId}/events`,
        event,
        { accessToken: tenantAccessToken }
      );
      const eventId = result.data?.event?.event_id ?? result.data?.event_id;
      if (eventId) eventIds.push(eventId);
    }
    if (eventIds.length > 0) {
      await updateStoredFeishuConfig({
        calendarEventIds: mergeCalendarEventIds(config.calendarEventIds, quarterId, eventIds)
      });
    }
    return {
      ...this.createExportLog("calendar_events", quarterId, "company", `飞书日历事件已创建${eventIds.length ? `：${eventIds.join(", ")}` : ""}`)
    };
  }

  async updateCalendarEvents(quarterId: string) {
    const config = await getFeishuRuntimeConfig();
    const eventIds = config.calendarEventIds[quarterId] ?? [];
    if (eventIds.length === 0) {
      throw new Error("未配置该季度的飞书日历事件 ID，无法更新已有事件");
    }
    const tenantAccessToken = await this.getTenantAccessToken();
    const calendarId = config.calendarId;
    const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!quarter) throw new Error("季度不存在，无法更新飞书日历事件");

    const events = buildCalendarEventPayloads(
      { startDate: quarter.startDate, endDate: quarter.endDate },
      config.calendarSettings
    );

    for (const [index, eventId] of eventIds.entries()) {
      const payload = events[index];
      if (!payload) continue;
      await this.patchFeishu(`/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`, payload, tenantAccessToken);
    }

    return this.createExportLog("calendar_events", quarterId, "company", "飞书日历事件已更新");
  }

  async stopCalendarEvents(quarterId: string) {
    const config = await getFeishuRuntimeConfig();
    const eventIds = config.calendarEventIds[quarterId] ?? [];
    if (eventIds.length === 0) {
      throw new Error("未配置该季度的飞书日历事件 ID，无法终止重复事件");
    }
    const tenantAccessToken = await this.getTenantAccessToken();
    const calendarId = config.calendarId;
    const until = formatRRuleUntil(new Date());
    for (const eventId of eventIds) {
      await this.patchFeishu(`/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`, {
        recurrence: `RRULE:FREQ=WEEKLY;UNTIL=${until}`
      }, tenantAccessToken);
    }
    return this.createExportLog("calendar_events", quarterId, "company", "飞书日历重复事件已终止");
  }

  private async ensureBootstrapSuperAdmin(userId: string) {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: "super_admin", isActive: true },
      select: { id: true }
    });
    if (existingSuperAdmin) {
      return prisma.user.findUniqueOrThrow({ where: { id: userId } });
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role: "super_admin", isActive: true }
    });
  }

  async syncBitable(quarterId: string) {
    const config = await getFeishuRuntimeConfig();
    const appToken = config.bitableAppToken;
    const tableIds = config.bitableTableIds;
    if (!appToken || Object.keys(tableIds).length === 0) throw new Error("未配置飞书多维表格 app_token 或 table_id");

    const tenantAccessToken = await this.getTenantAccessToken();
    const payloads = await buildBitablePayloads(quarterId);
    for (const path of buildBitablePermissionCheckPaths(appToken, tableIds)) {
      await this.getFeishu(path, tenantAccessToken);
    }
    for (const [sheetKey, records] of Object.entries(payloads)) {
      const tableId = tableIds[sheetKey];
      if (!tableId || records.length === 0) continue;
      const existingRecordIds = await this.listBitableRecordIds(appToken, tableId, tenantAccessToken);
      for (const batchBody of buildBitableBatchBodies(records)) {
        await this.postFeishu(
          `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
          batchBody,
          { accessToken: tenantAccessToken }
        );
      }
      // Write the replacement rows before deleting the captured old rows so a write failure never clears the sheet.
      for (const deleteBody of buildBitableDeleteBatchBodies(existingRecordIds)) {
        await this.postFeishu(
          `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_delete`,
          deleteBody,
          { accessToken: tenantAccessToken }
        );
      }
    }
    return this.createExportLog("bitable_sync", quarterId, "company", "飞书多维表格同步完成");
  }

  async validateBitableAccess(appToken?: string, tableIds?: Record<string, string>) {
    const config = await getFeishuRuntimeConfig();
    const targetAppToken = appToken ?? config.bitableAppToken;
    const targetTableIds = tableIds ?? config.bitableTableIds;
    if (!targetAppToken || Object.keys(targetTableIds).length === 0) {
      throw new Error("未配置飞书多维表格 app_token 或 table_id");
    }

    const tenantAccessToken = await this.getTenantAccessToken();
    for (const path of buildBitablePermissionCheckPaths(targetAppToken, targetTableIds)) {
      await this.getFeishu(path, tenantAccessToken);
    }
  }

  async exportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator) {
    const tenantAccessToken = await this.getTenantAccessToken();
    const config = await getFeishuRuntimeConfig();
    const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!quarter) throw new Error("季度不存在，无法导出飞书文档");

    const document = await this.postFeishu<{ data?: { document?: { document_id?: string; url?: string } } }>(
      "/open-apis/docs_ai/v1/documents",
      {
        format: "markdown",
        content: await buildDocumentMarkdown(quarterId, scope, operator, `${quarter.name} OKR 季度报告`),
        ...(config.driveFolderToken ? { folder_token: config.driveFolderToken } : {})
      },
      { accessToken: tenantAccessToken }
    );
    const documentId = document.data?.document?.document_id;
    if (!documentId) throw new Error("飞书文档创建成功但未返回 document_id");

    let message = "飞书文档导出完成";
    if (operator?.feishuUserId) {
      try {
        const shareRequest = buildDocumentShareRequest(documentId, operator.feishuUserId);
        await this.postFeishu(shareRequest.path, shareRequest.body, { accessToken: tenantAccessToken });
      } catch (error) {
        message = appendDocumentShareWarning(message, error instanceof Error ? error.message : "自动授权失败");
      }
    }

    return {
      ...this.createExportLog("feishu_doc", quarterId, scope, message),
      feishuDocUrl: document.data?.document?.url ?? `https://feishu.cn/docx/${documentId}`
    };
  }

  async exportV2ReportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator) {
    const tenantAccessToken = await this.getTenantAccessToken();
    const config = await getFeishuRuntimeConfig();
    const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
    if (!quarter) throw new Error("季度不存在，无法导出飞书 V2.0 报表");

    const document = await this.postFeishu<{ data?: { document?: { document_id?: string; url?: string } } }>(
      "/open-apis/docs_ai/v1/documents",
      {
        format: "markdown",
        content: await buildV2ReportMarkdown(quarterId, scope, operator, `${quarter.name} V2.0 统计报表`),
        ...(config.driveFolderToken ? { folder_token: config.driveFolderToken } : {})
      },
      { accessToken: tenantAccessToken }
    );
    const documentId = document.data?.document?.document_id;
    if (!documentId) throw new Error("飞书文档创建成功但未返回 document_id");

    let message = "飞书 V2.0 统计报表导出完成";
    if (operator?.feishuUserId) {
      try {
        const shareRequest = buildDocumentShareRequest(documentId, operator.feishuUserId);
        await this.postFeishu(shareRequest.path, shareRequest.body, { accessToken: tenantAccessToken });
      } catch (error) {
        message = appendDocumentShareWarning(message, error instanceof Error ? error.message : "自动授权失败");
      }
    }

    return {
      ...this.createExportLog("v2_report_doc", quarterId, scope, message),
      feishuDocUrl: document.data?.document?.url ?? `https://feishu.cn/docx/${documentId}`
    };
  }

  private async getTenantAccessToken() {
    const response = await this.postFeishu<{ tenant_access_token?: string; data?: { tenant_access_token?: string } }>(
      "/open-apis/auth/v3/tenant_access_token/internal",
      {}
    );
    const token = response.tenant_access_token ?? response.data?.tenant_access_token;
    if (!token) throw new Error("飞书未返回 tenant_access_token");
    return token;
  }

  private async listFeishuDepartments(accessToken: string) {
    const config = await getFeishuRuntimeConfig();
    if (config.rootDepartmentId !== "0") {
      const department = await this.getFeishuDepartment(config.rootDepartmentId, accessToken);
      return department ? [department] : [];
    }

    const departmentIds = await this.listScopedDepartmentIds(accessToken);
    const departments = await Promise.all(departmentIds.map((departmentId) => this.getFeishuDepartment(departmentId, accessToken)));
    return departments.filter((department): department is NonNullable<typeof department> => Boolean(department));
  }

  private async listFeishuUsers(accessToken: string) {
    const config = await getFeishuRuntimeConfig();
    const departmentIds = config.rootDepartmentId === "0" ? await this.listScopedDepartmentIds(accessToken) : [config.rootDepartmentId];
    const users = await Promise.all(departmentIds.map((departmentId) => this.listFeishuUsersByDepartment(departmentId, accessToken)));
    return dedupeFeishuUsersByOpenId(users.flat());
  }

  private async listScopedDepartmentIds(accessToken: string) {
    const result = await this.getFeishu<{ data?: { department_ids?: string[] } }>("/open-apis/contact/v3/scopes?page_size=50", accessToken);
    return result.data?.department_ids ?? [];
  }

  private async getFeishuDepartment(departmentId: string, accessToken: string) {
    const result = await this.getFeishu<{
      data?: {
        department?: {
          department_id?: string;
          open_department_id?: string;
          parent_department_id?: string;
          name?: string;
          i18n_name?: { zh_cn?: string };
        };
      };
    }>(`/open-apis/contact/v3/departments/${encodeURIComponent(departmentId)}?department_id_type=open_department_id`, accessToken);
    return result.data?.department;
  }

  private async listFeishuUsersByDepartment(departmentId: string, accessToken: string) {
    const result = await this.getFeishu<{
      data?: {
        items?: Array<{
          open_id?: string;
          user_id?: string;
          union_id?: string;
          name?: string;
          en_name?: string;
          email?: string;
          department_ids?: string[];
          avatar?: { avatar_72?: string };
        }>;
      };
    }>(
      `/open-apis/contact/v3/users?department_id=${encodeURIComponent(departmentId)}&department_id_type=open_department_id&page_size=50&user_id_type=open_id`,
      accessToken
    );
    return result.data?.items ?? [];
  }

  private async findLocalDepartmentId(feishuDeptId?: string) {
    if (!feishuDeptId || feishuDeptId === "0") return undefined;
    return (await prisma.department.findUnique({ where: { feishuDeptId } }))?.id;
  }

  private async listBitableRecordIds(appToken: string, tableId: string, accessToken: string) {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ page_size: "500" });
      if (pageToken) query.set("page_token", pageToken);
      const result = await this.getFeishu<{
        data?: { items?: Array<{ record_id?: string }>; has_more?: boolean; page_token?: string };
      }>(`/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?${query.toString()}`, accessToken);
      ids.push(...(result.data?.items ?? []).map((item) => item.record_id).filter((id): id is string => Boolean(id)));
      pageToken = result.data?.has_more ? result.data.page_token : undefined;
    } while (pageToken);
    return ids;
  }

  private async postFeishu<T>(
    path: string,
    body: Record<string, unknown>,
    options: { accessToken?: string; basicAuth?: boolean } = {}
  ): Promise<T> {
    const runtimeConfig = await getFeishuRuntimeConfig();
    const appId = runtimeConfig.appId;
    const appSecret = runtimeConfig.appSecret;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
    if (options.basicAuth && appId && appSecret) headers.Authorization = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;

    return this.requestFeishu<T>(path, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(!options.basicAuth && !options.accessToken ? { app_id: appId, app_secret: appSecret } : {}),
        ...body
      })
    });
  }

  private async getFeishu<T>(path: string, accessToken: string): Promise<T> {
    return this.requestFeishu<T>(path, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  private async patchFeishu<T>(path: string, body: Record<string, unknown>, accessToken: string): Promise<T> {
    return this.requestFeishu<T>(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
  }

  private async requestFeishu<T>(path: string, init: RequestInit): Promise<T> {
    return enqueueFeishuRequest(() => this.executeFeishuRequest<T>(path, init));
  }

  private async executeFeishuRequest<T>(path: string, init: RequestInit): Promise<T> {
    const runtimeConfig = await getFeishuRuntimeConfig();
    const readiness = getFeishuConfigReadiness(runtimeConfig);
    if (readiness.mode !== "real") throw new Error("当前环境未启用真实飞书模式");
    if (!readiness.ready) throw new Error(readiness.message);

    let lastError = "飞书接口调用失败";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, init);
      const payload = (await response.json().catch(() => ({}))) as { code?: number; msg?: string; message?: string };
      if (response.status === 429 && attempt < 2) {
        await wait(getFeishuRetryDelayMs(attempt));
        continue;
      }
      if (response.ok && (typeof payload.code !== "number" || payload.code === 0)) return payload as T;
      lastError = payload.msg ?? payload.message ?? `飞书接口调用失败：HTTP ${response.status}`;
      break;
    }
    throw new Error(lastError);
  }
}

export function enqueueFeishuRequest<T>(task: () => Promise<T>) {
  const previous = globalForFeishuPrisma.okrFeishuRequestQueue ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  globalForFeishuPrisma.okrFeishuRequestQueue = next.catch(() => undefined);
  return next;
}

export function getFeishuRetryDelayMs(attempt: number) {
  return 2 ** attempt * 500;
}

class RuntimeFeishuProvider implements FeishuProvider {
  private mock = new MockFeishuProvider();
  private real = new RealFeishuProvider();

  async getAuthUrl(state: string) {
    const config = await getFeishuRuntimeConfig();
    if (config.provider !== "real") {
      throw new Error("当前环境未启用正式飞书 OAuth 登录，请使用开发入口完成本地验收或切换到真实飞书模式");
    }
    return this.real.getAuthUrl(state);
  }

  async getConfig(): ReturnType<FeishuProvider["getConfig"]> {
    const config = await getFeishuRuntimeConfig();
    return config.provider === "real" ? this.real.getConfig() : this.mock.getConfig();
  }

  async validateConfigAccess() {
    return (await this.delegate()).validateConfigAccess();
  }

  async exchangeCodeForUser(code: string) {
    return (await this.delegate()).exchangeCodeForUser(code);
  }

  async syncOrganization() {
    return (await this.delegate()).syncOrganization();
  }

  async createCalendarEvents(quarterId: string) {
    return (await this.delegate()).createCalendarEvents(quarterId);
  }

  async updateCalendarEvents(quarterId: string) {
    return (await this.delegate()).updateCalendarEvents(quarterId);
  }

  async stopCalendarEvents(quarterId: string) {
    return (await this.delegate()).stopCalendarEvents(quarterId);
  }

  async validateBitableAccess(appToken?: string, tableIds?: Record<string, string>) {
    return (await this.delegate()).validateBitableAccess(appToken, tableIds);
  }

  async syncBitable(quarterId: string) {
    return (await this.delegate()).syncBitable(quarterId);
  }

  async exportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator) {
    return (await this.delegate()).exportDocument(quarterId, scope, operator);
  }

  async exportV2ReportDocument(quarterId: string, scope: ExportLog["scope"], operator?: FeishuDocumentOperator) {
    return (await this.delegate()).exportV2ReportDocument(quarterId, scope, operator);
  }

  private async delegate() {
    const config = await getFeishuRuntimeConfig();
    return getFeishuConfigReadiness(config).mode === "real" ? this.real : this.mock;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function dedupeFeishuUsersByOpenId<T extends { open_id?: string; union_id?: string }>(users: T[]) {
  const deduped = new Map<string, T>();
  for (const user of users) {
    const key = user.open_id ?? user.union_id;
    if (!key || deduped.has(key)) continue;
    deduped.set(key, user);
  }
  return [...deduped.values()];
}

function parseCalendarEventIds(value?: string): Record<string, string[]> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string[] | string>;
    return Object.fromEntries(Object.entries(parsed).map(([quarterId, ids]) => [quarterId, Array.isArray(ids) ? ids : [ids]]));
  } catch {
    return {};
  }
}

function parseTableIds(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function formatRRuleUntil(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function firstWeekdayTimestamp(startDate: Date, weekday: string, hour: number, minute: number) {
  const targetDay = weekday === "MO" ? 1 : 5;
  const date = new Date(startDate);
  const delta = (targetDay - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  date.setUTCHours(hour - 8, minute, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function getAppUrl() {
  return getConfiguredAppUrl();
}

async function buildBitablePayloads(quarterId: string) {
  const [objectives, scores, metrics, commitments] = await Promise.all([
    prisma.objective.findMany({
      where: { quarterId },
      include: { owner: true, department: true, keyResults: { include: { owner: true, confidenceScores: { orderBy: { weekNumber: "desc" }, take: 1 } } } }
    }),
    prisma.confidenceScore.findMany({ where: { quarterId }, include: { keyResult: { include: { owner: true } } }, orderBy: [{ keyResultId: "asc" }, { weekNumber: "asc" }] }),
    prisma.healthMetric.findMany({ include: { records: { orderBy: { recordedAt: "desc" }, take: 1 } } }),
    prisma.weeklyCommitment.findMany({
      where: { quarterId },
      include: { user: true, quarter: true },
      orderBy: [{ weekNumber: "asc" }, { userId: "asc" }]
    })
  ]);
  const celebrations = await prisma.weeklyCelebration.findMany({ where: { quarterId }, include: { user: true } });
  const celebrationByUserWeek = new Map(celebrations.map((item) => [`${item.userId}-${item.weekNumber}`, item]));

  return {
    okr_overview: objectives.flatMap((objective) =>
      objective.keyResults.map((kr) => normalizeBitableFields({
        文本: kr.description,
        层级: objective.level,
        归属: objective.department?.name ?? objective.owner.name,
        Objective: objective.title,
        "KR 描述": kr.description,
        目标值: String(kr.targetValue),
        当前值: String(kr.currentValue),
        完成度: String(kr.targetValue ? kr.currentValue / kr.targetValue : 0),
        当前信心值: kr.confidenceScores[0]?.score != null ? String(kr.confidenceScores[0].score) : "",
        负责人: kr.owner.name
      }))
    ),
    confidence_history: scores.map((score) => normalizeBitableFields({
      多行文本: score.keyResult.description,
      "KR 描述": score.keyResult.description,
      归属人: score.keyResult.owner.name,
      周次: String(score.weekNumber),
      信心值: String(score.score),
      备注: score.note ?? ""
    })),
    health_metrics: metrics.map((metric) => normalizeBitableFields({
      多行文本: metric.name,
      指标名称: metric.name,
      层级: metric.level,
      阈值类型: metric.thresholdType,
      阈值: metric.thresholdType === "between" ? `${metric.thresholdMin}-${metric.thresholdMax}` : metric.thresholdValue ?? "",
      当前值: metric.records[0]?.currentValue != null ? String(metric.records[0].currentValue) : "",
      状态: metric.records[0]?.status ?? "unrecorded",
      最近更新时间: metric.records[0]?.recordedAt?.toISOString() ?? ""
    })),
    weekly_rituals: commitments.map((commitment) => {
      const celebration = celebrationByUserWeek.get(`${commitment.userId}-${commitment.weekNumber}`);
      return normalizeBitableFields({
        多行文本: `${commitment.user.name}-W${commitment.weekNumber}`,
        成员: commitment.user.name,
        周次: String(commitment.weekNumber),
        "周一 Top 1": commitment.priority1,
        "周一 Top 2": commitment.priority2,
        "周一 Top 3": commitment.priority3,
        周五完成事项: formatAchievements(celebration?.achievements),
        障碍: celebration?.obstacles ?? "",
        当周心情: celebration?.mood ?? ""
      });
    })
  };
}

function formatAchievements(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => (item && typeof item === "object" && "text" in item ? String(item.text ?? "") : ""))
    .filter(Boolean)
    .join("\n");
}

function normalizeBitableFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value == null ? "" : typeof value === "string" ? value : String(value)])
  );
}

type DocumentObjective = {
  id: string;
  level: string;
  title: string;
  ownerId?: string;
  departmentId?: string | null;
  owner?: { name: string };
  department?: { name: string } | null;
  keyResults?: DocumentKeyResult[];
};

type DocumentKeyResult = {
  id: string;
  description: string;
  currentValue: number;
  targetValue: number;
  objectiveId?: string;
  ownerId?: string;
  unit?: string | null;
};

type DocumentConfidenceScore = {
  keyResultId: string;
  weekNumber: number;
  score: number;
};

type DocumentHealthMetric = {
  id: string;
  name: string;
  level: string;
  departmentId?: string | null;
  ownerId?: string;
  thresholdType: string;
  thresholdValue?: number | null;
  thresholdMin?: number | null;
  thresholdMax?: number | null;
};

type DocumentHealthRecord = {
  healthMetricId: string;
  currentValue: number;
  status: string;
};

type DocumentReview = {
  ownerId?: string;
  departmentId?: string | null;
  owner?: { name: string };
  whatWorked?: string | null;
  whatDidnt?: string | null;
  nextQuarterInsights?: string | null;
  krReviews?: Array<{ finalValue: number; completionRate: number; keyResult?: { id?: string; description: string } }>;
};

type DocumentWeeklyCommitment = {
  userId?: string;
  user?: { name: string; departmentId?: string | null };
  weekNumber: number;
  priority1: string;
  priority2: string;
  priority3: string;
};

type DocumentWeeklyCelebration = {
  userId?: string;
  user?: { name: string; departmentId?: string | null };
  weekNumber: number;
  achievements: unknown;
  obstacles?: string | null;
  mood: string;
};

type DocumentExportDataset = {
  objectives: DocumentObjective[];
  keyResults: DocumentKeyResult[];
  confidenceScores: DocumentConfidenceScore[];
  healthMetrics: DocumentHealthMetric[];
  healthRecords: DocumentHealthRecord[];
  reviews: DocumentReview[];
  weeklyCommitments: DocumentWeeklyCommitment[];
  weeklyCelebrations: DocumentWeeklyCelebration[];
};

export function buildDocumentReportLines(input: {
  quarterName: string;
  scope: ExportLog["scope"];
  exportedAt: Date;
  objectives: DocumentObjective[];
  keyResults: DocumentKeyResult[];
  confidenceScores: DocumentConfidenceScore[];
  healthMetrics: DocumentHealthMetric[];
  healthRecords: DocumentHealthRecord[];
  reviews: DocumentReview[];
  weeklyCommitments: DocumentWeeklyCommitment[];
  weeklyCelebrations: DocumentWeeklyCelebration[];
}) {
  const confidenceByKr = groupBy(input.confidenceScores, (score) => score.keyResultId);
  const healthRecordsByMetric = groupBy(input.healthRecords, (record) => record.healthMetricId);

  return [
    "封面",
    `${input.quarterName} OKR 季度报告`,
    `导出范围：${input.scope}`,
    `导出时间：${input.exportedAt.toLocaleString("zh-CN", { hour12: false })}`,
    "季度 OKR 全貌",
    ...(input.objectives.length
      ? input.objectives.flatMap((objective) => [
          `${objective.level}｜${objective.department?.name ?? objective.owner?.name ?? "未分配"}｜${objective.title}`,
          ...(objective.keyResults ?? []).map((kr) => `- ${kr.description}：${formatKrValue(kr)}`)
        ])
      : ["暂无 OKR 数据"]),
    "KR 完成度汇总",
    ...(input.keyResults.length
      ? input.keyResults.map((kr) => `${kr.description}｜目标 ${kr.targetValue}${kr.unit ?? ""}｜当前 ${kr.currentValue}${kr.unit ?? ""}｜完成度 ${formatPercent(calculateRatio(kr.currentValue, kr.targetValue))}`)
      : ["暂无 KR 数据"]),
    "信心值变化趋势",
    ...(input.keyResults.length
      ? input.keyResults.map((kr) => `${kr.description}｜${formatConfidenceTrend(confidenceByKr.get(kr.id) ?? [])}`)
      : ["暂无信心值数据"]),
    "健康指标季度汇总",
    ...(input.healthMetrics.length
      ? input.healthMetrics.map((metric) => `${metric.name}｜${metric.level}｜阈值 ${formatHealthThreshold(metric)}｜${formatHealthRecordSummary(healthRecordsByMetric.get(metric.id) ?? [])}`)
      : ["暂无健康指标数据"]),
    "季度 Review 内容",
    ...(input.reviews.length
      ? input.reviews.flatMap((review) => [
          `${review.owner?.name ?? "未分配"}｜有效做法：${review.whatWorked ?? "未填写"}｜不足：${review.whatDidnt ?? "未填写"}｜下季度洞察：${review.nextQuarterInsights ?? "未填写"}`,
          ...(review.krReviews ?? []).map((item) => `- ${item.keyResult?.description ?? "KR"}：最终值 ${item.finalValue}，完成度 ${formatPercent(item.completionRate)}`)
        ])
      : ["暂无 Review 数据"]),
    "附录：周仪式记录",
    ...(input.weeklyCommitments.length || input.weeklyCelebrations.length
      ? [
          ...input.weeklyCommitments.map((item) => `${item.user?.name ?? "成员"}｜第 ${item.weekNumber} 周承诺：${item.priority1} / ${item.priority2} / ${item.priority3}`),
          ...input.weeklyCelebrations.map((item) => `${item.user?.name ?? "成员"}｜第 ${item.weekNumber} 周庆祝：${formatAchievements(item.achievements)}｜障碍：${item.obstacles ?? "无"}｜心情：${item.mood}`)
        ]
      : ["暂无周仪式记录"])
  ];
}

export function buildV2ReportDocumentLines(input: {
  quarterName: string;
  scope: ExportLog["scope"];
  exportedAt: Date;
  quarterSummaries: Array<{
    quarterName: string;
    quarterStatus: string;
    objectiveCount: number;
    keyResultCount: number;
    averageKrCompletionRate: number;
    averageConfidenceScore: number | null;
    weeklyCommitmentRate: number;
    weeklyCelebrationRate: number;
    healthStatusCounts: { healthy: number; warning: number; exceeded: number; unrecorded: number };
  }>;
  departmentSummaries: Array<{
    departmentName: string;
    objectiveCount: number;
    keyResultCount: number;
    averageKrCompletionRate: number;
    averageConfidenceScore: number | null;
    alertCount: number;
  }>;
  confidenceAlerts: Array<{
    keyResultDescription: string;
    quarterName: string;
    departmentName?: string;
    ownerName: string;
    severity: string;
    reason: string;
    latestScore?: number;
    recentScores: number[];
    completionRate: number;
  }>;
  confidenceTrends: Array<{
    keyResultDescription: string;
    objectiveTitle: string;
    departmentName?: string;
    ownerName: string;
    scores: Array<{ weekNumber: number; score: number; note?: string }>;
  }>;
  healthTrends: Array<{
    metricName: string;
    level: string;
    records: Array<{ value: number; status: string; recordedAt: string }>;
  }>;
}) {
  return [
    "封面",
    `${input.quarterName} V2.0 统计报表`,
    `导出范围：${input.scope}`,
    `导出时间：${input.exportedAt.toLocaleString("zh-CN", { hour12: false })}`,
    "季度对比",
    ...(input.quarterSummaries.length
      ? input.quarterSummaries.map(
          (item) =>
            `${item.quarterName}｜${item.quarterStatus}｜Objective ${item.objectiveCount}｜KR ${item.keyResultCount}｜KR 完成率 ${formatPercent(
              item.averageKrCompletionRate
            )}｜平均信心值 ${formatNullableScore(item.averageConfidenceScore)}｜周一提交率 ${formatPercent(
              item.weeklyCommitmentRate
            )}｜周五提交率 ${formatPercent(item.weeklyCelebrationRate)}｜健康 ${formatHealthStatusCounts(item.healthStatusCounts)}`
        )
      : ["暂无季度对比数据"]),
    "信心值趋势预警",
    ...(input.confidenceAlerts.length
      ? input.confidenceAlerts.map(
          (alert) =>
            `${alert.keyResultDescription}｜${alert.quarterName}｜${alert.departmentName ?? "公司级"}｜负责人 ${alert.ownerName}｜级别 ${alert.severity}｜原因 ${alert.reason}｜最新 ${
              alert.latestScore ?? "未提交"
            }｜最近三周 ${alert.recentScores.length ? alert.recentScores.join(" / ") : "-"}｜完成率 ${formatPercent(alert.completionRate)}`
        )
      : ["当前没有信心值趋势预警"]),
    "KR 信心值趋势",
    ...(input.confidenceTrends.length
      ? input.confidenceTrends.map(
          (trend) =>
            `${trend.keyResultDescription}｜${trend.objectiveTitle}｜${trend.departmentName ?? "公司级"}｜负责人 ${trend.ownerName}｜${formatReportConfidenceTrend(trend.scores)}`
        )
      : ["暂无信心值历史记录"]),
    "部门对比",
    ...(input.departmentSummaries.length
      ? input.departmentSummaries.map(
          (department) =>
            `${department.departmentName}｜Objective ${department.objectiveCount}｜KR ${department.keyResultCount}｜完成率 ${formatPercent(
              department.averageKrCompletionRate
            )}｜信心值 ${formatNullableScore(department.averageConfidenceScore)}｜风险 ${department.alertCount}`
        )
      : ["当前范围暂无部门对比数据"]),
    "健康指标季度走势",
    ...(input.healthTrends.length
      ? input.healthTrends.map(
          (trend) =>
            `${trend.metricName}｜${trend.level}｜${
              trend.records.length
                ? trend.records
                    .map((record) => `${new Date(record.recordedAt).toLocaleDateString("zh-CN")} ${record.value.toFixed(1)} ${record.status}`)
                    .join(" / ")
                : "暂无记录"
            }`
        )
      : ["当前范围暂无健康指标季度走势"])
  ];
}

export function filterDocumentExportData(
  dataset: DocumentExportDataset,
  scope: ExportLog["scope"],
  operator?: Pick<User, "id" | "departmentId"> & { exportDepartmentId?: string | null; exportUserId?: string | null }
) {
  if (scope === "company" || !operator) {
    return dataset;
  }
  const targetDepartmentId = operator.exportDepartmentId ?? operator.departmentId;
  const targetUserId = operator.exportUserId ?? operator.id;

  const visibleObjectives = dataset.objectives.filter((objective) => {
    if (scope === "department") return objective.departmentId === targetDepartmentId;
    return objective.ownerId === targetUserId;
  });
  const visibleObjectiveIds = new Set(visibleObjectives.map((objective) => objective.id));

  const visibleKeyResults = dataset.keyResults.filter((keyResult) => {
    if (visibleObjectiveIds.has(keyResult.objectiveId ?? "")) return true;
    if (scope === "individual") return keyResult.ownerId === targetUserId;
    return false;
  });
  const visibleKeyResultIds = new Set(visibleKeyResults.map((keyResult) => keyResult.id));

  const visibleHealthMetrics = dataset.healthMetrics.filter((metric) => {
    if (scope === "department") return metric.departmentId === targetDepartmentId;
    return metric.ownerId === targetUserId;
  });
  const visibleHealthMetricIds = new Set(visibleHealthMetrics.map((metric) => metric.id));

  return {
    objectives: visibleObjectives.map((objective) => ({
      ...objective,
      keyResults: (objective.keyResults ?? []).filter((keyResult) => visibleKeyResultIds.has(keyResult.id))
    })),
    keyResults: visibleKeyResults,
    confidenceScores: dataset.confidenceScores.filter((score) => visibleKeyResultIds.has(score.keyResultId)),
    healthMetrics: visibleHealthMetrics,
    healthRecords: dataset.healthRecords.filter((record) => visibleHealthMetricIds.has(record.healthMetricId)),
    reviews: dataset.reviews
      .filter((review) => {
        if (scope === "department") return review.departmentId === targetDepartmentId || review.ownerId === operator.id;
        return review.ownerId === targetUserId;
      })
      .map((review) => ({
        ...review,
        krReviews: (review.krReviews ?? []).filter((item) => visibleKeyResults.some((keyResult) => keyResult.id === item.keyResult?.id))
      })),
    weeklyCommitments: dataset.weeklyCommitments.filter((item) => (scope === "department" ? item.user?.departmentId === targetDepartmentId : item.userId === targetUserId)),
    weeklyCelebrations: dataset.weeklyCelebrations.filter((item) => (scope === "department" ? item.user?.departmentId === targetDepartmentId : item.userId === targetUserId))
  };
}

async function buildDocumentBlocks(
  quarterId: string,
  scope: ExportLog["scope"],
  operator?: (Pick<User, "id" | "departmentId"> & { exportDepartmentId?: string | null; exportUserId?: string | null })
) {
  const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
  const objectives = await prisma.objective.findMany({
    where: { quarterId },
    include: { owner: true, department: true, keyResults: true },
    orderBy: [{ level: "asc" }, { id: "asc" }]
  });
  const keyResults = objectives.flatMap((objective) => objective.keyResults);
  const confidenceScores = await prisma.confidenceScore.findMany({ where: { quarterId }, orderBy: [{ keyResultId: "asc" }, { weekNumber: "asc" }] });
  const healthMetrics = await prisma.healthMetric.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const healthRecords = await prisma.healthMetricRecord.findMany({
    where: { healthMetricId: { in: healthMetrics.map((metric) => metric.id) } },
    orderBy: { recordedAt: "asc" }
  });
  const reviews = await prisma.quarterReview.findMany({ where: { quarterId }, include: { owner: true, krReviews: { include: { keyResult: true } } } });
  const weeklyCommitments = await prisma.weeklyCommitment.findMany({ where: { quarterId }, include: { user: true }, orderBy: [{ weekNumber: "asc" }, { userId: "asc" }] });
  const weeklyCelebrations = await prisma.weeklyCelebration.findMany({ where: { quarterId }, include: { user: true }, orderBy: [{ weekNumber: "asc" }, { userId: "asc" }] });
  const filtered = filterDocumentExportData(
    {
      objectives,
      keyResults,
      confidenceScores,
      healthMetrics,
      healthRecords,
      reviews,
      weeklyCommitments,
      weeklyCelebrations
    },
    scope,
    operator
  );
  const lines = buildDocumentReportLines({
    quarterName: quarter?.name ?? quarterId,
    scope,
    exportedAt: new Date(),
    objectives: filtered.objectives,
    keyResults: filtered.keyResults,
    confidenceScores: filtered.confidenceScores,
    healthMetrics: filtered.healthMetrics,
    healthRecords: filtered.healthRecords,
    reviews: filtered.reviews,
    weeklyCommitments: filtered.weeklyCommitments,
    weeklyCelebrations: filtered.weeklyCelebrations
  });

  return lines.map((text) => ({
    block_type: 2,
    text: { elements: [{ text_run: { content: text } }] }
  }));
}

async function buildDocumentMarkdown(
  quarterId: string,
  scope: ExportLog["scope"],
  operator: (Pick<User, "id" | "departmentId"> & { exportDepartmentId?: string | null; exportUserId?: string | null }) | undefined,
  title: string
) {
  const blocks = await buildDocumentBlocks(quarterId, scope, operator);
  return buildMarkdownDocument(title, blocks.map((block) => block.text.elements[0].text_run.content));
}

async function buildV2ReportBlocks(
  quarterId: string,
  scope: ExportLog["scope"],
  operator?: (Pick<User, "id" | "departmentId"> & { exportDepartmentId?: string | null; exportUserId?: string | null })
) {
  const quarter = await prisma.quarter.findUnique({ where: { id: quarterId } });
  const filter = scope === "department" ? { departmentId: operator?.exportDepartmentId ?? operator?.departmentId ?? undefined } : {};
  const report =
    (operator ? await prismaQueries.getV2Report(operator.id, quarterId, filter) : null) ??
    repository.getV2Report(operator?.id ?? "u-admin", quarterId, filter);

  const lines = buildV2ReportDocumentLines({
    quarterName: quarter?.name ?? quarterId,
    scope,
    exportedAt: new Date(),
    quarterSummaries: report.quarterSummaries,
    departmentSummaries: report.departmentSummaries,
    confidenceAlerts: report.confidenceAlerts,
    confidenceTrends: report.confidenceTrends,
    healthTrends: report.healthTrends
  });

  return lines.map((text) => ({
    block_type: 2,
    text: { elements: [{ text_run: { content: text } }] }
  }));
}

async function buildV2ReportMarkdown(
  quarterId: string,
  scope: ExportLog["scope"],
  operator: (Pick<User, "id" | "departmentId"> & { exportDepartmentId?: string | null; exportUserId?: string | null }) | undefined,
  title: string
) {
  const blocks = await buildV2ReportBlocks(quarterId, scope, operator);
  return buildMarkdownDocument(title, blocks.map((block) => block.text.elements[0].text_run.content));
}

function buildMarkdownDocument(title: string, lines: string[]) {
  return [`<title>${title}</title>`, `# ${title}`, ...lines.map((line) => `- ${line}`)].join("\n");
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function formatKrValue(kr: DocumentKeyResult) {
  return `${kr.currentValue}/${kr.targetValue}${kr.unit ?? ""}`;
}

function calculateRatio(currentValue: number, targetValue: number) {
  if (targetValue === 0) return currentValue > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, currentValue / targetValue));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatConfidenceTrend(scores: DocumentConfidenceScore[]) {
  if (scores.length === 0) return "暂无记录";
  const ordered = [...scores].sort((a, b) => a.weekNumber - b.weekNumber);
  const weekly = ordered.map((score) => `W${score.weekNumber}:${score.score}`).join(" ");
  const first = ordered[0]?.score ?? 0;
  const last = ordered[ordered.length - 1]?.score ?? 0;
  const trend = last > first ? "上升" : last < first ? "下降" : "稳定";
  return `${weekly}｜趋势 ${trend}`;
}

function formatReportConfidenceTrend(scores: Array<{ weekNumber: number; score: number; note?: string }>) {
  if (scores.length === 0) return "暂无记录";
  const ordered = [...scores].sort((a, b) => a.weekNumber - b.weekNumber);
  const weekly = ordered.map((score) => `W${score.weekNumber}:${score.score}`).join(" ");
  const first = ordered[0]?.score ?? 0;
  const last = ordered[ordered.length - 1]?.score ?? 0;
  const trend = last > first ? "上升" : last < first ? "下降" : "稳定";
  return `${weekly}｜趋势 ${trend}`;
}

function formatHealthThreshold(metric: DocumentHealthMetric) {
  if (metric.thresholdType === "range") return `${metric.thresholdMin ?? "-"}-${metric.thresholdMax ?? "-"}`;
  return `${metric.thresholdType} ${metric.thresholdValue ?? "-"}`;
}

function formatHealthRecordSummary(records: DocumentHealthRecord[]) {
  if (records.length === 0) return "暂无记录";
  const values = records.map((record) => record.currentValue);
  const latest = records[records.length - 1];
  return `最高 ${Math.max(...values)}｜最低 ${Math.min(...values)}｜最新 ${latest.currentValue}｜状态 ${latest.status}`;
}

function formatNullableScore(value: number | null) {
  return value == null ? "-" : value.toFixed(1);
}

function formatHealthStatusCounts(counts: { healthy: number; warning: number; exceeded: number; unrecorded: number }) {
  return `healthy ${counts.healthy}｜warning ${counts.warning}｜exceeded ${counts.exceeded}｜unrecorded ${counts.unrecorded}`;
}

export const feishuProvider: FeishuProvider = new RuntimeFeishuProvider();

export function buildDocumentCreateBody(title: string, folderToken?: string) {
  return {
    title,
    ...(folderToken ? { folder_token: folderToken } : {})
  };
}

export function buildBitableBatchBodies(records: Array<Record<string, unknown>>, batchSize = 500) {
  const batches: Array<{ records: Array<{ fields: Record<string, unknown> }> }> = [];
  for (let index = 0; index < records.length; index += batchSize) {
    batches.push({
      records: records.slice(index, index + batchSize).map((fields) => ({ fields }))
    });
  }
  return batches;
}

export function buildBitableDeleteBatchBodies(recordIds: string[], batchSize = 500) {
  const batches: Array<{ records: string[] }> = [];
  for (let index = 0; index < recordIds.length; index += batchSize) {
    batches.push({ records: recordIds.slice(index, index + batchSize) });
  }
  return batches;
}

export function buildBitablePermissionCheckPaths(appToken: string, tableIds: Record<string, string>) {
  return Object.values(tableIds)
    .filter(Boolean)
    .map((tableId) => `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=1`);
}

export function buildDocumentShareRequest(documentId: string, operatorOpenId: string) {
  return {
    path: `/open-apis/drive/v1/permissions/${documentId}/members?type=docx`,
    body: {
      member_type: "openid",
      member_id: operatorOpenId,
      perm: "view"
    }
  };
}

export function appendDocumentShareWarning(baseMessage: string, shareError?: string) {
  if (!shareError) return baseMessage;
  return `${baseMessage}（已生成文档，但未自动添加查看权限：${shareError}）`;
}

export function buildCalendarEventPayloads(
  quarter: { startDate: Date; endDate: Date },
  settings: FeishuCalendarSettings
) {
  return [
    buildCalendarEventPayload("MO", quarter, settings.monday, settings),
    buildCalendarEventPayload("FR", quarter, settings.friday, settings)
  ];
}

function buildCalendarEventPayload(
  weekday: "MO" | "FR",
  quarter: { startDate: Date; endDate: Date },
  event: FeishuCalendarSettings["monday"],
  settings: FeishuCalendarSettings
) {
  const [startHour, startMinute] = parseTimeParts(event.startTime);
  const [endHour, endMinute] = parseTimeParts(event.endTime);
  return {
    summary: event.summary,
    description: `${event.description}\n${getAppUrl()}/weekly`,
    start_time: { timestamp: String(firstWeekdayTimestamp(quarter.startDate, weekday, startHour, startMinute)), timezone: "Asia/Shanghai" },
    end_time: { timestamp: String(firstWeekdayTimestamp(quarter.startDate, weekday, endHour, endMinute)), timezone: "Asia/Shanghai" },
    recurrence: `FREQ=WEEKLY;BYDAY=${weekday};UNTIL=${formatRRuleUntil(quarter.endDate)}`,
    attendee_ability: "can_see_others",
    ...(settings.inviteScope === "department" && settings.inviteDepartmentId
      ? { attendees: [{ type: "department", department_id: settings.inviteDepartmentId }] }
      : {})
  };
}

function parseTimeParts(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return [hour, minute] as const;
}

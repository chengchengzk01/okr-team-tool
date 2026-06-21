const singletonId = "default";
import { prisma } from "@/lib/prisma";

export type FeishuRuntimeConfig = {
  provider: "mock" | "real";
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  rootDepartmentId: string;
  calendarId: string;
  calendarEventIds: Record<string, string[]>;
  calendarSettings: FeishuCalendarSettings;
  bitableAppToken?: string;
  bitableTableIds: Record<string, string>;
  driveFolderToken?: string;
};

export type FeishuConfigCheck = {
  key: "oauth" | "orgSync" | "calendar" | "bitable" | "drive";
  title: string;
  ready: boolean;
  detail: string;
  missingFields: string[];
  helpUrl?: string;
};

export type FeishuCalendarEventSettings = {
  summary: string;
  startTime: string;
  endTime: string;
  description: string;
};

export type FeishuCalendarSettings = {
  inviteScope: "company" | "department";
  inviteDepartmentId?: string;
  monday: FeishuCalendarEventSettings;
  friday: FeishuCalendarEventSettings;
};

export const defaultCalendarSettings: FeishuCalendarSettings = {
  inviteScope: "company",
  monday: {
    summary: "OKR 周一承诺",
    startTime: "10:00",
    endTime: "10:30",
    description: "填写本周最重要的 Top 3 优先级。"
  },
  friday: {
    summary: "OKR 周五庆祝",
    startTime: "16:00",
    endTime: "16:30",
    description: "提交本周完成事项、障碍和团队心情。"
  }
};

export async function getFeishuRuntimeConfig(): Promise<FeishuRuntimeConfig> {
  const dbConfig = await prisma.feishuIntegrationConfig.findUnique({ where: { id: singletonId } }).catch(() => null);
  return {
    provider: normalizeProvider(dbConfig?.provider ?? process.env.FEISHU_PROVIDER),
    appId: dbConfig?.appId ?? process.env.FEISHU_APP_ID,
    appSecret: dbConfig?.appSecret ?? process.env.FEISHU_APP_SECRET,
    redirectUri: dbConfig?.redirectUri ?? process.env.FEISHU_REDIRECT_URI,
    rootDepartmentId: dbConfig?.rootDepartmentId ?? process.env.FEISHU_ROOT_DEPARTMENT_ID ?? "0",
    calendarId: dbConfig?.calendarId ?? process.env.FEISHU_CALENDAR_ID ?? "primary",
    calendarEventIds: normalizeStringArrayMap(dbConfig?.calendarEventIds, process.env.FEISHU_CALENDAR_EVENT_IDS_JSON),
    calendarSettings: normalizeCalendarSettings(dbConfig?.calendarSettings, process.env.FEISHU_CALENDAR_SETTINGS_JSON),
    bitableAppToken: dbConfig?.bitableAppToken ?? process.env.FEISHU_BITABLE_APP_TOKEN,
    bitableTableIds: normalizeStringMap(dbConfig?.bitableTableIds, process.env.FEISHU_BITABLE_TABLE_IDS_JSON),
    driveFolderToken: dbConfig?.driveFolderToken ?? process.env.FEISHU_DRIVE_FOLDER_TOKEN
  };
}

export async function getStoredFeishuConfig() {
  return prisma.feishuIntegrationConfig.findUnique({ where: { id: singletonId } }).catch(() => null);
}

export async function updateStoredFeishuConfig(input: {
  provider?: string;
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  rootDepartmentId?: string;
  calendarId?: string;
  calendarEventIds?: Record<string, string[]>;
  calendarSettings?: FeishuCalendarSettings;
  bitableUrl?: string;
  bitableAppToken?: string;
  bitableTableIds?: Record<string, string>;
  driveFolderToken?: string;
  updatedBy?: string;
}) {
  const bitableAppToken = input.bitableAppToken ?? (input.bitableUrl ? parseBitableAppToken(input.bitableUrl) : undefined);
  return prisma.feishuIntegrationConfig.upsert({
    where: { id: singletonId },
    update: {
      provider: input.provider,
      appId: input.appId,
      appSecret: input.appSecret,
      redirectUri: input.redirectUri,
      rootDepartmentId: input.rootDepartmentId,
      calendarId: input.calendarId,
      calendarEventIds: input.calendarEventIds,
      calendarSettings: input.calendarSettings,
      bitableAppToken,
      bitableTableIds: input.bitableTableIds,
      driveFolderToken: input.driveFolderToken,
      updatedBy: input.updatedBy
    },
    create: {
      id: singletonId,
      provider: input.provider ?? "mock",
      appId: input.appId,
      appSecret: input.appSecret,
      redirectUri: input.redirectUri,
      rootDepartmentId: input.rootDepartmentId,
      calendarId: input.calendarId,
      calendarEventIds: input.calendarEventIds,
      calendarSettings: input.calendarSettings,
      bitableAppToken,
      bitableTableIds: input.bitableTableIds,
      driveFolderToken: input.driveFolderToken,
      updatedBy: input.updatedBy
    }
  });
}

export function mergeCalendarEventIds(current: Record<string, string[]>, quarterId: string, eventIds: string[]) {
  return {
    ...current,
    [quarterId]: eventIds
  };
}

export function getFeishuConfigReadiness(config: FeishuRuntimeConfig) {
  const oauthReady = Boolean(config.appId && config.appSecret && config.redirectUri);
  const orgSyncReady = Boolean(config.rootDepartmentId);
  const requiredBitableTables = ["okr_overview", "confidence_history", "health_metrics", "weekly_rituals"];
  const missingBitableTables = requiredBitableTables.filter((key) => !config.bitableTableIds[key]);
  const bitableReady = Boolean(config.bitableAppToken && missingBitableTables.length === 0);
  const calendarReady = Boolean(config.calendarId && (config.calendarSettings.inviteScope !== "department" || config.calendarSettings.inviteDepartmentId));
  const driveReady = Boolean(config.driveFolderToken);
  const checks: FeishuConfigCheck[] = [
    {
      key: "oauth",
      title: "OAuth 登录",
      ready: oauthReady,
      detail: oauthReady ? "已具备正式飞书 OAuth 登录所需参数。" : "正式登录需要 app_id、app_secret 与 redirect_uri。",
      missingFields: [
        !config.appId ? "app_id" : null,
        !config.appSecret ? "app_secret" : null,
        !config.redirectUri ? "redirect_uri" : null
      ].filter(Boolean) as string[],
      helpUrl: "https://open.feishu.cn/document/common-capabilities/sso/web-application-end-user-consent/guide"
    },
    {
      key: "orgSync",
      title: "组织同步",
      ready: orgSyncReady,
      detail: orgSyncReady ? "已配置组织同步起始部门。" : "组织同步需要根部门 ID，用于确定通讯录同步起点。",
      missingFields: [!config.rootDepartmentId ? "root_department_id" : null].filter(Boolean) as string[],
      helpUrl: "https://open.feishu.cn/document/server-docs/contact-v3/department/introduction"
    },
    {
      key: "calendar",
      title: "日历配置",
      ready: calendarReady,
      detail:
        calendarReady
          ? "已具备创建和更新季度日历事件所需配置。"
          : config.calendarSettings.inviteScope === "department"
            ? "按部门邀请时，需要同时配置日历 ID 和受邀部门 ID。"
            : "创建季度日历事件需要日历 ID。",
      missingFields: [
        !config.calendarId ? "calendar_id" : null,
        config.calendarSettings.inviteScope === "department" && !config.calendarSettings.inviteDepartmentId ? "calendar_settings.inviteDepartmentId" : null
      ].filter(Boolean) as string[],
      helpUrl: "https://open.feishu.cn/document/server-docs/calendar-v4/overview"
    },
    {
      key: "bitable",
      title: "多维表格",
      ready: bitableReady,
      detail:
        bitableReady
          ? "4 张工作表已配置完成，可执行全量同步。"
          : "多维表格需要 app token，且必须配置 okr_overview、confidence_history、health_metrics、weekly_rituals 四张表。",
      missingFields: [
        !config.bitableAppToken ? "bitable_app_token" : null,
        ...missingBitableTables.map((key) => `bitable_table_ids.${key}`)
      ].filter(Boolean) as string[],
      helpUrl: "https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview?lang=zh-CN"
    },
    {
      key: "drive",
      title: "文档目录",
      ready: driveReady,
      detail: driveReady ? "已配置飞书云空间目录，可导出季度文档。" : "飞书文档导出需要云空间文件夹 token。",
      missingFields: [!config.driveFolderToken ? "drive_folder_token" : null].filter(Boolean) as string[],
      helpUrl: "https://open.feishu.cn/document/docs/drive-v1/folder/folder-overview?lang=zh-CN"
    }
  ];
  const missingItems = [
    !oauthReady ? "OAuth（app_id / app_secret / redirect_uri）" : null,
    !orgSyncReady ? "根部门 ID" : null,
    !calendarReady ? "日历 ID / 受邀部门 ID" : null,
    !bitableReady ? "多维表格 app token / 4 张 table ids" : null,
    !driveReady ? "云空间文件夹 token" : null
  ].filter(Boolean) as string[];
  return {
    mode: config.provider,
    ready: config.provider === "mock" ? true : checks.every((item) => item.ready),
    oauthReady,
    orgSyncReady,
    bitableReady,
    calendarReady,
    driveReady,
    checks,
    missingItems,
    message:
      config.provider === "mock"
        ? "当前使用 MockFeishuProvider，不调用真实飞书接口"
        : checks.every((item) => item.ready)
          ? "真实飞书配置已就绪"
          : "真实飞书配置未完成，请按检查项补齐后再切换正式运行"
  };
}

function normalizeProvider(value?: string): "mock" | "real" {
  return value === "real" ? "real" : "mock";
}

function normalizeStringMap(value: unknown, fallback?: string): Record<string, string> {
  const parsed = typeof value === "object" && value && !Array.isArray(value) ? value : parseJson(fallback);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([, item]) => typeof item === "string")) as Record<string, string>;
}

function normalizeStringArrayMap(value: unknown, fallback?: string): Record<string, string[]> {
  const parsed = typeof value === "object" && value && !Array.isArray(value) ? value : parseJson(fallback);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).map(([key, item]) => [key, Array.isArray(item) ? item.map(String) : typeof item === "string" ? [item] : []])
  );
}

function normalizeCalendarSettings(value: unknown, fallback?: string): FeishuCalendarSettings {
  const parsed = typeof value === "object" && value && !Array.isArray(value) ? value : parseJson(fallback);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaultCalendarSettings;
  const input = parsed as Partial<FeishuCalendarSettings>;
  return {
    inviteScope: input.inviteScope === "department" ? "department" : "company",
    inviteDepartmentId: typeof input.inviteDepartmentId === "string" ? input.inviteDepartmentId : undefined,
    monday: normalizeCalendarEventSettings(input.monday, defaultCalendarSettings.monday),
    friday: normalizeCalendarEventSettings(input.friday, defaultCalendarSettings.friday)
  };
}

function normalizeCalendarEventSettings(input: unknown, fallback: FeishuCalendarEventSettings): FeishuCalendarEventSettings {
  const item = input && typeof input === "object" && !Array.isArray(input) ? (input as Partial<FeishuCalendarEventSettings>) : {};
  return {
    summary: nonEmptyString(item.summary, fallback.summary),
    startTime: normalizeTime(item.startTime, fallback.startTime),
    endTime: normalizeTime(item.endTime, fallback.endTime),
    description: nonEmptyString(item.description, fallback.description)
  };
}

function nonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function parseJson(value?: string) {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function parseBitableAppToken(url: string) {
  const match = url.match(/base\/([A-Za-z0-9]+)/) ?? url.match(/appToken=([A-Za-z0-9]+)/);
  return match?.[1];
}

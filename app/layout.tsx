import type { Metadata, Viewport } from "next";
import { ChunkReloadGuard } from "@/components/chunk-reload-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "OKR 团队工具",
  description: "围绕周一承诺、信心值、周五庆祝和健康指标运行的中文 OKR 团队工具"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ChunkReloadGuard />
        {children}
      </body>
    </html>
  );
}

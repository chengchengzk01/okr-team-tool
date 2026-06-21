import { cn } from "@/lib/utils";

const tones = {
  green: "border-status-green bg-status-green-bg text-status-green",
  yellow: "border-status-yellow bg-status-yellow-bg text-status-yellow",
  red: "border-status-red bg-status-red-bg text-status-red",
  gray: "border-status-gray bg-status-gray-bg text-muted",
  blue: "border-primary bg-primary-light text-primary"
};

export function StatusPill({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

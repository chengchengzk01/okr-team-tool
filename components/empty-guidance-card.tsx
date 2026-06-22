import Link from "next/link";

type GuidanceAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

export function EmptyGuidanceCard({
  title,
  description,
  actions,
  tip
}: {
  title: string;
  description: string;
  actions: GuidanceAction[];
  tip?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-hover p-5">
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-steel">{description}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={
                action.tone === "secondary"
                  ? "rounded-md border border-line px-4 py-2 text-sm font-medium text-steel hover:bg-card"
                  : "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
        {tip ? <p className="mt-3 text-xs leading-5 text-muted">{tip}</p> : null}
      </div>
    </div>
  );
}

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? <div className="mb-1 text-xs font-medium tracking-normal text-muted">{eyebrow}</div> : null}
        <h1 className="text-[20px] font-semibold leading-7 tracking-normal text-ink">{title}</h1>
      </div>
      {children}
    </div>
  );
}

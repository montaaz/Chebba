/* Title block shared by every page of the client and admin areas. */
export default function PageHeader({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(1.55rem,4.2vw,2.3rem)]">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-mist">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 max-sm:w-full [&>*]:max-sm:flex-1">{children}</div>}
    </header>
  );
}

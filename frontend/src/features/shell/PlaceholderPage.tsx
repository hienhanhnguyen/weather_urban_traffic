import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-6">
        <Construction aria-hidden="true" className="mt-0.5 size-5 opacity-60" />
        <div>
          <p className="text-sm font-medium">Not built yet</p>
          <p className="mt-1 text-sm opacity-70">{description}</p>
        </div>
      </div>
    </div>
  );
}

import { PageHeader } from "./PageHeader";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Бұл модуль келесі кезеңде іске қосылады.
        </p>
      </div>
    </div>
  );
}

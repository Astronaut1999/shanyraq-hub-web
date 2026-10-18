import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";

import { useQuickAction } from "@/lib/quick-action";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { deleteEvent, isEventEditable, isPastEvent, listEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { EventPreviewDialog } from "@/components/events/EventPreviewDialog";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Іс-шаралар — Шаңырақ" },
      { name: "description", content: "Мәдени іс-шараларды жоспарлау және басқару." },
      { property: "og:title", content: "Іс-шаралар — Шаңырақ" },
      { property: "og:description", content: "Мәдени іс-шараларды жоспарлау және басқару." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { isSuperAdmin, isOrganizationAdmin, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<EventItem | null>(null);
  const { pending, consume } = useQuickAction();

  useEffect(() => {
    if (consume("event")) setCreating(true);
  }, [pending, consume]);

  const { data: events, isLoading } = useQuery({ queryKey: ["events"], queryFn: listEvents });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Іс-шара өшірілді");
    },
    onError: () => toast.error("Өшіру сәтсіз аяқталды"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  const canManage = isOrganizationAdmin && !!profile?.organization_id;
  const all = events ?? [];
  const upcoming = all.filter((e) => !isPastEvent(e));
  const past = all.filter((e) => isPastEvent(e));

  const renderCards = (rows: EventItem[]) => (
    <div className="space-y-3 lg:hidden">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Іс-шаралар әзірге жоқ.
        </p>
      ) : (
        rows.map((event) => (
          <Card key={event.id}>
            <CardContent className="space-y-2 px-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug">{event.title}</p>
                <EventStatusBadge status={event.moderation_status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {event.event_date}
                {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
                {event.location ? ` · ${event.location}` : ""}
              </p>
              {isSuperAdmin && event.organizations?.name ? (
                <p className="text-xs text-muted-foreground">{event.organizations.name}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Материалдар: {event.media_items?.length ?? 0}
              </p>
              {event.moderation_status === "rejected" && event.rejection_reason ? (
                <p className="text-xs text-destructive">
                  Қабылданбау себебі: {event.rejection_reason}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" className="min-h-11 flex-1" onClick={() => setPreview(event)}>
                  <Eye /> Қарау
                </Button>
                {canManage && isEventEditable(event) ? (
                  <>
                    <Button variant="outline" className="min-h-11 flex-1" onClick={() => setEditing(event)}>
                      Өңдеу
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11 flex-1"
                      onClick={() => remove.mutate(event.id)}
                      disabled={remove.isPending}
                    >
                      Өшіру
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderTable = (rows: EventItem[]) => (
    <div className="hidden rounded-lg border border-border bg-card lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Атауы</TableHead>
            {isSuperAdmin ? <TableHead>Ұйым</TableHead> : null}
            <TableHead>Күні мен уақыты</TableHead>
            <TableHead>Өтетін орны</TableHead>
            <TableHead>Күйі</TableHead>
            <TableHead>Материал</TableHead>
            <TableHead className="text-right">Әрекеттер</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                Жүктелуде...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                Іс-шаралар әзірге жоқ.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <p className="font-medium">{event.title}</p>
                  {event.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                  ) : null}
                  {event.moderation_status === "rejected" && event.rejection_reason ? (
                    <p className="mt-0.5 text-xs text-destructive">
                      Қабылданбау себебі: {event.rejection_reason}
                    </p>
                  ) : null}
                </TableCell>
                {isSuperAdmin ? (
                  <TableCell className="text-muted-foreground">
                    {event.organizations?.name ?? "—"}
                  </TableCell>
                ) : null}
                <TableCell className="text-muted-foreground">
                  {event.event_date}
                  {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">{event.location ?? "—"}</TableCell>
                <TableCell>
                  <EventStatusBadge status={event.moderation_status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.media_items?.length ?? 0}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => setPreview(event)}>
                    <Eye />
                    Қарау
                  </Button>
                  {canManage && isEventEditable(event) ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditing(event)}>
                        Өңдеу
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove.mutate(event.id)}
                        disabled={remove.isPending}
                      >
                        Өшіру
                      </Button>
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Іс-шаралар"
        description={
          isSuperAdmin
            ? "Барлық ұйымдардың іс-шаралары"
            : "Ұйымыңыздың мәдени іс-шаралары. Іс-шара фото/видеомен бірге модерацияға жіберіледі."
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Алдағы іс-шаралар ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Өткен іс-шаралар ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {renderCards(upcoming)}
          {renderTable(upcoming)}
        </TabsContent>
        <TabsContent value="past">
          {renderCards(past)}
          {renderTable(past)}
        </TabsContent>
      </Tabs>

      {creating && profile?.organization_id ? (
        <EventFormDialog
          organizationId={profile.organization_id}
          open
          onOpenChange={(v) => !v && setCreating(false)}
        />
      ) : null}

      {editing ? (
        <EventFormDialog
          organizationId={editing.organization_id}
          event={editing}
          open
          onOpenChange={(v) => !v && setEditing(null)}
        />
      ) : null}

      <EventPreviewDialog event={preview} canModerate={false} onClose={() => setPreview(null)} />
    </div>
  );
}

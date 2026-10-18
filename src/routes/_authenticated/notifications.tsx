import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDateTime } from "@/lib/format-date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCategory,
  type AppNotification,
  type NotificationCategory,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Хабарламалар — Шаңырақ" },
      { name: "description", content: "Жоспарлар, модерация және жүйе хабарламалары." },
      { property: "og:title", content: "Хабарламалар — Шаңырақ" },
      { property: "og:description", content: "Жоспарлар, модерация және жүйе хабарламалары." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const TABS: [NotificationCategory, string][] = [
  ["all", "Барлығы"],
  ["plans", "Жоспарлар"],
  ["moderation", "Модерация"],
  ["system", "Жүйе"],
];

function NotificationsPage() {
  const { isSuperAdmin, isOrganizationAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<NotificationCategory>("all");
  const allowed = isSuperAdmin || isOrganizationAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: listNotifications,
    enabled: allowed,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  if (!allowed) {
    return <p className="p-6 text-sm text-muted-foreground">Хабарламалар тек әкімшілерге қолжетімді.</p>;
  }

  const items = (data ?? []).filter((n) => tab === "all" || notificationCategory(n.notification_type) === tab);
  const unreadIds = (data ?? []).filter((n) => !n.is_read).map((n) => n.id);

  const open = (n: AppNotification) => {
    if (!n.is_read) markOne.mutate(n.id);
    if (n.action_url) void navigate({ href: n.action_url });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <PageHeader title="Хабарламалар" description="Жоспарлар мен модерация бойынша жаңалықтар" />
      <div className="mb-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
          {TABS.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tab === value ? "default" : "ghost"}
              className="min-h-10 px-1 text-xs"
              onClick={() => setTab(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Барлығын оқылды деп белгілеу"
          disabled={unreadIds.length === 0 || markAll.isPending}
          onClick={() => markAll.mutate(unreadIds)}
        >
          <CheckCheck className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 size-6" /> Хабарлама жоқ
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`rounded-2xl border bg-card p-4 shadow-soft ${n.is_read ? "opacity-75" : "border-primary/40"}`}>
              <div className="flex items-start gap-2">
                {!n.is_read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Оқылмаған" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{n.title}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {n.action_url ? (
                  <Button size="sm" className="min-h-10" onClick={() => open(n)}>
                    {n.action_label ?? "Ашу"}
                  </Button>
                ) : null}
                {!n.is_read ? (
                  <Button size="sm" variant="ghost" className="min-h-10" onClick={() => markOne.mutate(n.id)}>
                    Оқылды
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

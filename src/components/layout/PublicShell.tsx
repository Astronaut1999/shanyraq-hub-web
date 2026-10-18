import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { countUnreadNotifications } from "@/lib/notifications";
import {
  Bell,
  CalendarDays,
  Building2,
  CalendarPlus,
  FileUp,
  Home,
  Images,
  Plus,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { useQuickAction } from "@/lib/quick-action";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Destination =
  | "/"
  | "/orgs"
  | "/profile"
  | "/login"
  | "/moderation"
  | "/dashboard"
  | "/organizations"
  | "/plans"
  | "/plan-items"
  | "/events"
  | "/media"
  | "/analytics"
  | "/afisha";

interface NavItem {
  to: Destination;
  label: string;
  icon: typeof Home;
}

/**
 * Single application shell: compact light header, role-based bottom navigation
 * and a secondary-tools side menu. Used by public and administrative routes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, isOrganizationAdmin } = useAuth();
  const { request } = useQuickAction();
  const navigate = useNavigate();

  const canCreate = isOrganizationAdmin || isSuperAdmin;
  const profileTo: Destination = user ? "/profile" : "/login";

  const home: NavItem = { to: "/", label: "Басты бет", icon: Home };
  const events: NavItem = { to: canCreate ? "/events" : "/afisha", label: "Іс-шаралар", icon: CalendarDays };
  const orgs: NavItem = { to: "/orgs", label: "Ұйымдар", icon: Building2 };
  const profile: NavItem = { to: profileTo, label: "Профиль", icon: UserRound };
  const desktopNav: NavItem[] = [home, events, orgs, profile];

  const create = (action: "media" | "event" | "plan", to: Destination) => {
    request(action);
    void navigate({ to });
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Шаңырақ">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground shadow-elevated">
              Ш
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-display text-base leading-none">Шаңырақ</strong>
              <small className="text-[11px] text-muted-foreground">Pavlodar Hub</small>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {desktopNav.map((item) => (
              <HeaderLink key={`${item.to}-${item.label}`} {...item} />
            ))}
          </nav>

          {canCreate ? <NotificationBell /> : null}

          {!user ? (
            <Button asChild size="sm" className="shrink-0 md:hidden">
              <Link to="/login">Кіру</Link>
            </Button>
          ) : null}
        </div>
      </header>

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 items-start border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-soft backdrop-blur-xl md:hidden">
        <BottomLink {...home} />
        <BottomLink {...events} />
        <div className="relative col-start-3 flex min-h-14 items-end justify-center pb-1">
          {canCreate ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  className="absolute left-1/2 top-0 size-11 -translate-x-1/2 -translate-y-2 rounded-2xl shadow-soft ring-4 ring-background"
                  size="icon"
                  aria-label="Қосу"
                >
                  <Plus className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <SheetHeader>
                  <SheetTitle>Жаңа материал</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 px-4 pt-2">
                  <SheetClose asChild>
                    <Button variant="outline" className="min-h-14 justify-start text-base" onClick={() => create("media", "/media")}>
                      <Images className="size-5 text-primary" /> Фото / видео
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" className="min-h-14 justify-start text-base" onClick={() => create("event", "/events")}>
                      <CalendarPlus className="size-5 text-primary" /> Іс-шара
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" className="min-h-14 justify-start text-base" onClick={() => create("plan", "/plans")}>
                      <FileUp className="size-5 text-primary" /> Жоспар файлы
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
        <BottomLink {...orgs} />
        <BottomLink {...profile} />
      </nav>
    </div>
  );
}

/** Backwards-compatible alias: existing routes import PublicShell. */
export const PublicShell = AppShell;

function HeaderLink({ to, label }: NavItem) {
  return (
    <Link
      to={to}
      className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
      activeProps={{ className: "text-primary bg-secondary" }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  );
}

function BottomLink({ to, label, icon: Icon }: NavItem) {
  return (
    <Link
      to={to}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted-foreground"
      activeProps={{ className: "text-primary font-semibold" }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon className="size-5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NotificationBell() {
  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: countUnreadNotifications,
    refetchInterval: 60_000,
  });
  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Хабарламалар, ${unread} оқылмаған` : "Хабарламалар"}
      className="relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary md:ml-0"
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

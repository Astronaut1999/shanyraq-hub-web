import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronDown, MapPin, WifiOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";

import { PostEngagement } from "@/components/feed/PostEngagement";
import { PublicShell } from "@/components/layout/PublicShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getPublicMediaUrl, listPublicEvents, listPublicFeed, type PublicEventMedia } from "@/lib/feed.functions";
import { usePreferences } from "@/lib/preferences";
import { VideoPlayer } from "@/components/media/VideoPlayer";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
}

function formatPublished(value: string) {
  return formatDateTime(value);
}

function ExpandableText({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = children.length > 130 && !expanded;
  return <p className="text-[15px] leading-6">{short ? `${children.slice(0, 130).trim()}… ` : children}{children.length > 130 ? <button type="button" className="font-semibold text-primary" onClick={() => setExpanded((value) => !value)}>{expanded ? "Жасыру" : "Толығырақ"}</button> : null}</p>;
}

function FeedMedia({ media }: { media: PublicEventMedia }) {
  const [full, setFull] = useState(false);
  const source = media.thumbnail_url ?? media.url;
  if (!source) return <div className="flex aspect-[4/3] items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">Файл қолжетімсіз</div>;
  if (media.media_kind === "video") {
    return <VideoPlayer src={media.url} poster={media.thumbnail_url} title={media.title} className="aspect-[4/3]" refreshUrl={() => getPublicMediaUrl({ data: { mediaId: media.id } })} />;
  }
  const fullSource = media.url ?? media.thumbnail_url;
  return <>
    <button type="button" className="relative block aspect-[4/3] w-full bg-foreground/5" onClick={() => setFull(true)} aria-label="Суретті толық ашу"><img src={media.thumbnail_url ?? media.url ?? ""} alt={media.title} className="size-full object-cover" loading="lazy" width={960} height={720} /></button>
    <Dialog open={full} onOpenChange={setFull}>
      <DialogContent className="max-h-[95vh] max-w-5xl border-0 bg-background p-2 sm:p-3">
        <DialogTitle className="sr-only">{media.title}</DialogTitle>
        <DialogDescription className="sr-only">Суретті толық көру</DialogDescription>
        {fullSource ? <img src={fullSource} alt={media.title} className="mx-auto max-h-[88vh] w-auto max-w-full rounded-md object-contain" /> : null}
      </DialogContent>
    </Dialog>
  </>;
}

export function PublicFeedPage({ initialFilter = "all" }: { initialFilter?: "all" | "events" | "media" } = {}) {
  const { pageSize, online } = usePreferences();
  const [activeFilter, setActiveFilter] = useState<"all" | "events" | "media">(initialFilter);
  const eventsQuery = useInfiniteQuery({
    queryKey: ["social-feed-events", pageSize],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listPublicEvents({ data: { page: pageParam, pageSize } }),
    getNextPageParam: (last, pages) => last.hasMore ? pages.length : undefined,
    refetchOnWindowFocus: false,
  });
  const standalone = useQuery({ queryKey: ["social-feed-standalone"], queryFn: () => listPublicFeed({ data: {} }), refetchOnWindowFocus: false });
  const events = (eventsQuery.data?.pages ?? []).flatMap((page) => page.items);
  const visibleEvents = activeFilter === "media" ? [] : events;
  const visibleStandalone = activeFilter === "events" ? [] : (standalone.data ?? []);
  const eventsVisible = activeFilter !== "media";
  const standaloneVisible = activeFilter !== "events";
  const loading = (eventsVisible && eventsQuery.isLoading) || (standaloneVisible && standalone.isLoading);
  const failed = (eventsVisible && eventsQuery.isError) || (standaloneVisible && standalone.isError);
  const refreshing = (eventsVisible && eventsQuery.isFetching) || (standaloneVisible && standalone.isFetching);
  const retryFeed = () => {
    if (eventsVisible) void eventsQuery.refetch();
    if (standaloneVisible) void standalone.refetch();
  };

  return <PublicShell>
    <main className="mx-auto w-full max-w-[640px] px-3 py-2 md:px-4 md:py-4">
      <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {(["all", "events", "media"] as const).map((filter) => (
          <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", activeFilter === filter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {filter === "all" ? "Барлығы" : filter === "events" ? "Іс-шаралар" : "Фото/Видео"}
          </button>
        ))}
      </div>
      {!online ? <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive"><WifiOff className="size-4" /> Интернет байланысы жоқ</div> : null}
      {loading ? <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">Лента жүктелуде...</div> : null}
      {failed ? <div role="alert" className="mb-3 space-y-3 rounded-2xl border border-destructive/30 bg-card p-6 text-center text-sm">
        <p>Лентаны жүктеу мүмкін болмады. Байланысты тексеріп, қайта көріңіз.</p>
        <Button variant="outline" disabled={refreshing} onClick={retryFeed}>{refreshing ? "Жүктелуде..." : "Қайта жүктеу"}</Button>
      </div> : null}
      <div className="space-y-3">
        {visibleEvents.map((event) => <article key={event.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
          <Link to="/orgs/$organizationId" params={{ organizationId: event.organization.id }} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar className="size-10 shrink-0"><AvatarImage src={event.organization.avatar_url ?? undefined} alt={event.organization.name} /><AvatarFallback>{initials(event.organization.name)}</AvatarFallback></Avatar>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold leading-tight">{event.organization.name}</strong><span className="block truncate text-[11px] text-muted-foreground">{event.organization.locality ?? "Павлодар облысы"} · {formatPublished(event.published_at)}</span></span>
          </Link>
          {event.media.length > 1 ? <Carousel opts={{ loop: false }} className="group"><CarouselContent className="ml-0">{event.media.map((media) => <CarouselItem key={media.id} className="pl-0"><FeedMedia media={media} /></CarouselItem>)}</CarouselContent><CarouselPrevious className="left-3 hidden size-10 border-0 bg-background/90 group-hover:flex" /><CarouselNext className="right-3 hidden size-10 border-0 bg-background/90 group-hover:flex" /><span className="absolute right-3 top-3 rounded-full bg-foreground/75 px-2 py-0.5 text-[11px] text-background">{event.media.length} фото/видео</span></Carousel> : event.media[0] ? <FeedMedia media={event.media[0]} /> : null}
          <div className="space-y-1.5 px-3 py-3"><p className="text-[11px] font-medium text-primary">Шаңырақпен бірлескен жарияланым</p><h2 className="text-[15px] font-semibold leading-snug">{event.title}</h2>{event.description ? <ExpandableText>{event.description}</ExpandableText> : null}<div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{event.event_date}{event.event_time ? ` · ${event.event_time.slice(0,5)}` : ""}</span>{event.location ? <span className="flex items-center gap-1"><MapPin className="size-3.5" />{event.location}</span> : null}</div></div>
          <PostEngagement publicationType="event" publicationId={event.id} />
        </article>)}
        {visibleStandalone.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft"><Link to="/orgs/$organizationId" params={{ organizationId: item.organization.id }} className="flex items-center gap-3 px-3 py-2.5"><Avatar className="size-10 shrink-0"><AvatarImage src={item.organization.avatar_url ?? undefined} alt={item.organization.name} /><AvatarFallback>{initials(item.organization.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold leading-tight">{item.organization.name}</strong><span className="block text-[11px] text-muted-foreground">{item.organization.locality ?? "Павлодар облысы"} · {formatPublished(item.created_at)}</span></span></Link><FeedMedia media={{ id: item.id, title: item.title, media_kind: item.media_kind, url: item.url, thumbnail_url: item.thumbnail_url }} /><div className="space-y-1.5 px-3 py-3"><p className="text-[11px] font-medium text-primary">Шаңырақпен бірлескен жарияланым</p><h2 className="text-[15px] font-semibold leading-snug">{item.title}</h2>{item.description ? <ExpandableText>{item.description}</ExpandableText> : null}</div><PostEngagement publicationType="media_item" publicationId={item.id} /></article>)}
      </div>
      {!loading && !failed && visibleEvents.length === 0 && visibleStandalone.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Жарияланған материалдар әзірге жоқ.</div> : null}
      {activeFilter !== "media" && eventsQuery.hasNextPage ? <Button variant="outline" className="mt-3 min-h-11 w-full rounded-xl" disabled={eventsQuery.isFetchingNextPage} onClick={() => void eventsQuery.fetchNextPage()}>{eventsQuery.isFetchingNextPage ? "Жүктелуде..." : <><ChevronDown /> Тағы көрсету</>}</Button> : null}
    </main>
  </PublicShell>;
}

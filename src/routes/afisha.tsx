import { createFileRoute } from "@tanstack/react-router";

import { PublicFeedPage } from "@/components/feed/PublicFeedPage";

export const Route = createFileRoute("/afisha")({
  head: () => ({
    meta: [
      { title: "Іс-шаралар — Шаңырақ" },
      { name: "description", content: "Павлодар облысы мәдениет ұйымдарының жарияланған іс-шаралары." },
      { property: "og:title", content: "Іс-шаралар — Шаңырақ" },
      { property: "og:description", content: "Павлодар облысы мәдениет ұйымдарының жарияланған іс-шаралары." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PublicFeedPage initialFilter="events" />,
});

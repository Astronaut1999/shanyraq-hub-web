import { createFileRoute } from "@tanstack/react-router";

import { PublicFeedPage } from "@/components/feed/PublicFeedPage";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Ашық лента — Шаңырақ" },
      { name: "description", content: "Павлодар облысының мақұлданған мәдени жарияланымдары." },
      { property: "og:title", content: "Ашық лента — Шаңырақ" },
      { property: "og:description", content: "Павлодар облысының мақұлданған мәдени жарияланымдары." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicFeedPage,
});
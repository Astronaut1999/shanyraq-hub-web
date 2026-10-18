import { createFileRoute } from "@tanstack/react-router";

import { PublicFeedPage } from "@/components/feed/PublicFeedPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лента — Шаңырақ" },
      { name: "description", content: "Павлодар облысының мақұлданған мәдени жаңалықтары мен іс-шаралары." },
      { property: "og:title", content: "Лента — Шаңырақ" },
      { property: "og:description", content: "Павлодар облысының мақұлданған мәдени жаңалықтары мен іс-шаралары." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicFeedPage,
});
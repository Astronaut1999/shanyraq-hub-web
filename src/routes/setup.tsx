import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { bootstrapSuperAdmin, isPlatformInitialized } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Бастапқы баптау — Шаңырақ" },
      { name: "description", content: "Орталық әкімшілік есептік жазбасын бір рет құру." },
      { property: "og:title", content: "Бастапқы баптау — Шаңырақ" },
      { property: "og:description", content: "Орталық әкімшілік есептік жазбасын бір рет құру." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const checkInit = useServerFn(isPlatformInitialized);
  const bootstrap = useServerFn(bootstrapSuperAdmin);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", setup_token: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["platform-initialized"],
    queryFn: () => checkInit({}),
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: () => bootstrap({ data: form }),
    onSuccess: () => navigate({ to: "/login", replace: true }),
    onError: () => setError("Құру сәтсіз аяқталды немесе жүйе бұрын бапталған."),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
        <p className="text-sm text-sidebar-foreground">Жүйе күйі тексерілуде…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
        <div className="w-full max-w-sm rounded-lg bg-card p-8 text-center shadow-lg">
          <h1 className="text-lg font-semibold">Баптау бетін ашу мүмкін болмады</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Байланысты қайта тексеріп көріңіз.
          </p>
          <Button className="mt-5 w-full" onClick={() => void refetch()}>
            Қайта тексеру
          </Button>
        </div>
      </div>
    );
  }

  if (data?.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
        <div className="w-full max-w-sm rounded-lg bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Жүйе бапталған. Кіру бетіне өтіңіз.
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate({ to: "/login" })}>
            Кіру
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-8 shadow-lg">
        <h1 className="text-lg font-semibold">Орталық әкімшілік құру</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Бұл бет тек бір рет жұмыс істейді.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="setup_token">Орнатудың құпия коды (Cloudflare)</Label>
            <Input
              id="setup_token"
              type="password"
              autoComplete="off"
              value={form.setup_token}
              onChange={(e) => setForm({ ...form, setup_token: e.target.value })}
              minLength={16}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Аты-жөні</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Электрондық пошта</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Құпия сөз</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Құрылуда…" : "Құру"}
          </Button>
        </form>
      </div>
    </div>
  );
}

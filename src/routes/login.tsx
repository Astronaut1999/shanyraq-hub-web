import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Жүйеге кіру — Шаңырақ" },
      { name: "description", content: "Мәдениет орталықтары платформасына кіру." },
      { property: "og:title", content: "Жүйеге кіру — Шаңырақ" },
      { property: "og:description", content: "Мәдениет орталықтары платформасына кіру." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Кіру деректері дұрыс емес.");
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-lg">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Шаңырақ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Павлодар облысы мәдениет орталықтарының платформасы
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Электрондық пошта</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Құпия сөз</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Кіруде..." : "Кіру"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          Тіркелу жабық. Есептік жазбаны орталық әкімшілік (Шаңырақ) береді.
        </p>
      </div>
    </div>
  );
}

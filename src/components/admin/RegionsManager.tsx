import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteRegion, listRegions, saveRegion, type Region } from "@/lib/regions";

/** Central-admin-only list of districts/cities with inline add, rename and delete. */
export function RegionsManager() {
  const queryClient = useQueryClient();
  const regions = useQuery({ queryKey: ["regions"], queryFn: listRegions });
  const [editing, setEditing] = useState<Partial<Region> | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["regions"] });
    void queryClient.invalidateQueries({ queryKey: ["public-regions"] });
  };
  const save = useMutation({
    mutationFn: () => saveRegion({
      id: editing?.id,
      name: (editing?.name ?? "").trim(),
      kind: editing?.kind ?? "district",
      sort_order: editing?.sort_order ?? (regions.data?.length ?? 0) + 1,
    }),
    onSuccess: () => { refresh(); setEditing(null); toast.success("Сақталды"); },
    onError: () => toast.error("Сақтау сәтсіз аяқталды"),
  });
  const remove = useMutation({
    mutationFn: deleteRegion,
    onSuccess: () => { refresh(); toast.success("Өшірілді"); },
    onError: () => toast.error("Өшіру сәтсіз аяқталды"),
  });

  return (
    <Card className="mt-6">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Аудандар мен қалалар</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditing({ kind: "district", name: "" })}><Plus /> Қосу</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {editing ? (
          <form className="flex flex-wrap gap-2 rounded-xl bg-secondary p-3" onSubmit={(event) => { event.preventDefault(); if (editing.name?.trim()) save.mutate(); }}>
            <Input className="min-w-0 flex-1" value={editing.name ?? ""} placeholder="Атауы" onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus />
            <Select value={editing.kind ?? "district"} onValueChange={(value) => setEditing({ ...editing, kind: value as Region["kind"] })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="city">Қала</SelectItem><SelectItem value="district">Аудан</SelectItem></SelectContent>
            </Select>
            <Button type="submit" disabled={save.isPending}>Сақтау</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Бас тарту</Button>
          </form>
        ) : null}
        {(regions.data ?? []).map((region) => (
          <div key={region.id} className="flex min-h-11 items-center gap-2 border-b py-1 text-sm last:border-0">
            <span className="min-w-0 flex-1 font-medium">{region.name}</span>
            <span className="text-xs text-muted-foreground">{region.kind === "city" ? "Қала" : "Аудан"}</span>
            <Button size="icon" variant="ghost" aria-label="Өңдеу" onClick={() => setEditing(region)}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label="Өшіру" onClick={() => { if (window.confirm(`«${region.name}» өшірілсін бе? Ұйымдар сақталады, тек аудан байланысы алынады.`)) remove.mutate(region.id); }}><Trash2 /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

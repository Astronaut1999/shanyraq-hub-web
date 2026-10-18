import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { updateOrganization, uploadOrganizationImage } from "@/lib/organizations";
import { deleteOrganizationIfEmpty, listRegions, ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPES } from "@/lib/regions";
import type { Organization } from "@/lib/types";

const NONE = "none";

export function OrganizationEditDialog({ organization }: { organization: Organization }) {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: organization.name,
    description: organization.description ?? "",
    settlement: organization.settlement ?? organization.locality ?? "",
    address: organization.address ?? "",
    phone: organization.phone ?? "",
    email: organization.email ?? "",
    director_name: organization.director_name ?? "",
    staff_count: organization.staff_count != null ? String(organization.staff_count) : "",
    source_url: organization.source_url ?? "",
    region_id: organization.region_id ?? NONE,
    organization_type: organization.organization_type ?? NONE,
    verified: !!organization.verified_at,
  });
  const regions = useQuery({ queryKey: ["regions"], queryFn: listRegions, enabled: open });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    void queryClient.invalidateQueries({ queryKey: ["public-organizations"] });
    void queryClient.invalidateQueries({ queryKey: ["public-regions"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const staff = form.staff_count.trim() === "" ? null : Number(form.staff_count);
      if (staff !== null && (!Number.isInteger(staff) || staff < 0)) throw new Error("Қызметкер саны бүтін сан болуы керек.");
      const avatarPath = avatar ? await uploadOrganizationImage(organization.id, "avatar", avatar) : organization.avatar_path;
      const coverPath = cover ? await uploadOrganizationImage(organization.id, "cover", cover) : organization.cover_path;
      const orNull = (value: string) => value.trim() || null;
      return updateOrganization(organization.id, {
        name: form.name.trim(),
        description: orNull(form.description),
        settlement: orNull(form.settlement),
        locality: orNull(form.settlement),
        address: orNull(form.address),
        phone: orNull(form.phone),
        email: orNull(form.email),
        director_name: orNull(form.director_name),
        staff_count: staff,
        source_url: orNull(form.source_url),
        avatar_path: avatarPath,
        cover_path: coverPath,
        ...(isSuperAdmin
          ? {
              region_id: form.region_id === NONE ? null : form.region_id,
              organization_type: form.organization_type === NONE ? null : (form.organization_type as Exclude<Organization["organization_type"], undefined>),
              verified_at: form.verified ? (organization.verified_at ?? new Date().toISOString()) : null,
            }
          : {}),
      });
    },
    onSuccess: () => { refresh(); toast.success("Сақталды"); setOpen(false); },
    onError: (error: Error) => toast.error(error.message || "Сақтау сәтсіз аяқталды"),
  });

  const remove = useMutation({
    mutationFn: () => deleteOrganizationIfEmpty(organization.id),
    onSuccess: () => { refresh(); toast.success("Ұйым өшірілді"); setOpen(false); },
    onError: (error: Error) => toast.error(error.message),
  });

  const id = (name: string) => `${name}-${organization.id}`;
  const regionName = regions.data?.find((region) => region.id === organization.region_id)?.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="min-h-10">Профильді өңдеу</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{organization.name}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          <Field label="Ресми атауы" htmlFor={id("name")}><Input id={id("name")} value={form.name} onChange={set("name")} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Аудан / қала" htmlFor={id("region")}>
              {isSuperAdmin ? (
                <Select value={form.region_id} onValueChange={(value) => setForm({ ...form, region_id: value })}>
                  <SelectTrigger id={id("region")}><SelectValue placeholder="Таңдаңыз" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Көрсетілмеген</SelectItem>
                    {(regions.data ?? []).map((region) => <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Input id={id("region")} value={regionName ?? "Көрсетілмеген"} disabled />}
            </Field>
            <Field label="Ұйым түрі" htmlFor={id("type")}>
              <Select value={form.organization_type} onValueChange={(value) => setForm({ ...form, organization_type: value })} disabled={!isSuperAdmin}>
                <SelectTrigger id={id("type")}><SelectValue placeholder="Таңдаңыз" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Көрсетілмеген</SelectItem>
                  {ORGANIZATION_TYPES.map((type) => <SelectItem key={type} value={type}>{ORGANIZATION_TYPE_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Елді мекен" htmlFor={id("settlement")}><Input id={id("settlement")} value={form.settlement} onChange={set("settlement")} /></Field>
            <Field label="Мекенжай" htmlFor={id("address")}><Input id={id("address")} value={form.address} onChange={set("address")} /></Field>
            <Field label="Басшысы" htmlFor={id("director")}><Input id={id("director")} value={form.director_name} onChange={set("director_name")} /></Field>
            <Field label="Қызметкер саны" htmlFor={id("staff")}><Input id={id("staff")} type="number" min={0} inputMode="numeric" value={form.staff_count} onChange={set("staff_count")} /></Field>
            <Field label="Телефон" htmlFor={id("phone")}><Input id={id("phone")} value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Пошта" htmlFor={id("email")}><Input id={id("email")} type="email" value={form.email} onChange={set("email")} /></Field>
          </div>
          <Field label="Сипаттама" htmlFor={id("description")}><Textarea id={id("description")} value={form.description} onChange={set("description")} /></Field>
          <Field label="Дереккөз сілтемесі" htmlFor={id("source")}><Input id={id("source")} type="url" placeholder="https://" value={form.source_url} onChange={set("source_url")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ғимарат / мұқаба суреті" htmlFor={id("cover")}><Input id={id("cover")} type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /></Field>
            <Field label="Логотип" htmlFor={id("avatar")}><Input id={id("avatar")} type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></Field>
          </div>
          {isSuperAdmin ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox checked={form.verified} onCheckedChange={(value) => setForm({ ...form, verified: value === true })} />
              Ақпарат тексерілді
            </label>
          ) : null}
          <Button type="submit" className="w-full" disabled={save.isPending}>Сақтау</Button>
          {isSuperAdmin ? (
            <Button type="button" variant="ghost" className="w-full text-destructive" disabled={remove.isPending}
              onClick={() => { if (window.confirm("Ұйымды өшіруге сенімдісіз бе?")) remove.mutate(); }}>
              Ұйымды өшіру
            </Button>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

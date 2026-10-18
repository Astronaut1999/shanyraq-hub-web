import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  createOrganization,
  listOrganizations,
  uploadOrganizationImage,
  updateOrganization,
} from "@/lib/organizations";
import { createOrganizationAdmin } from "@/lib/admin.functions";
import { OrganizationEditDialog } from "@/components/admin/OrganizationEditDialog";
import { RegionsManager } from "@/components/admin/RegionsManager";
import { DemoDataActions } from "@/components/admin/DemoDataActions";
import type { Organization } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/organizations")({
  head: () => ({
    meta: [
      { title: "Ұйымдар — Шаңырақ" },
      { name: "description", content: "Мәдениет орталықтары мен клубтарын басқару." },
      { property: "og:title", content: "Ұйымдар — Шаңырақ" },
      { property: "og:description", content: "Мәдениет орталықтары мен клубтарын басқару." },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { isSuperAdmin, organization, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    enabled: isSuperAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: (org: Organization) =>
      updateOrganization(org.id, { status: org.status === "active" ? "inactive" : "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Ұйым мәртебесі жаңартылды");
    },
    onError: () => toast.error("Өзгерту сәтсіз аяқталды"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Ұйым" description="Сіздің ұйымыңыздың ақпараты" />
        <Card>
          <CardHeader>
            <CardTitle>{organization?.name ?? "Ұйым тағайындалмаған"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{organization?.description}</p>
            <p>{organization?.locality}</p>
            <p>{organization?.address}</p>
            <p>{organization?.phone}</p>
            <p>{organization?.email}</p>
            {organization ? <OrganizationEditDialog organization={organization} /> : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ұйымдар"
        description="Мәдениет орталықтары мен клубтарының тізімі"
        actions={
          <div className="flex flex-wrap gap-2">
            <DemoDataActions />
            <CreateOrganizationDialog />
          </div>
        }
      />

      {/* Mobile: readable cards. Desktop: table. */}
      <div className="grid gap-3 md:hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Жүктелуде...</p>
        ) : (organizations?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Ұйымдар әзірге жоқ.</p>
        ) : (
          organizations!.map((org) => (
            <article key={org.id} className="rounded-lg border border-border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="min-w-0 break-words font-semibold leading-snug">{org.name}</h2>
                <Badge variant={org.status === "active" ? "default" : "secondary"} className="shrink-0">
                  {org.status === "active" ? "Белсенді" : "Белсенді емес"}
                </Badge>
              </div>
              <p className="mt-2 break-words text-sm text-muted-foreground">{org.locality ?? org.address ?? "—"}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">{org.phone ?? "—"} · {org.email ?? "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CreateAdminDialog organization={org} />
                <OrganizationEditDialog organization={org} />
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  onClick={() => toggleStatus.mutate(org)}
                  disabled={toggleStatus.isPending}
                >
                  {org.status === "active" ? "Тоқтату" : "Қосу"}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Атауы</TableHead>
              <TableHead>Байланыс</TableHead>
              <TableHead>Мәртебесі</TableHead>
              <TableHead className="text-right">Әрекеттер</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Жүктелуде...
                </TableCell>
              </TableRow>
            ) : (organizations?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Ұйымдар әзірге жоқ.
                </TableCell>
              </TableRow>
            ) : (
              organizations!.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.phone ?? "—"} · {org.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.status === "active" ? "default" : "secondary"}>
                      {org.status === "active" ? "Белсенді" : "Белсенді емес"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <CreateAdminDialog organization={org} />
                    <OrganizationEditDialog organization={org} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus.mutate(org)}
                      disabled={toggleStatus.isPending}
                    >
                      {org.status === "active" ? "Тоқтату" : "Қосу"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <RegionsManager />
    </div>
  );
}

function CreateOrganizationDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  const mutation = useMutation({
    mutationFn: () => createOrganization(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setForm({ name: "", description: "", address: "", phone: "", email: "" });
      setOpen(false);
      toast.success("Ұйым құрылды");
    },
    onError: () => toast.error("Ұйым құру сәтсіз аяқталды"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ұйым қосу</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаңа ұйым</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Атауы</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Сипаттамасы</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Пошта</Label>
              <Input
                id="org-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Мекенжайы</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Сақтау
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateAdminDialog({ organization }: { organization: Organization }) {
  const createAdmin = useServerFn(createOrganizationAdmin);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const mutation = useMutation({
    mutationFn: () =>
      createAdmin({ data: { ...form, organization_id: organization.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["administrators-count"] });
      setForm({ full_name: "", email: "", password: "" });
      setOpen(false);
      toast.success("Әкімші есептік жазбасы құрылды");
    },
    onError: () => toast.error("Есептік жазба құру сәтсіз аяқталды"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Әкімші қосу
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{organization.name} — әкімші құру</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="admin-name">Аты-жөні</Label>
            <Input
              id="admin-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Электрондық пошта</Label>
            <Input
              id="admin-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Құпия сөз</Label>
            <Input
              id="admin-password"
              type="text"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Құру
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { cleanupDemoData, seedDemoData, type DemoCredential } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DemoDataActions() {
  const queryClient = useQueryClient();
  const seed = useServerFn(seedDemoData);
  const cleanup = useServerFn(cleanupDemoData);
  const [credentials, setCredentials] = useState<DemoCredential[] | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    queryClient.invalidateQueries({ queryKey: ["administrators-count"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["media"] });
    queryClient.invalidateQueries({ queryKey: ["pending-media"] });
  };

  const seedMutation = useMutation({
    mutationFn: () => seed({}),
    onSuccess: (result) => {
      invalidate();
      setCredentials(result.credentials);
      toast.success(
        `Демо деректер дайын: ${result.created.length} жаңа, ${result.reused.length} бұрыннан бар`,
      );
    },
    onError: (error: Error) =>
      toast.error(`Демо деректерді дайындау сәтсіз: ${error.message}`),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => cleanup({}),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.removed.length > 0
          ? `Тазаланды: ${result.removed.join(", ")}`
          : "Тазалайтын демо дерек табылмады",
      );
    },
    onError: (error: Error) => toast.error(`Тазалау сәтсіз: ${error.message}`),
  });

  const download = () => {
    if (!credentials) return;
    const lines = [
      "Шаңырақ — демо есептік жазбалар",
      `Құрылған уақыты: ${new Date().toLocaleString("kk-KZ")}`,
      "",
      ...credentials.flatMap((c) => [
        c.organization,
        `  Пошта: ${c.email}`,
        `  Құпия сөз: ${c.password}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shanyraq-demo-credentials.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={seedMutation.isPending}>
            {seedMutation.isPending ? "Дайындалуда…" : "Демо деректерді дайындау"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Демо деректерді дайындау</AlertDialogTitle>
            <AlertDialogDescription>
              Екі ДЕМО ұйым, үш демо әкімші, жоспарлар, іс-шаралар және медиа құрылады. Бар
              деректер қайталанбайды, нақты деректер өшірілмейді. Демо әкімшілердің құпия сөздері
              жаңартылады.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болдырмау</AlertDialogCancel>
            <AlertDialogAction onClick={() => seedMutation.mutate()}>Дайындау</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={cleanupMutation.isPending}>
            {cleanupMutation.isPending ? "Тазалануда…" : "Демо деректерді тазалау"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Демо деректерді тазалау</AlertDialogTitle>
            <AlertDialogDescription>
              Тек демо белгісі бар жазбалар өшіріледі: екі ДЕМО ұйым, үш демо әкімші және олардың
              демо жоспарлары, іс-шаралары мен медиасы. Естай атындағы мәдениет сарайы және нақты
              деректер сақталады.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болдырмау</AlertDialogCancel>
            <AlertDialogAction onClick={() => cleanupMutation.mutate()}>Тазалау</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Демо есептік жазбалар</DialogTitle>
            <DialogDescription>
              Құпия сөздер тек осы жерде бір рет көрсетіледі және ешқайда сақталмайды.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(credentials ?? []).map((c) => (
              <div key={c.email} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{c.organization}</p>
                <p className="text-muted-foreground">{c.email}</p>
                <p className="font-mono text-foreground">{c.password}</p>
              </div>
            ))}
          </div>
          <Button onClick={download}>Демо кіру деректерін жүктеп алу</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

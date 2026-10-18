import { formatDateTime } from "@/lib/format-date";
import type { AnalyticsResult } from "./analytics.functions";
import { PLAN_ITEM_STATUS_LABELS, MONTH_NAMES } from "./plan-items";
import { buildXlsx, downloadBlob, type CellValue } from "./xlsx";

export const COMPLETION_FORMULA =
  "Орындалу пайызы = расталған тармақтар / (барлық тармақтар − тоқтатылғандар) × 100. Бөлгіш 0 болса «—» көрсетіледі.";

function periodLabel(result: AnalyticsResult): string {
  return result.filters.month
    ? `${MONTH_NAMES[result.filters.month - 1]} ${result.filters.year}`
    : `${result.filters.year} жыл`;
}

function planTypeLabel(type: "all" | "annual" | "monthly"): string {
  return type === "all" ? "Барлығы" : type === "annual" ? "Жылдық" : "Айлық";
}

function scopeLabel(result: AnalyticsResult): string {
  if (result.scope === "all") return "Барлық белсенді ұйымдар";
  return result.organizations[0]?.organization_name ?? "Таңдалған ұйым";
}

function rateLabel(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

/** Same numbers as the screen: built from the server analytics result only. */
export function buildReportTable(result: AnalyticsResult): CellValue[][] {
  const rows: CellValue[][] = [
    ["Шаңырақ / Pavlodar Hub — жоспарлардың орындалуы туралы есеп"],
    ["Ұйым(дар)", scopeLabel(result)],
    ["Есептік кезең", periodLabel(result)],
    ["Кезең аралығы", `${result.periodStart} — ${result.periodEnd}`],
    ["Жоспар түрі", planTypeLabel(result.filters.planType)],
    ["Демо деректер", result.filters.includeDemo ? "Қосылған" : "Қосылмаған"],
    ["Есеп жасалған уақыты", formatDateTime(result.generatedAt)],
    [],
    ["Жиынтық көрсеткіштер"],
    ["Жоспарланған тармақтар", result.totals.plannedTotal],
    ["Есепке алынатын тармақтар (тоқтатылғансыз)", result.totals.eligible],
    ["Орындалуы расталған", result.totals.completed],
    ["Тексеруді күтуде", result.totals.awaitingReview],
    ["Мерзімі өткен (есеп жіберілмеген)", result.totals.overdueNoSubmission],
    ["Тоқтатылған", result.totals.cancelled],
    ["Жоспардан тыс іс-шаралар", result.totals.unplannedEvents],
    ["Қайталанғаны есептен шығарылды", result.totals.duplicatesExcluded],
    ["Орындалу пайызы", rateLabel(result.totals.completionRate)],
    [COMPLETION_FORMULA],
    [],
    ["Жоспар құжатын тапсыру"],
    ["Белсенді ұйымдар", result.coverage.activeOrganizations],
    ["Құжат тапсырғандар", result.coverage.submitted],
    ["Тапсырмағандар", result.coverage.missing.map((o) => o.name).join("; ") || "—"],
    [],
    ["Ұйымдар бойынша"],
    [
      "Ұйым",
      "Жоспарланған",
      "Расталған",
      "Тексеруде",
      "Мерзімі өткен",
      "Тоқтатылған",
      "Жоспардан тыс",
      "Орындалу %",
      "Құжат",
    ],
  ];

  for (const org of result.organizations) {
    rows.push([
      org.organization_name,
      org.planned,
      org.completed,
      org.awaitingReview,
      org.overdueNoSubmission,
      org.cancelled,
      org.unplannedEvents,
      rateLabel(org.completionRate),
      org.hasPlanDocument ? "Тапсырылған" : "Тапсырылмаған",
    ]);
  }

  rows.push([], ["Жоспар тармақтары"], [
    "Ұйым",
    "Жоспар",
    "Түрі",
    "Тармақ",
    "Жоспарлы күні",
    "Нақты күні",
    "Күйі",
    "Мерзімі өткен",
    "Жауапты",
    "Іс-шара",
    "Ескерту",
  ]);

  for (const row of result.rows) {
    rows.push([
      row.organization_name,
      row.plan_title ?? "—",
      row.plan_type === "annual" ? "Жылдық" : row.plan_type === "monthly" ? "Айлық" : "—",
      row.title,
      row.planned_date,
      row.completed_on ?? "—",
      PLAN_ITEM_STATUS_LABELS[row.status],
      row.overdue ? "Иә" : "Жоқ",
      row.responsible ?? "—",
      row.event_title ?? "—",
      row.duplicate_of ? "Жылдық тармақтың көшірмесі — жиынтықта есептелмеген" : "",
    ]);
  }

  return rows;
}

export function exportAnalyticsXlsx(result: AnalyticsResult): void {
  const rows = buildReportTable(result);
  const name = `shanyraq-esep-${result.filters.year}${result.filters.month ? `-${String(result.filters.month).padStart(2, "0")}` : ""}.xlsx`;
  downloadBlob(buildXlsx("Есеп", rows), name);
}

/**
 * PDF is produced through the browser's own print-to-PDF, which renders Kazakh
 * text with the system font set — no embedded font is required and no signed
 * media URLs are included.
 */
export function exportAnalyticsPdf(result: AnalyticsResult): void {
  const rows = buildReportTable(result);
  const escape = (value: CellValue) =>
    String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = rows
    .map((row) => {
      if (row.length === 0) return '<tr class="spacer"><td colspan="11">&nbsp;</td></tr>';
      if (row.length === 1)
        return `<tr class="section"><td colspan="11">${escape(row[0]!)}</td></tr>`;
      return `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`;
    })
    .join("");

  const win = window.open("", "_blank", "noopener,width=1024,height=768");
  if (!win) throw new Error("Браузер жаңа терезені бөгеді. Рұқсат беріңіз.");
  win.document.write(`<!doctype html><html lang="kk"><head><meta charset="utf-8"><title>Шаңырақ — есеп</title>
<style>
  body { font-family: "Noto Sans", "DejaVu Sans", "Segoe UI", Arial, sans-serif; color:#0b1a33; padding:24px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  td { border:1px solid #d5dbe6; padding:4px 6px; vertical-align:top; }
  tr.section td { background:#0b1a33; color:#fff; font-weight:600; border:none; }
  tr.spacer td { border:none; }
  @page { size: A4 landscape; margin: 12mm; }
</style></head><body><table>${html}</table>
<script>window.onload = function(){ window.print(); };<\/script>
</body></html>`);
  win.document.close();
}

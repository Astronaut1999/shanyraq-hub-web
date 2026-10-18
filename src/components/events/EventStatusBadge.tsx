import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_LABELS } from "@/lib/events";
import type { EventStatus } from "@/lib/types";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  if (status === "approved") return <Badge>{EVENT_STATUS_LABELS.approved}</Badge>;
  if (status === "rejected")
    return <Badge variant="destructive">{EVENT_STATUS_LABELS.rejected}</Badge>;
  if (status === "pending") return <Badge variant="secondary">{EVENT_STATUS_LABELS.pending}</Badge>;
  return <Badge variant="outline">{EVENT_STATUS_LABELS.draft}</Badge>;
}

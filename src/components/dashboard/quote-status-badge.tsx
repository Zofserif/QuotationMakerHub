import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/quotes/quote-state";
import type { QuoteStatus } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<QuoteStatus, string> = {
  draft: "border-zinc-200 bg-zinc-50 text-zinc-700",
  sent: "border-blue-200 bg-blue-50 text-blue-800",
  viewed: "border-cyan-200 bg-cyan-50 text-cyan-800",
  partially_signed: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  expired: "border-stone-300 bg-stone-100 text-stone-700",
  locked: "border-emerald-300 bg-emerald-100 text-emerald-900",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge className={cn("whitespace-nowrap", statusClasses[status])}>
      {statusLabel(status)}
    </Badge>
  );
}

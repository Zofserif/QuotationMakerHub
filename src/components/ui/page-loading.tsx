import { cn } from "@/lib/utils";

type PageLoadingProps = {
  variant: "page" | "screen";
  label?: string;
};

const variantClasses = {
  page: "min-h-[60vh] px-4 py-10",
  screen: "min-h-screen px-6 py-10",
} as const;

export function PageLoading({
  variant,
  label = "Loading...",
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variantClasses[variant],
      )}
    >
      <div
        aria-label={label}
        aria-live="polite"
        className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-white/90 px-8 py-7 text-center shadow-sm backdrop-blur-sm"
        role="status"
      >
        <span
          aria-hidden="true"
          className="size-10 animate-spin rounded-full border-[3px] border-stone-200 border-t-stone-900"
        />
        <p className="text-sm font-semibold text-stone-950">{label}</p>
      </div>
    </div>
  );
}

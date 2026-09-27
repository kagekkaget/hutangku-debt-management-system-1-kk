import { cn } from "@/lib/utils";

export function Logo({ light, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl shadow-md",
          light ? "bg-white/15 ring-1 ring-white/30" : "bg-gradient-to-br from-emerald-500 to-teal-600",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 7l1.5 12h13L20 7M4 7l2-3h12l2 3" />
          <path strokeLinecap="round" d="M9 12h6M9 15.5h4" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-slate-900")}>
            Hutang<span className={light ? "text-emerald-300" : "text-emerald-600"}>Ku</span>
          </div>
          <div className={cn("text-[10px] font-medium uppercase tracking-wider", light ? "text-emerald-200" : "text-slate-400")}>
            Pencatat Piutang Warung
          </div>
        </div>
      )}
    </div>
  );
}

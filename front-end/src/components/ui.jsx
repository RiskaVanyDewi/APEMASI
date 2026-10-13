export function cn(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function Card({ className = "", ...props }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)} {...props} />;
}
export function CardHeader({ className = "", ...props }) {
  return <div className={cn("px-4 pt-4", className)} {...props} />;
}
export function CardContent({ className = "", ...props }) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}

export function Button({ className = "", variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98]";
  const styles = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button className={cn(base, styles[variant], className)} {...props} />;
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200",
          className
        )}
        {...props}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function Badge({ className = "", tone = "neutral", ...props }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    info: "bg-blue-100 text-blue-700",
    ok: "bg-green-100 text-green-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-semibold", tones[tone], className)} {...props} />;
}


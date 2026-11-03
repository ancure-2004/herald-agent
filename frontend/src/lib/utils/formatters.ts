export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeString(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return dateStr;
  }
}

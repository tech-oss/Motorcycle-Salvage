import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  // en-GB gives the DD/MM/YYYY ordering used throughout the client's paperwork
  // (en-ZA resolves to YYYY/MM/DD in Node's ICU data).
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * "Triumph 800 XC 2012", degrading gracefully when the importer left fields
 * blank — an em dash beats rendering "null null".
 */
export function describeBike(bike: {
  make?: string | null
  model?: string | null
  year?: number | null
}) {
  const parts = [bike.make, bike.model, bike.year].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`
}

export function formatCurrencyZAR(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value)
}

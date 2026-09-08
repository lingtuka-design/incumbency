import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSuperannuationInput(val: string, prevVal = ""): string {
  if (!val) return ""

  // If user hit backspace on a hyphen
  if (prevVal.length > val.length && prevVal.endsWith("-") && !val.endsWith("-")) {
    return val.slice(0, -1)
  }

  // If user explicitly typed a separator like 31- or 31/ or 31.
  if (val.includes("-") || val.includes("/") || val.includes(".")) {
    const parts = val.split(/[-/.]/)
    if (parts.length > 1) {
      const p0 = parts[0].replace(/\D/g, "").slice(0, 2)
      const p1 = parts[1].replace(/\D/g, "").slice(0, 2)
      const p2 = parts.slice(2).join("").replace(/\D/g, "").slice(0, 4)

      let res = p0
      if (parts.length > 1 && (p1 || val.endsWith("-") || val.endsWith("/") || val.endsWith("."))) {
        res += "-" + p1
      }
      if (parts.length > 2 && (p2 || (parts[1] && (val.endsWith("-") || val.endsWith("/"))))) {
        res += "-" + p2
      }
      return res
    }
  }

  // Pure digits auto-formatting: DD -> DD-MM -> DD-MM-YYYY
  const cleaned = val.replace(/\D/g, "").slice(0, 8)
  if (cleaned.length <= 2) {
    return cleaned
  }
  if (cleaned.length <= 4) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`
}

export function normalizeSuperannuationOnBlur(val: string): string {
  if (!val) return ""
  const trimmed = val.trim()
  const parts = trimmed.split(/[-/.]/).map((p) => p.trim()).filter(Boolean)

  if (parts.length === 3) {
    let [d, m, y] = parts
    const numD = parseInt(d, 10)
    const numM = parseInt(m, 10)

    if (!isNaN(numD) && !isNaN(numM)) {
      d = String(Math.min(31, Math.max(1, numD))).padStart(2, "0")
      m = String(Math.min(12, Math.max(1, numM))).padStart(2, "0")
    } else {
      d = d.padStart(2, "0")
      m = m.padStart(2, "0")
    }

    if (y.length === 2) {
      y = "20" + y
    }
    return `${d}-${m}-${y}`
  }

  // If user typed 8 raw digits without separator e.g. 31032028
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
  }

  return trimmed
}


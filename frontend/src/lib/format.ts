export function inr(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact === false) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  const trim = (s: string) => s.replace(/\.?0+$/, '')
  if (Math.abs(n) >= 1e7) return '₹' + trim((n / 1e7).toFixed(2)) + ' Cr'
  if (Math.abs(n) >= 1e5) return '₹' + trim((n / 1e5).toFixed(2)) + ' L'
  if (Math.abs(n) >= 1e3) return '₹' + trim((n / 1e3).toFixed(1)) + 'k'
  return '₹' + Math.round(n)
}

export function tonnes(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function decimal(n: number, digits = 2): string {
  return n.toFixed(digits)
}

export function pct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%'
}

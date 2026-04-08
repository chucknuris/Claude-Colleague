/**
 * Format a number as USD currency string.
 * @example formatCurrency(47832) => "$47,832.00"
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = '$' + abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format a number with thousands separators.
 * @example formatNumber(77184) => "77,184"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format a duration in milliseconds as "Xh Ym".
 * @example formatDuration(38040000) => "10h 34m"
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format a number as a percentage string with thousands separators.
 * @example formatPercent(5362) => "5,362%"
 */
export function formatPercent(n: number): string {
  return Math.round(n).toLocaleString('en-US') + '%';
}

/**
 * Format a number as a multiplier string.
 * @example formatMultiplier(429) => "429x"
 * @example formatMultiplier(10940) => "10,940x"
 */
export function formatMultiplier(n: number): string {
  return Math.round(n).toLocaleString('en-US') + 'x';
}

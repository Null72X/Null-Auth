/**
 * Normalizes and stores the original raw client machine HWID or Windows User SID directly as requested.
 */
export function hashHwid(rawHwid: string): string {
  return rawHwid ? rawHwid.trim() : '';
}

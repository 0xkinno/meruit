import { base58 } from "@scure/base";
export function isValidAddress(a: string): boolean {
  try { return base58.decode(a).length === 32; } catch { return false; }
}

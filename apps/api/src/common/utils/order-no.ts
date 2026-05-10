import { randomBytes } from 'crypto';

export function generateOrderNo(prefix = 'ORD'): string {
  const ts = Date.now().toString();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${ts}${rand}`;
}

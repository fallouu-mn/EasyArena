import { randomBytes } from 'crypto';

/**
 * Génère un code de réservation unique et non devinable.
 * Format: XXXX-XXXX-XXXX (12 caractères alphanumériques en majuscules, sans ambiguïté)
 * Exclut les caractères ambigus : 0/O, 1/I/L, etc.
 */
export function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans 0, O, 1, I
  const segments = 3;
  const segmentLength = 4;
  const parts: string[] = [];

  for (let i = 0; i < segments; i++) {
    let segment = '';
    const bytes = randomBytes(segmentLength);
    
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[bytes[j] % chars.length];
    }
    
    parts.push(segment);
  }

  return parts.join('-');
}

/**
 * Valide le format d'un code de réservation.
 */
export function isValidBookingCode(code: string): boolean {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code);
}

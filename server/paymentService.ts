import crypto from 'crypto';
import type { PaymentOperator } from '../src/types/folio';

export interface MobilePaymentRequest {
  provider: PaymentOperator;
  phone: string;
  amountMt: number;
  curriculumId: string;
  userId: string;
}

export interface MobilePaymentResult {
  approved: boolean;
  provider: PaymentOperator;
  phoneMasked: string;
  amountMt: number;
  transactionRef: string;
  mode: 'simulation' | 'live';
  error?: string;
}

export function validateMozambiqueMobile(provider: PaymentOperator, rawPhone: string): {
  valid: boolean;
  digits: string;
  error?: string;
} {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length !== 9) {
    return { valid: false, digits, error: 'O número moçambicano deve ter exatamente 9 dígitos.' };
  }
  if (provider === 'mpesa' && !/^8[45]/.test(digits)) {
    return { valid: false, digits, error: 'M-Pesa (Vodacom) exige prefixo 84 ou 85.' };
  }
  if (provider === 'emola' && !/^8[67]/.test(digits)) {
    return { valid: false, digits, error: 'e-Mola (Movitel) exige prefixo 86 ou 87.' };
  }
  return { valid: true, digits };
}

export function maskPhoneNumber(digits: string): string {
  if (digits.length < 9) return '•••';
  return `${digits.slice(0, 2)}••••${digits.slice(-3)}`;
}

/**
 * Isolated Mobile Money payment adapter (M-Pesa / e-Mola).
 * Currently runs in production-ready simulation mode; replace the body below
 * with PaySuite / PagaFácil / Vodacom M-Pesa OpenAPI once merchant keys are active.
 */
export async function processMobilePayment(
  req: MobilePaymentRequest
): Promise<MobilePaymentResult> {
  const validation = validateMozambiqueMobile(req.provider, req.phone);
  if (!validation.valid) {
    return {
      approved: false,
      provider: req.provider,
      phoneMasked: maskPhoneNumber(validation.digits),
      amountMt: req.amountMt,
      transactionRef: '',
      mode: 'simulation',
      error: validation.error,
    };
  }

  const prefix = req.provider === 'mpesa' ? 'MP' : 'EM';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const transactionRef = `FL-${prefix}-${new Date().getFullYear()}-${rand}`;

  return {
    approved: true,
    provider: req.provider,
    phoneMasked: maskPhoneNumber(validation.digits),
    amountMt: Number(req.amountMt.toFixed(2)),
    transactionRef,
    mode: 'simulation',
  };
}

export type PaymentEvidence = { order_id: string; amount: number; currency: string; status: string };

export function matchesPaymentOrder(payment: PaymentEvidence, order: { orderId: string; amount: number; currency: string }) {
  return payment.order_id === order.orderId && payment.amount === order.amount && payment.currency === order.currency;
}

export function isCapturedPayment(payment: PaymentEvidence, order: { orderId: string; amount: number; currency: string }) {
  return payment.status === 'captured' && matchesPaymentOrder(payment, order);
}

export function configuredSecretStatus(value: string | null | undefined) {
  return value ? 'Configured' : null;
}

export function canBypassActivation(isAdmin: boolean, configured: boolean, paymentMode: string) {
  return isAdmin && !configured && paymentMode === 'test_bypass';
}
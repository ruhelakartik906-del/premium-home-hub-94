import { expect, test } from 'bun:test';
import { canBypassActivation, configuredSecretStatus, isCapturedPayment } from '../src/lib/payment-security';

const order = { orderId: 'order_test', amount: 5000000, currency: 'INR' };
const payment = { order_id: 'order_test', amount: 5000000, currency: 'INR', status: 'captured' };

test('only captured payments matching the INR 50,000 order can activate', () => {
  expect(isCapturedPayment(payment, order)).toBe(true);
  expect(isCapturedPayment({ ...payment, status: 'authorized' }, order)).toBe(false);
  expect(isCapturedPayment({ ...payment, status: 'failed' }, order)).toBe(false);
  expect(isCapturedPayment({ ...payment, amount: 1 }, order)).toBe(false);
  expect(isCapturedPayment({ ...payment, currency: 'USD' }, order)).toBe(false);
  expect(isCapturedPayment({ ...payment, order_id: 'another_order' }, order)).toBe(false);
});

test('secret status exposes no part of stored credentials', () => {
  expect(configuredSecretStatus('fake-test-value-1234')).toBe('Configured');
  expect(configuredSecretStatus('different-test-value')).toBe('Configured');
  expect(configuredSecretStatus(null)).toBe(null);
});

test('ordinary buyers and sellers cannot bypass activation payment', () => {
  expect(canBypassActivation(false, false, 'test_bypass')).toBe(false);
  expect(canBypassActivation(true, false, 'test_bypass')).toBe(true);
  expect(canBypassActivation(true, true, 'test_bypass')).toBe(false);
  expect(canBypassActivation(true, false, 'live_required')).toBe(false);
});
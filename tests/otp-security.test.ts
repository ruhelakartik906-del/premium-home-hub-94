import { describe, expect, test } from 'bun:test';
import { deliverOtp, generateOtp, mobileSchema, OTP_SECONDS, RESEND_SECONDS, otpHash } from '../src/lib/otp-security';

describe('Registration OTP rules', () => {
  test('allows Indian national and +91 numbers, rejects foreign prefixes and trailing-number tricks', () => {
    expect(mobileSchema.parse('+91 98765 43210')).toBe('9876543210');
    expect(mobileSchema.parse('9876543210')).toBe('9876543210');
    for (const value of ['+44 9876543210', 'abc9876543210', '001919876543210', '1234567890']) expect(mobileSchema.safeParse(value).success).toBe(false);
  });
  test('generates six numeric digits including valid leading zeroes', () => {
    for (let index = 0; index < 100; index++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  test('expires after five minutes with a sixty-second resend cooldown', () => {
    expect(OTP_SECONDS).toBe(300);
    expect(RESEND_SECONDS).toBe(60);
  });
  test('binds OTP proof to challenge, email and server key', async () => {
    // Ephemeral test-only key; assertions never output hashes or credentials.
    const secret = crypto.randomUUID();
    const hash = await otpHash('challenge', 'buyer@example.invalid', '123456', secret);
    expect(hash === await otpHash('challenge', 'buyer@example.invalid', '123456', secret)).toBe(true);
    expect(hash === await otpHash('challenge', 'seller@example.invalid', '123456', secret)).toBe(false);
    expect(hash === await otpHash('other-challenge', 'buyer@example.invalid', '123456', secret)).toBe(false);
    expect(hash === await otpHash('challenge', 'buyer@example.invalid', '654321', secret)).toBe(false);
  });
  test('sends exact form parameters, without an unconfigured template', async () => {
    const authkey = crypto.randomUUID();
    const fetcher: typeof fetch = async (url, init) => {
      expect(String(url)).toBe('https://apitxt.com/api/sendOTP');
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('Content-Type')).toBe('application/x-www-form-urlencoded');
      const body = new URLSearchParams(String(init?.body));
      expect([...body.keys()].sort()).toEqual(['authkey', 'channel', 'mobile', 'otp']);
      expect(body.get('authkey') === authkey).toBe(true);
      expect(body.get('channel')).toBe('sms');
      expect(body.get('mobile')).toBe('919876543210');
      expect(body.get('otp') === '123456').toBe(true);
      return Response.json({ status: 'success' });
    };
    expect((await deliverOtp({ authkey, mobile: '9876543210', otp: '123456' }, fetcher)).ok).toBe(true);
  });
  test('adds optional template only when configured', async () => {
    const fetcher: typeof fetch = async (_url, init) => {
      expect(new URLSearchParams(String(init?.body)).get('template_id')).toBe('configured-template');
      return Response.json({ status: 'success' });
    };
    expect((await deliverOtp({ authkey: crypto.randomUUID(), mobile: '9876543210', otp: '123456', templateId: 'configured-template' }, fetcher)).ok).toBe(true);
  });
  test('fails closed on rejected, malformed, unsuccessful and timed-out responses', async () => {
    const input = { authkey: crypto.randomUUID(), mobile: '9876543210', otp: '123456' };
    for (const response of [new Response('', { status: 503 }), new Response('invalid-json'), Response.json({ status: 'error' }), Response.json({})]) {
      const result = await deliverOtp(input, async () => response);
      expect(result.ok).toBe(false);
    }
    expect((await deliverOtp(input, async () => { throw new DOMException('Timeout', 'TimeoutError'); })).ok).toBe(false);
  });
});
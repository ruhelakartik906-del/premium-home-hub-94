import { expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

test.skipIf(!url || !key)('database enforces OTP expiry, limits, email binding, resend invalidation and single use', async () => {
  if (!url || !key) return;
  const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  } } });
  const mobile = `otp-test-${crypto.randomUUID()}`;
  const email = 'otp-test@example.invalid';
  const hash = crypto.randomUUID();
  const tokenHash = crypto.randomUUID();
  const reserve = async () => {
    const id = crypto.randomUUID();
    const { data, error } = await client.rpc('reserve_registration_otp', { _id: id, _mobile: mobile, _email: email, _hash: hash });
    expect(error === null).toBe(true);
    return { id, result: data as { ok: boolean; retryAfter?: number } };
  };
  const verify = async (proof = hash, address = email) => {
    const { data, error } = await client.rpc('verify_registration_otp', { _mobile: mobile, _email: address, _hash: proof, _token_hash: tokenHash });
    expect(error === null).toBe(true);
    return data as { ok: boolean; expired?: boolean };
  };
  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await client.from('otp_verifications').update(patch).eq('id', id);
    expect(error === null).toBe(true);
  };
  try {
    const { data: initialized, error: bootstrapError } = await client.rpc('initialize_first_admin', { _user_id: crypto.randomUUID(), _full_name: 'Security regression test', _email: 'bootstrap-test@example.invalid' });
    expect(bootstrapError === null).toBe(true);
    expect(initialized).toBe(false); // Existing administrator prevents any competing setup.
    const first = await reserve();
    expect(first.result.ok).toBe(true);
    expect((await reserve()).result.ok).toBe(false);
    expect((await verify()).ok).toBe(false); // sending is not verified delivery
    await update(first.id, { status: 'pending' });
    expect((await verify(hash, 'other@example.invalid')).ok).toBe(false);
    expect((await verify('incorrect')).ok).toBe(false);
    expect((await verify()).ok).toBe(true);
    expect((await verify()).ok).toBe(false);
    const consume = async () => {
      const { data, error } = await client.rpc('consume_registration_otp', { _mobile: mobile, _email: email, _token_hash: tokenHash });
      expect(error === null).toBe(true);
      return data === true;
    };
    expect(await consume()).toBe(true);
    expect(await consume()).toBe(false);
    await update(first.id, { created_at: new Date(Date.now() - 120000).toISOString() });
    const second = await reserve();
    await update(second.id, { status: 'pending', expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await verify()).expired).toBe(true);
    await update(second.id, { created_at: new Date(Date.now() - 120000).toISOString() });
    const third = await reserve();
    await update(third.id, { status: 'pending' });
    for (let index = 0; index < 5; index++) expect((await verify('incorrect')).ok).toBe(false);
    expect((await verify()).ok).toBe(false);
    await update(third.id, { status: 'pending', created_at: new Date(Date.now() - 120000).toISOString() });
    const fourth = await reserve();
    const { data: old } = await client.from('otp_verifications').select('status').eq('id', third.id).single();
    expect(old?.status).toBe('invalidated');
    await update(fourth.id, { status: 'failed' });
    expect((await verify()).ok).toBe(false);
    console.log('Database OTP expiry, cooldown, five attempts, resend invalidation and single-use proof passed. No SMS sent.');
  } finally {
    const { error } = await client.from('otp_verifications').delete().eq('mobile', mobile);
    expect(error === null).toBe(true);
  }
}, 60000);
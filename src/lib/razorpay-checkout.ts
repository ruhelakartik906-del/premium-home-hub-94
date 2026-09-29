// Browser helper: opens Razorpay Checkout for a server-created order and verifies server-side.
type Order = { keyId: string; orderId: string; amount: number; currency: string; name: string; email: string; mobile: string };
type Result = { status: 'paid' } | { status: 'failed' | 'cancelled'; reason: string };

function loadScript(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  return new Promise((res) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => res(true); s.onerror = () => res(false); document.body.appendChild(s); });
}

export async function runActivationCheckout(
  createOrder: () => Promise<({ ok: true } & Order) | { ok: false; error: string }>,
  verify: (d: { data: { orderId: string; paymentId: string; signature: string } }) => Promise<{ ok: boolean; error?: string }>,
  reportFail: (d: { data: { orderId: string; reason: string } }) => Promise<unknown>,
): Promise<Result> {
  const o = await createOrder();
  if (!o.ok) return { status: 'failed', reason: o.error };
  if (!(await loadScript())) return { status: 'failed', reason: 'Could not load Razorpay. Check your connection and retry.' };
  return new Promise<Result>((resolve) => {
    let done = false;
    const rz = new (window as any).Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency, name: 'Eliteoz', description: 'Membership activation fee',
      prefill: { name: o.name, email: o.email, contact: o.mobile }, theme: { color: '#1f2a24' },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        done = true;
        const v = await verify({ data: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }).catch(() => ({ ok: false, error: 'Verification failed' }));
        resolve(v.ok ? { status: 'paid' } : { status: 'failed', reason: v.error ?? 'Verification failed' });
      },
      modal: { ondismiss: () => { if (done) return; done = true; void reportFail({ data: { orderId: o.orderId, reason: 'Checkout closed by user' } }); resolve({ status: 'cancelled', reason: 'Payment was cancelled. You can retry anytime.' }); } },
    });
    rz.on('payment.failed', (r: any) => { if (done) return; done = true; const reason = r?.error?.description ?? 'Payment failed'; void reportFail({ data: { orderId: o.orderId, reason } }); try { rz.close(); } catch { /* noop */ } resolve({ status: 'failed', reason }); });
    rz.open();
  });
}

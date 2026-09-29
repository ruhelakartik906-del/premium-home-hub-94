import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createActivationOrder, verifyActivationPayment, reportPaymentFailure } from '@/lib/payments.functions';
import { runActivationCheckout } from '@/lib/razorpay-checkout';

export function usePayActivation() {
  const create = useServerFn(createActivationOrder); const verify = useServerFn(verifyActivationPayment); const fail = useServerFn(reportPaymentFailure);
  return () => runActivationCheckout(() => create(), verify, fail);
}

export function ActivationBanner() {
  const pay = usePayActivation(); const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  return <div className="alert-band danger"><LockKeyhole size={18} /><div><strong>Activation payment pending.</strong> Your account opens once the membership fee is paid and confirmed by Razorpay.</div>
    <Button size="sm" disabled={busy} onClick={async () => {
      setBusy(true); const r = await pay(); setBusy(false);
      if (r.status === 'paid') { toast.success('Payment confirmed — your account is active'); qc.invalidateQueries(); } else toast.error(r.reason);
    }}><Wallet /> {busy ? 'Processing…' : 'Pay now'}</Button></div>;
}

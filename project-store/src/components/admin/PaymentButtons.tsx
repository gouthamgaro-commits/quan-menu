import { Check, X } from "lucide-react";
import { decidePaymentAction } from "@/app/admin/actions";

/** “Received” / “Not received” for a payment the student reported. Check your bank or UPI app first. */
export default function PaymentButtons({ paymentId, orderId }: { paymentId: number; orderId: number }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <form action={decidePaymentAction} className="inline-form">
        <input type="hidden" name="payment" value={paymentId} />
        <input type="hidden" name="order" value={orderId} />
        <input type="hidden" name="verdict" value="yes" />
        <button className="btn btn-sm btn-primary" type="submit">
          <Check size={15} aria-hidden /> Received
        </button>
      </form>
      <form action={decidePaymentAction} className="inline-form">
        <input type="hidden" name="payment" value={paymentId} />
        <input type="hidden" name="order" value={orderId} />
        <input type="hidden" name="verdict" value="no" />
        <button className="btn btn-sm btn-danger" type="submit">
          <X size={15} aria-hidden /> Not received
        </button>
      </form>
    </span>
  );
}

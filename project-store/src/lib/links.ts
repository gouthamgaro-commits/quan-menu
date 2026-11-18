/** Click-to-chat link that opens WhatsApp with a message ready to send. */
export function waLink(number: string, text: string) {
  const n = (number || "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/**
 * UPI payment link (opens GPay, PhonePe, Paytm…) for an exact amount, with the order code as the note.
 * The same text inside a QR code lets students pay from another phone.
 */
export function upiLink(p: { upiId: string; name: string; amount: number; note: string }) {
  const q = new URLSearchParams();
  q.set("pa", p.upiId);
  if (p.name) q.set("pn", p.name);
  q.set("am", p.amount.toFixed(2));
  q.set("cu", "INR");
  q.set("tn", p.note.slice(0, 50));
  // Apps show "+" literally, so spaces must be %20.
  return "upi://pay?" + q.toString().replace(/\+/g, "%20");
}

export function telLink(number: string) {
  return "tel:+" + (number || "").replace(/\D/g, "");
}

/** PayPal.me link that opens with the amount filled in: paypal.me/name/25.50USD */
export function paypalLink(user: string, amount: number, currency: string) {
  return `https://paypal.me/${encodeURIComponent(user)}/${amount}${currency}`;
}

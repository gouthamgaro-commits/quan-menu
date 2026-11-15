import { Check, HandCoins, Hourglass, X } from "lucide-react";
import { dateTimeIN, inr } from "@/lib/format";
import type { Message } from "@/lib/types";

/**
 * The conversation on an order, as chat bubbles. `viewer` decides which side is "you".
 * `answer` renders the Accept/Decline buttons for an open offer from the other side.
 */
export default function Thread({
  messages,
  viewer,
  names,
  answer,
  listPrice,
}: {
  messages: Message[];
  viewer: Message["sender"];
  names: { student: string; owner: string };
  answer: (m: Message) => React.ReactNode;
  listPrice?: number | null;
}) {
  if (!messages.length) return null;
  return (
    <ol className="thread" aria-label="Conversation">
      {messages.map((m) => {
        const mine = m.sender === viewer;
        const who = mine ? "You" : names[m.sender];
        return (
          <li key={m.id} className={`bubble ${mine ? "mine" : "theirs"}`}>
            <span className="bubble-meta">
              {who} · {dateTimeIN(m.createdAt)}
            </span>
            {m.offer != null && (
              <div className={`offer-chip ${m.offerStatus ?? ""}`}>
                <HandCoins size={18} aria-hidden />
                <span className="stack-xs">
                  <span className="tiny">{mine ? "Your offer" : m.sender === "owner" ? "Our offer" : "Their offer"}</span>
                  <b>{inr(m.offer)}</b>
                  {listPrice && m.offer < listPrice ? (
                    <span className="tiny">
                      {Math.round((1 - m.offer / listPrice) * 100)}% below {inr(listPrice)}
                    </span>
                  ) : null}
                </span>
                <span className="offer-state">
                  {m.offerStatus === "accepted" && (
                    <>
                      <Check size={15} aria-hidden /> Accepted
                    </>
                  )}
                  {m.offerStatus === "declined" && (
                    <>
                      <X size={15} aria-hidden /> Declined
                    </>
                  )}
                  {m.offerStatus === "replaced" && "Replaced by a newer offer"}
                  {m.offerStatus === "open" && mine && (
                    <>
                      <Hourglass size={14} aria-hidden /> Waiting for a reply
                    </>
                  )}
                </span>
              </div>
            )}
            {m.offerStatus === "open" && !mine && answer(m)}
            {m.body && <p className="bubble-body">{m.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}

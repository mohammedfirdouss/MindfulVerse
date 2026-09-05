// One-tap feedback straight to the founder's WhatsApp — the v0 experiment
// runs on honest reactions, so giving one must never require remembering
// which chat to find.
const WHATSAPP = "2348114408425";
const PREFILL = encodeURIComponent(
  "Salaam! Some honest feedback on MindfulVerse: "
);

export default function FeedbackLink() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=${PREFILL}`}
      target="_blank"
      rel="noopener noreferrer"
      className="soft"
      style={{ fontSize: ".9rem", textDecoration: "underline" }}
    >
      Tell me what you think — it goes straight to my WhatsApp
    </a>
  );
}

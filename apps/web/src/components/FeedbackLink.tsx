// One-tap feedback straight to the founder's inbox — the v0 experiment
// runs on honest reactions, so giving one must never require remembering
// which address to find.
const EMAIL = "mohammedfirdous682@gmail.com";
const GREETING = "Salaam alaykum warahmatullah wabarakatuh!\n\n";

export default function FeedbackLink({
  // Per-surface subject: identifies which moment prompted the message
  // without having to ask.
  subject = "Feedback on MindfulVerse",
  label = "Tell me what you think and it goes straight to my inbox",
}: {
  subject?: string;
  label?: string;
}) {
  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(GREETING)}`;
  return (
    <a
      href={href}
      className="soft"
      style={{ fontSize: ".9rem", textDecoration: "underline" }}
    >
      {label}
    </a>
  );
}

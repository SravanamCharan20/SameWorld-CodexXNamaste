import {
  ArrowRight,
  MessageSquare,
  UserSearch,
  Handshake,
  CheckCircle2,
  ShieldCheck,
  EyeOff,
  Lock,
  UserCheck,
  Users,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { icon: MessageSquare, step: "Say it", blurb: "Whatever's on your mind — a need, a question, a plan, a feeling." },
  { icon: UserSearch, step: "Get matched", blurb: "To someone real, thinking or living something similar, right now." },
  { icon: Handshake, step: "Reach out", blurb: "Only if it's mutual. Nothing opens without both sides agreeing." },
  { icon: CheckCircle2, step: "Move on", blurb: "Once it's solved, it's done. No feed keeping you scrolling." },
];

const COMPARISON = [
  { who: "Search engines", limit: "Find facts. They can't find someone who feels the same way, right now." },
  { who: "Social feeds", limit: "Show you what's popular — rarely what's relevant to you, right now." },
  { who: "People directories", limit: "A static list of names. No sense of \"right now\" at all." },
  { who: "SameWorld", limit: "Live, relevant, and done the moment it's actually solved.", highlight: true },
];

const PROTECTIONS = [
  { icon: ShieldCheck, title: "Every post is checked first", detail: "Harmful or fake posts are caught automatically, before anyone else ever sees them." },
  { icon: EyeOff, title: "You control what's shown", detail: "Only the words you choose to share. Nothing more is ever attached or exposed." },
  { icon: Lock, title: "Nothing opens without consent", detail: "A conversation only starts once both people agree. Reaching out never forces a reply." },
  { icon: UserCheck, title: "Anonymous until you choose", detail: "You're seen only through what you post — not who you are — unless you decide otherwise." },
];

const FUTURE = [
  { icon: Users, text: "Fewer people stuck on a problem someone nearby could already help with, today." },
  { icon: Sparkles, text: "Real, live moments — not just posts — become something you can actually search and act on." },
  { icon: CheckCircle2, text: "A search engine that measures success by problems solved, not minutes kept scrolling." },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-16 sm:mb-20">
          <a href="/explore" className="font-heading font-bold text-lg tracking-tight no-underline">
            SAME<span className="text-ai-match">WORLD</span>
          </a>
          <a href="/explore" className="link-muted text-sm">
            ← back
          </a>
        </div>

        <section className="text-center mb-20 sm:mb-24">
          <span className="inline-block text-xs font-mono text-ai-match bg-ai-match/10 border border-ai-match/25 rounded-pill px-3 py-1 mb-6">
            live · worldwide
          </span>
          <h1 className="text-2xl sm:text-[2.75rem] sm:leading-[1.1] font-heading font-bold text-text-primary tracking-tight mb-5">
            Search for humans,
            <br />
            not information.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-md mx-auto leading-relaxed mb-8">
            Say what&rsquo;s actually on your mind — a need, a question, a plan — and get matched
            to a real person, live, anywhere in the world.
          </p>
          <div className="flex flex-col items-center gap-3">
            <a href="/explore" className="btn-primary inline-flex items-center gap-2">
              Enter SameWorld <ArrowRight size={14} />
            </a>
            <a
              href={"/explore?q=" + encodeURIComponent("anyone free to talk about visas right now")}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-ai-match transition-colors duration-micro"
            >
              <SearchIcon size={12} />
              try: &ldquo;anyone free to talk about visas right now&rdquo;
            </a>
          </div>
        </section>

        <section className="mb-16 sm:mb-20">
          <p className="text-xs font-mono text-text-secondary mb-5 uppercase tracking-wide text-center">
            Why we built this
          </p>
          <div className="flex flex-col gap-3">
            {[
              "Search engines got very good at finding information. They never got good at finding each other.",
              "The person who could answer your question, share your plan, or just talk right now already exists — finding them is the part that's broken.",
              "SameWorld exists to close that gap. Instantly, honestly, without turning people into content to scroll past.",
            ].map((line) => (
              <p
                key={line}
                className="text-sm text-text-primary leading-relaxed border-l-2 border-ai-match/40 pl-4 py-0.5"
              >
                {line}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-16 sm:mb-20">
          <p className="text-xs font-mono text-text-secondary mb-5 uppercase tracking-wide text-center">
            How it helps you
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STEPS.map(({ icon: Icon, step, blurb }, i) => (
              <div key={step} className="card-base p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ai-match/10 text-ai-match shrink-0">
                    <Icon size={14} />
                  </span>
                  <span className="text-xs font-mono text-text-secondary">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="text-sm font-semibold text-text-primary mb-1">{step}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 sm:mb-20">
          <p className="text-xs font-mono text-text-secondary mb-5 uppercase tracking-wide text-center">
            Why this beats scrolling
          </p>
          <div className="card-base divide-y divide-border">
            {COMPARISON.map(({ who, limit, highlight }) => (
              <div key={who} className="flex items-start gap-4 p-4">
                <span
                  className={`text-xs font-mono shrink-0 w-32 pt-0.5 ${
                    highlight ? "text-ai-match font-semibold" : "text-text-secondary"
                  }`}
                >
                  {who}
                </span>
                <p className={`text-sm leading-relaxed ${highlight ? "text-text-primary" : "text-text-secondary"}`}>
                  {limit}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 sm:mb-20">
          <p className="text-xs font-mono text-text-secondary mb-5 uppercase tracking-wide text-center">
            What we protect
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PROTECTIONS.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="card-base p-4">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Icon size={15} className="text-now shrink-0" />
                  <p className="text-sm font-semibold text-text-primary">{title}</p>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14 sm:mb-16">
          <p className="text-xs font-mono text-text-secondary mb-5 uppercase tracking-wide text-center">
            Where this goes
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {FUTURE.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 card-base p-4">
                <Icon size={15} className="text-ai-match shrink-0 mt-0.5" />
                <p className="text-sm text-text-primary leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm sm:text-base text-text-secondary italic leading-relaxed max-w-md mx-auto">
            The people you need already exist. Our job is to tell you, honestly, the moment
            we&rsquo;ve found them.
          </p>
        </section>

        <div className="text-center">
          <a href="/explore" className="btn-primary inline-flex items-center gap-2">
            Enter SameWorld <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </main>
  );
}

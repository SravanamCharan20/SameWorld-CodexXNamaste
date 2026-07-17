import { HelpCircle } from "lucide-react";

export default function HelpButton() {
  return (
    <a
      href="/help"
      className="hidden sm:flex fixed bottom-6 right-6 z-40 h-12 w-12 items-center justify-center rounded-full bg-surface border-2 border-[#F5B822] text-[#F5B822] cursor-pointer glow-gold hover:scale-105 active:scale-95 transition-transform duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B822] focus-visible:ring-offset-2 focus-visible:ring-offset-background no-underline"
      title="What is SameWorld?"
      aria-label="What is SameWorld?"
    >
      <HelpCircle size={22} />
    </a>
  );
}

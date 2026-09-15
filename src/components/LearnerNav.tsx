"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TutorCharacter from "@/components/TutorCharacter";
import PersonaName from "@/components/PersonaName";

const BUILT = [
  { href: "/", label: "Home" },
  { href: "/subjects", label: "Subjects" },
  { href: "/me", label: "My corner" },
];
const SOON = ["Coming up", "My work", "Cheat sheets"];

// Desktop: a calm left sidebar (the mockup layout). Mobile: a bottom bar.
export default function LearnerNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sand bg-paper/60 px-4 py-6 md:flex">
        <div className="flex items-center gap-2 px-2">
          <div className="h-9 w-9"><TutorCharacter size={36} /></div>
          <span className="font-display text-lg"><PersonaName /></span>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {BUILT.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-xl px-3 py-2 text-sm ${
                isActive(n.href) ? "bg-sage text-white" : "text-ink/70 hover:bg-sand/60"
              }`}
            >
              {n.label}
            </Link>
          ))}
          {SOON.map((n) => (
            <span key={n} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink/35">
              {n} <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] uppercase tracking-wide">soon</span>
            </span>
          ))}
        </nav>
        <p className="mt-auto px-2 pt-6 text-xs leading-relaxed text-ink/45">
          Your sessions are the days Mum set. Only you and Mum can see them, no one else.
        </p>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-sand bg-cream/95 py-3 backdrop-blur md:hidden">
        {BUILT.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-full px-4 py-1 text-sm ${
              isActive(n.href) ? "font-semibold text-sage" : "text-ink/60"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

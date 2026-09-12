import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";

// The learner shell: a phone-first frame with a bottom tab bar. One card, one
// action per screen — no dashboards on her side.
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getUserRole();
  if (!role) redirect("/login");
  if (role === "parent") redirect("/console");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-cream">
      <main className="flex-1 px-5 pb-24 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-around border-t border-sand bg-cream/95 py-3 backdrop-blur">
        <Tab href="/" label="Today" />
        <Tab href="/subjects" label="Subjects" />
        <Tab href="/me" label="Me" />
      </nav>
    </div>
  );
}

function Tab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-1 text-sm font-medium text-ink/70 hover:text-teal"
    >
      {label}
    </Link>
  );
}

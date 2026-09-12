import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "@/lib/auth";

// The console is Sarah's. Isabella has no access to it.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getUserRole();
  if (!role) redirect("/login");
  if (role !== "parent") redirect("/");

  return (
    <div className="min-h-dvh bg-white text-ink">
      <header className="border-b border-sand">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <span className="mr-2 font-semibold">Isabella · Year 10 · NSW</span>
          <NavLink href="/console" label="Overview" />
          <NavLink href="/console/transcripts" label="Sessions" />
          <NavLink href="/console/settings" label="Subjects &amp; settings" />
          <NavLink href="/console/safety" label="Safety" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-ink/70 hover:text-teal">
      {label}
    </Link>
  );
}

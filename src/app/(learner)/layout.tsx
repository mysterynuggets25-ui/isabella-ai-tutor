import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import LearnerNav from "@/components/LearnerNav";

// The learner shell: a calm sidebar on desktop, a bottom bar on mobile. One
// thing in focus, everything else waiting quietly to the side.
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getUserRole();
  if (!role) redirect("/login");
  if (role === "parent") redirect("/console");

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl bg-cream">
      <LearnerNav />
      <main className="flex-1 px-5 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

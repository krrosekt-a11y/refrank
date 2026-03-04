import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}

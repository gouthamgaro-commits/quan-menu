import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { DEMO } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Quán" };

export default async function Login() {
  // Already signed in (for example from the email link in another tab): go straight to the editor.
  if (!DEMO) {
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return <LoginForm />;
}

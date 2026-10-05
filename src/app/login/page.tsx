import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { UiProvider } from "@/components/Ui";
import { DEMO } from "@/lib/config";
import { uiLang } from "@/lib/server-ui";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đăng nhập · Quán" };

export default async function Login() {
  // Already signed in (for example from the email link in another tab): go straight to the editor.
  if (!DEMO) {
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return <UiProvider lang={await uiLang()}><LoginForm /></UiProvider>;
}

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, validSession } from "./auth";

export async function isAdmin() {
  return validSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Every owner page and action calls this; middleware checks too, but this is the line that counts. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

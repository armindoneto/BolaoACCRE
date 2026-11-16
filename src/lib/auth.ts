import { cache } from "react";
import { isDemoMode, repo } from "@/lib/data";
import { createAuthClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Usuário logado (ou null). No modo demonstração não existe login. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemoMode()) return null;
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
});

/** No modo demonstração a área do admin fica aberta (os dados são fictícios). */
export const isAdmin = cache(async (): Promise<boolean> => {
  if (isDemoMode()) return true;
  const user = await getUser();
  return user ? repo().isAdmin(user.id) : false;
});

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Acesso restrito ao administrador.");
}

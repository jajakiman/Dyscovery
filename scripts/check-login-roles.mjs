// Logs in each seeded account and asserts which workspace /masuk sends it to.
// Run: node --env-file=.env.local scripts/check-login-roles.mjs
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const homeFor = (role) =>
  role === "operator" ? "/operator" : role === "guardian" || role === "psychologist" ? "/orangtua/laporan" : "/guru/siswa";

const accounts = [
  ["guru@dyscovery.id", "GuruDyscovery2026!", "/guru/siswa"],
  ["wali@dyscovery.id", "WaliDyscovery2026!", "/orangtua/laporan"],
  ["operator@dyscovery.id", "OperatorDyscovery2026!", "/operator"],
];

for (const [email, password, expected] of accounts) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  const { data: p, error: pe } = await sb.from("profiles").select("product_role").eq("id", data.user.id).single();
  assert.ifError(pe);
  assert.equal(homeFor(p.product_role), expected, email);
  console.log(`ok ${email} -> ${p.product_role} -> ${expected}`);
}

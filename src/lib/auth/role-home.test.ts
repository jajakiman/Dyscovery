// Run: node --experimental-strip-types src/lib/auth/role-home.test.ts
import assert from "node:assert/strict";
import { homeFor, rolesFor } from "./role-home.ts";

for (const role of ["teacher", "guardian", "psychologist", "operator"]) {
  assert.deepEqual(rolesFor(homeFor(role))?.includes(role), true, `${role} can open its own home`);
}
assert.equal(rolesFor("/guru/siswa")?.includes("guardian"), false);
assert.equal(rolesFor("/operator")?.includes("teacher"), false);
assert.equal(rolesFor("/orangtua/laporan")?.includes("operator"), false);
assert.equal(rolesFor("/gurux"), null);
assert.equal(rolesFor("/masuk"), null);
console.log("role-home ok");

// Single source of truth for which workspace each product role owns.
// /siswa belongs to the teacher: student mode runs on the teacher's signed-in device.
const AREAS: Array<[prefix: string, roles: string[]]> = [
  ["/guru", ["teacher"]],
  ["/siswa", ["teacher"]],
  ["/orangtua", ["guardian", "psychologist"]],
  ["/operator", ["operator"]],
  ["/admin", ["operator"]],
];

export function homeFor(role?: string | null) {
  if (role === "operator") return "/operator";
  if (role === "guardian" || role === "psychologist") return "/orangtua/laporan";
  return "/guru/siswa";
}

/** Required roles for a path, or null when the path is not a role workspace. */
export function rolesFor(path: string) {
  return AREAS.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
}

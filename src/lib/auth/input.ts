export function credentials(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const { email, password } = input as Record<string, unknown>;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("Invalid credentials format");
  }
  return { email, password };
}

export function identity(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const value = input as Record<string, unknown>;
  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const nip = value.nip === undefined || value.nip === null || value.nip === "" ? null : value.nip;
  if (!fullName || fullName.length > 150 || displayName.length > 150 || value.confirmed !== true ||
      (nip !== null && (typeof nip !== "string" || !/^[0-9]{18}$/.test(nip)))) {
    throw new Error("Invalid identity");
  }
  return { fullName, displayName: displayName || fullName, nip };
}

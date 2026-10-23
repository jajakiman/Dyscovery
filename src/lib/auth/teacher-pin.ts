export function teacherPin(input: unknown) {
  if (!input || typeof input !== "object" || !("pin" in input) ||
      typeof input.pin !== "string" || !/^[0-9]{6}$/.test(input.pin)) throw new Error("Invalid PIN");
  return input.pin;
}

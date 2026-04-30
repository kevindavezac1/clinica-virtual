export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: "Mínimo 8 caracteres" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Debe incluir al menos una mayúscula" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Debe incluir al menos un número" };
  return { valid: true };
}

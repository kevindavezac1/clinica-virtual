import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

function formatTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  // ya tiene código país
  if (digits.startsWith("549")) return `whatsapp:+${digits}`;
  if (digits.startsWith("54")) return `whatsapp:+54${digits.slice(2)}`;
  // 10 dígitos argentinos → +549XXXXXXXXXX (9 requerido para WhatsApp móvil AR)
  if (digits.startsWith("0")) return `whatsapp:+549${digits.slice(1)}`;
  return `whatsapp:+549${digits}`;
}

export async function sendRecordatorioWhatsApp(
  telefono: string,
  paciente: string,
  fecha: string,
  hora: string,
  medico: string,
  especialidad: string,
) {
  const to = formatTelefono(telefono);
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body: `Hola ${paciente} 👋\n\nTe recordamos que mañana tenés turno médico:\n\n🩺 *${medico}*\n📋 ${especialidad}\n📅 ${fecha}\n⏰ ${hora}\n\nSi necesitás cancelar, ingresá a la app. — Consultorios Esperanza`,
  });
}

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `Consultorios Esperanza <${process.env.GMAIL_USER}>`;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function wrap(content: string): string {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;color:#1a1a1a">
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0"/>
      <p style="color:#999;font-size:12px;margin:0">Consultorios Esperanza — mensaje automático, no respondas este email.</p>
    </div>
  `;
}

export async function sendPasswordReset(to: string, nombre: string, token: string) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Recuperar contraseña — Consultorios Esperanza",
    html: wrap(`
      <h2 style="color:#1e3a5f;margin-top:0">Recuperar contraseña</h2>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. El enlace expira en <strong>30 minutos</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
        Restablecer contraseña
      </a>
      <p style="color:#666;font-size:14px">Si no solicitaste este cambio, ignorá este email.</p>
    `),
  });
}

export async function sendTurnoPendiente(to: string, medico: string, paciente: string, fecha: string, hora: string, especialidad: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Nuevo turno pendiente de confirmación — Consultorios Esperanza",
    html: wrap(`
      <h2 style="color:#1e3a5f;margin-top:0">Nuevo turno pendiente</h2>
      <p>Hola <strong>${medico}</strong>, tenés un nuevo turno esperando confirmación.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Paciente</td><td style="padding:8px 0;font-weight:600">${paciente}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Especialidad</td><td style="padding:8px 0;font-weight:600">${especialidad}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Fecha</td><td style="padding:8px 0;font-weight:600">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Hora</td><td style="padding:8px 0;font-weight:600">${hora}</td></tr>
      </table>
      <a href="${BASE_URL}/turnos-programados" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
        Ver turnos programados
      </a>
    `),
  });
}

export async function sendTurnoConfirmado(to: string, paciente: string, fecha: string, hora: string, medico: string, especialidad: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Turno confirmado — Consultorios Esperanza",
    html: wrap(`
      <h2 style="color:#16a34a;margin-top:0">✓ Tu turno fue confirmado</h2>
      <p>Hola <strong>${paciente}</strong>, tu turno quedó confirmado.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Médico</td><td style="padding:8px 0;font-weight:600">${medico}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Especialidad</td><td style="padding:8px 0;font-weight:600">${especialidad}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Fecha</td><td style="padding:8px 0;font-weight:600">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Hora</td><td style="padding:8px 0;font-weight:600">${hora}</td></tr>
      </table>
      <p style="color:#666;font-size:14px">Si necesitás cancelar, ingresá a <a href="${BASE_URL}/mis-turnos" style="color:#1e3a5f">Mis turnos</a>.</p>
    `),
  });
}

export async function sendTurnoCanceladoPorPaciente(to: string, medico: string, paciente: string, fecha: string, hora: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Turno cancelado por el paciente — Consultorios Esperanza",
    html: wrap(`
      <h2 style="color:#dc2626;margin-top:0">✗ Un paciente canceló su turno</h2>
      <p>Hola <strong>${medico}</strong>, el siguiente turno fue cancelado por el paciente.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Paciente</td><td style="padding:8px 0;font-weight:600">${paciente}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Fecha</td><td style="padding:8px 0;font-weight:600">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Hora</td><td style="padding:8px 0;font-weight:600">${hora}</td></tr>
      </table>
      <p style="color:#666;font-size:14px">El horario quedó disponible automáticamente.</p>
    `),
  });
}

export async function sendTurnoCancelado(to: string, paciente: string, fecha: string, hora: string, medico: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Turno cancelado — Consultorios Esperanza",
    html: wrap(`
      <h2 style="color:#dc2626;margin-top:0">✗ Tu turno fue cancelado</h2>
      <p>Hola <strong>${paciente}</strong>, lamentamos informarte que tu turno fue cancelado.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Médico</td><td style="padding:8px 0;font-weight:600">${medico}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Fecha</td><td style="padding:8px 0;font-weight:600">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Hora</td><td style="padding:8px 0;font-weight:600">${hora}</td></tr>
      </table>
      <p>Podés solicitar un nuevo turno desde <a href="${BASE_URL}/nuevo-turno" style="color:#1e3a5f">Nuevo turno</a>.</p>
    `),
  });
}

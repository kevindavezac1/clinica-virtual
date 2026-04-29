export interface Usuario {
  id?: number;
  dni?: string;
  nombre?: string;
  apellido?: string;
  fecha_nacimiento?: string;
  password?: string;
  rol?: string;
  email?: string;
  telefono?: string;
  id_cobertura?: number;
  nombre_cobertura?: string;
}

export interface Cobertura {
  id: number;
  nombre: string;
}

export interface Especialidad {
  id: number;
  descripcion: string;
}

export interface Agenda {
  id?: number;
  id_medico: number;
  id_especialidad: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
}

export interface Turno {
  id?: number;
  nota?: string;
  id_agenda: number;
  fecha: string;
  hora: string;
  id_paciente: number;
  id_cobertura: number;
}

export interface AuthPayload {
  sub: number;
  name: string;
  rol: string;
  id: number;
}

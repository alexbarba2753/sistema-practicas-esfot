/**
 * Reglas de negocio puras del Dominio (Independientes de BD y Framework)
 * Sistema de Prácticas Preprofesionales ESFOT - EPN
 */

export const ROLES = Object.freeze({
  ADMINISTRADOR: 'administrador',
  DOCENTE: 'docente',
  ESTUDIANTE: 'estudiante'
});

export const MODALIDADES = Object.freeze({
  LABORAL: 'laboral',
  COMUNITARIO: 'comunitario'
});

export const HORAS_REGLAMENTARIAS = Object.freeze({
  LABORAL: 240,
  COMUNITARIO: 96
});

export const ESTADOS_ACTIVIDAD = Object.freeze({
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado'
});

export const ESTADOS_AULA = Object.freeze({
  ABIERTA: 'abierta',
  CERRADA: 'cerrada'
});

export const INTERVALO_MINUTOS_AUDITORIA = 10; // Bloques mínimos de auditoría horaria

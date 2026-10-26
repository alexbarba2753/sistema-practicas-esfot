import { toUsuarioDto } from './usuarioDto.js';

/**
 * DTOs y Mappers para Aula Virtual (Data Transfer Objects)
 * Relación: 1 Docente Tutor y 1 Estudiante por Aula Virtual
 */

export const toAulaVirtualDto = (aula) => {
  if (!aula) return null;
  const aulaObj = aula.toObject ? aula.toObject() : aula;

  // Formatear docente tutor si está poblado
  let tutor = null;
  if (aulaObj.docenteTutor) {
    if (aulaObj.docenteTutor._id) {
      tutor = {
        id: aulaObj.docenteTutor._id.toString(),
        nombres: aulaObj.docenteTutor.nombres,
        apellidos: aulaObj.docenteTutor.apellidos,
        correo: aulaObj.docenteTutor.correo,
        telefono: aulaObj.docenteTutor.telefono || ''
      };
    } else {
      tutor = aulaObj.docenteTutor.toString();
    }
  }

  // Formatear estudiante asignado (1 a 1)
  let alumno = null;
  if (aulaObj.estudiante) {
    if (aulaObj.estudiante._id) {
      alumno = toUsuarioDto(aulaObj.estudiante);
    } else {
      alumno = aulaObj.estudiante.toString();
    }
  }

  return {
    id: aulaObj._id?.toString() || aulaObj.id,
    nombre: aulaObj.nombre,
    periodo: aulaObj.periodo,
    modalidad: aulaObj.modalidad,
    horasRequeridas: aulaObj.horasRequeridas,
    docenteTutor: tutor,
    estudiante: alumno,
    fechaInicio: aulaObj.fechaInicio,
    fechaFin: aulaObj.fechaFin,
    estado: aulaObj.estado,
    createdAt: aulaObj.createdAt
  };
};

export const toAulaVirtualListDto = (aulas = []) => {
  return aulas.map(toAulaVirtualDto);
};

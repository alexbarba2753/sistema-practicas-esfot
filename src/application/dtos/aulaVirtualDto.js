import { toUsuarioDto } from './usuarioDto.js';

/**
 * DTOs y Mappers para Aula Virtual (Data Transfer Objects)
 */

export const toAulaVirtualDto = (aula) => {
  if (!aula) return null;
  const aulaObj = aula.toObject ? aula.toObject() : aula;

  // Formatear docente tutor si está poblado o es ID
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

  // Formatear estudiantes si están poblados
  let estudiantes = [];
  if (Array.isArray(aulaObj.estudiantes)) {
    estudiantes = aulaObj.estudiantes.map((e) => (e._id ? toUsuarioDto(e) : e.toString()));
  }

  return {
    id: aulaObj._id?.toString() || aulaObj.id,
    nombre: aulaObj.nombre,
    periodo: aulaObj.periodo,
    modalidad: aulaObj.modalidad,
    horasRequeridas: aulaObj.horasRequeridas,
    docenteTutor: tutor,
    estudiantes,
    totalEstudiantes: estudiantes.length,
    fechaInicio: aulaObj.fechaInicio,
    fechaFin: aulaObj.fechaFin,
    estado: aulaObj.estado,
    createdAt: aulaObj.createdAt
  };
};

export const toAulaVirtualListDto = (aulas = []) => {
  return aulas.map(toAulaVirtualDto);
};

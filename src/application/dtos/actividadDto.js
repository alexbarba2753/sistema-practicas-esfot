/**
 * DTOs y Mappers para Actividades Laborales y Comunitarias
 */

export const toActividadLaboralDto = (act) => {
  if (!act) return null;
  const a = act.toObject ? act.toObject() : act;

  return {
    id: a._id?.toString() || a.id,
    aulaVirtualId: a.aulaVirtual?._id?.toString() || a.aulaVirtual?.toString(),
    estudianteId: a.estudiante?._id?.toString() || a.estudiante?.toString(),
    fecha: a.fecha,
    horaEntrada: a.horaEntrada,
    horaSalida: a.horaSalida,
    horas: a.horas,
    descripcion: a.descripcion,
    estadoAprobacion: a.estadoAprobacion,
    observacionesDocente: a.observacionesDocente || '',
    createdAt: a.createdAt
  };
};

export const toActividadComunitariaDto = (act) => {
  if (!act) return null;
  const a = act.toObject ? act.toObject() : act;

  return {
    id: a._id?.toString() || a.id,
    aulaVirtualId: a.aulaVirtual?._id?.toString() || a.aulaVirtual?.toString(),
    estudianteId: a.estudiante?._id?.toString() || a.estudiante?.toString(),
    fecha: a.fecha,
    horas: a.horas,
    comunidadOInstitucion: a.comunidadOInstitucion,
    beneficiariosAproximados: a.beneficiariosAproximados || 0,
    descripcion: a.descripcion,
    archivoEvidenciaUrl: a.archivoEvidenciaUrl || '',
    estadoAprobacion: a.estadoAprobacion,
    observacionesDocente: a.observacionesDocente || '',
    createdAt: a.createdAt
  };
};

export const toActividadLaboralListDto = (list = []) => list.map(toActividadLaboralDto);
export const toActividadComunitariaListDto = (list = []) => list.map(toActividadComunitariaDto);

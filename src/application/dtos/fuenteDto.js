/**
 * DTOs y Mappers para Fuentes Institucionales (RAG)
 */

export const toFuenteDto = (fuente) => {
  if (!fuente) return null;
  const fObj = fuente.toObject ? fuente.toObject() : fuente;

  let autor = null;
  if (fObj.subidoPor) {
    if (fObj.subidoPor._id) {
      autor = {
        id: fObj.subidoPor._id.toString(),
        nombres: fObj.subidoPor.nombres,
        apellidos: fObj.subidoPor.apellidos,
        correo: fObj.subidoPor.correo
      };
    } else {
      autor = fObj.subidoPor.toString();
    }
  }

  const totalFrags = fObj.fragmentos ? fObj.fragmentos.length : 0;

  return {
    id: fObj._id?.toString() || fObj.id,
    titulo: fObj.titulo,
    categoria: fObj.categoria,
    descripcion: fObj.descripcion || '',
    version: fObj.version || '1.0',
    activo: fObj.activo,
    enlaceUrl: fObj.enlaceUrl || '',
    totalFragmentos: totalFrags,
    subidoPor: autor,
    createdAt: fObj.createdAt,
    updatedAt: fObj.updatedAt
  };
};

export const toFuenteDetalleDto = (fuente) => {
  if (!fuente) return null;
  const baseDto = toFuenteDto(fuente);
  const fObj = fuente.toObject ? fuente.toObject() : fuente;

  return {
    ...baseDto,
    contenido: fObj.contenido,
    fragmentos: (fObj.fragmentos || []).map((f) => ({
      orden: f.orden,
      texto: f.texto
    }))
  };
};

export const toFuenteListDto = (fuentes = []) => {
  return fuentes.map(toFuenteDto);
};

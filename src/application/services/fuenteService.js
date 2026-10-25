import { FuenteInstitucional } from '../../infrastructure/database/models/index.js';
import { dividirEnFragmentos } from '../../domain/utils/textChunker.js';

export const fuenteService = {
  /**
   * Procesa, fragmenta e indexa un documento normativo institucional para el asistente inteligente
   */
  async ingestarFuente(datos, usuarioId) {
    const { titulo, categoria, descripcion, contenido, enlaceUrl, version } = datos;

    if (!titulo || !contenido) {
      const error = new Error('El título y el contenido textual del documento son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    const categoriasValidas = ['reglamento', 'instructivo', 'formato', 'resolucion', 'general'];
    if (categoria && !categoriasValidas.includes(categoria)) {
      const error = new Error(`Categoría inválida. Permitidas: ${categoriasValidas.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // Partición algorítmica en fragmentos secuenciales ordenados
    const fragmentos = dividirEnFragmentos(contenido);

    const nuevaFuente = new FuenteInstitucional({
      titulo: titulo.trim(),
      categoria: categoria || 'reglamento',
      descripcion: descripcion ? descripcion.trim() : '',
      contenido: contenido.trim(),
      fragmentos,
      enlaceUrl: enlaceUrl ? enlaceUrl.trim() : '',
      version: version ? version.trim() : '1.0',
      activo: true,
      subidoPor: usuarioId
    });

    await nuevaFuente.save();

    return {
      success: true,
      message: 'Fuente institucional procesada, fragmentada e indexada exitosamente',
      totalFragmentos: fragmentos.length,
      fuente: {
        id: nuevaFuente._id,
        titulo: nuevaFuente.titulo,
        categoria: nuevaFuente.categoria,
        descripcion: nuevaFuente.descripcion,
        version: nuevaFuente.version,
        activo: nuevaFuente.activo,
        totalFragmentos: fragmentos.length,
        createdAt: nuevaFuente.createdAt
      }
    };
  },

  /**
   * Consulta el listado de documentos normativos con filtros por categoría y estado de vigencia
   */
  async listarFuentes(filtros = {}) {
    const query = {};

    if (filtros.categoria) {
      query.categoria = filtros.categoria;
    }

    if (filtros.activo !== undefined) {
      query.activo = filtros.activo === 'true' || filtros.activo === true;
    }

    if (filtros.busqueda && filtros.busqueda.trim()) {
      const regex = new RegExp(filtros.busqueda.trim(), 'i');
      query.$or = [{ titulo: regex }, { descripcion: regex }];
    }

    const fuentes = await FuenteInstitucional.find(query)
      .select('-contenido -fragmentos')
      .populate('subidoPor', 'nombres apellidos correo')
      .sort({ createdAt: -1 });

    return {
      success: true,
      total: fuentes.length,
      fuentes
    };
  },

  /**
   * Obtiene el documento completo junto a todos sus fragmentos ordenados indexados
   */
  async obtenerFuentePorId(fuenteId) {
    const fuente = await FuenteInstitucional.findById(fuenteId)
      .populate('subidoPor', 'nombres apellidos correo');

    if (!fuente) {
      const error = new Error('Fuente institucional no encontrada');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      fuente
    };
  },

  /**
   * Actualiza los datos de la fuente y re-indexa los fragmentos si el contenido textual fue modificado
   */
  async actualizarFuente(fuenteId, datos) {
    const fuente = await FuenteInstitucional.findById(fuenteId);
    if (!fuente) {
      const error = new Error('Fuente institucional no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const { titulo, categoria, descripcion, enlaceUrl, version, contenido, activo } = datos;

    if (titulo) fuente.titulo = titulo.trim();
    if (descripcion !== undefined) fuente.descripcion = descripcion.trim();
    if (enlaceUrl !== undefined) fuente.enlaceUrl = enlaceUrl.trim();
    if (version) fuente.version = version.trim();
    if (activo !== undefined) fuente.activo = Boolean(activo);

    const categoriasValidas = ['reglamento', 'instructivo', 'formato', 'resolucion', 'general'];
    if (categoria && categoriasValidas.includes(categoria)) {
      fuente.categoria = categoria;
    }

    // Si el contenido textual cambió, recalcular fragmentos secuenciales
    let fragmentosRecalculados = false;
    if (contenido && contenido.trim() !== fuente.contenido) {
      fuente.contenido = contenido.trim();
      fuente.fragmentos = dividirEnFragmentos(fuente.contenido);
      fragmentosRecalculados = true;
    }

    await fuente.save();

    return {
      success: true,
      message: 'Fuente institucional actualizada exitosamente',
      fragmentosActualizados: fragmentosRecalculados,
      totalFragmentos: fuente.fragmentos.length,
      fuente: {
        id: fuente._id,
        titulo: fuente.titulo,
        categoria: fuente.categoria,
        version: fuente.version,
        activo: fuente.activo,
        totalFragmentos: fuente.fragmentos.length,
        updatedAt: fuente.updatedAt
      }
    };
  },

  /**
   * Modifica la vigencia del documento (activar/desactivar para el asistente IA)
   */
  async cambiarEstadoFuente(fuenteId, activo) {
    const fuente = await FuenteInstitucional.findById(fuenteId);
    if (!fuente) {
      const error = new Error('Fuente institucional no encontrada');
      error.statusCode = 404;
      throw error;
    }

    fuente.activo = Boolean(activo);
    await fuente.save();

    return {
      success: true,
      message: `Fuente institucional ${fuente.activo ? 'activada' : 'desactivada'} exitosamente`,
      fuente: {
        id: fuente._id,
        titulo: fuente.titulo,
        activo: fuente.activo
      }
    };
  },

  /**
   * Elimina un documento normativo institucional
   */
  async eliminarFuente(fuenteId) {
    const fuente = await FuenteInstitucional.findByIdAndDelete(fuenteId);
    if (!fuente) {
      const error = new Error('Fuente institucional no encontrada');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      message: 'Fuente institucional eliminada exitosamente'
    };
  }
};

import { FuenteInstitucional } from '../../infrastructure/database/models/index.js';
import { dividirEnFragmentos } from '../../domain/utils/textChunker.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';

const CATEGORIAS_VALIDAS = ['reglamento', 'instructivo', 'formato', 'resolucion', 'general'];

export const fuenteService = {
  /**
   * Carga, fragmenta algorítmicamente e indexa un documento normativo para la IA
   */
  async ingestarFuente(datos, usuarioId) {
    const { titulo, categoria, descripcion, contenido, enlaceUrl, version } = datos;

    if (!titulo || !contenido) {
      throw errorHttp('El título y el contenido textual del documento son obligatorios', 400);
    }

    if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
      throw errorHttp(`Categoría inválida. Permitidas: ${CATEGORIAS_VALIDAS.join(', ')}`, 400);
    }

    // Fragmentación secuencial de texto
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
   * Lista fuentes normativas con filtros por categoría o vigencia
   */
  async listarFuentes(filtros = {}) {
    const query = {};
    if (filtros.categoria) query.categoria = filtros.categoria;
    if (filtros.activo !== undefined) query.activo = filtros.activo === 'true' || filtros.activo === true;
    if (filtros.busqueda?.trim()) {
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
   * Obtiene una fuente y todos sus fragmentos indexados
   */
  async obtenerFuentePorId(fuenteId) {
    const fuente = await FuenteInstitucional.findById(fuenteId)
      .populate('subidoPor', 'nombres apellidos correo');

    if (!fuente) throw errorHttp('Fuente institucional no encontrada', 404);

    return {
      success: true,
      fuente
    };
  },

  /**
   * Actualiza metadatos y re-indexa fragmentos si se modificó el contenido
   */
  async actualizarFuente(fuenteId, datos) {
    const fuente = await FuenteInstitucional.findById(fuenteId);
    if (!fuente) throw errorHttp('Fuente institucional no encontrada', 404);

    const { titulo, categoria, descripcion, enlaceUrl, version, contenido, activo } = datos;

    if (titulo) fuente.titulo = titulo.trim();
    if (descripcion !== undefined) fuente.descripcion = descripcion.trim();
    if (enlaceUrl !== undefined) fuente.enlaceUrl = enlaceUrl.trim();
    if (version) fuente.version = version.trim();
    if (activo !== undefined) fuente.activo = Boolean(activo);
    if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) fuente.categoria = categoria;

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
   * Modifica la vigencia del documento normativo
   */
  async cambiarEstadoFuente(fuenteId, activo) {
    const fuente = await FuenteInstitucional.findById(fuenteId);
    if (!fuente) throw errorHttp('Fuente institucional no encontrada', 404);

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
   * Elimina permanentemente una fuente y sus fragmentos
   */
  async eliminarFuente(fuenteId) {
    const fuente = await FuenteInstitucional.findByIdAndDelete(fuenteId);
    if (!fuente) throw errorHttp('Fuente institucional no encontrada', 404);

    return {
      success: true,
      message: 'Fuente institucional eliminada exitosamente'
    };
  }
};

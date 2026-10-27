import fs from 'fs';
import path from 'path';
import { FuenteInstitucional } from '../../infrastructure/database/models/index.js';
import { dividirEnFragmentos } from '../../domain/utils/textChunker.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { toFuenteDto, toFuenteDetalleDto, toFuenteListDto } from '../dtos/index.js';

const CATEGORIAS_VALIDAS = ['reglamento', 'instructivo', 'formato', 'resolucion', 'general'];

/**
 * Busca y lee un archivo Markdown (.md o .txt) en ubicaciones estándar del proyecto
 */
const resolverYLeerArchivo = async (nombreORuta) => {
  if (!nombreORuta || typeof nombreORuta !== 'string') {
    throw errorHttp('Debe especificar el nombre o ruta del archivo a procesar', 400);
  }

  const posiblesRutas = [
    path.resolve(nombreORuta),
    path.resolve(process.cwd(), nombreORuta),
    path.resolve(process.cwd(), '../Documentación', nombreORuta),
    path.resolve(process.cwd(), 'documentos', nombreORuta),
    path.resolve('C:\\Users\\alexm\\OneDrive\\Desktop\\Tesis\\Documentación', nombreORuta)
  ];

  let rutaEncontrada = null;
  for (const r of posiblesRutas) {
    if (fs.existsSync(r) && fs.statSync(r).isFile()) {
      rutaEncontrada = r;
      break;
    }
  }

  if (!rutaEncontrada) {
    throw errorHttp(`El archivo '${nombreORuta}' no fue encontrado en las carpetas del proyecto`, 404);
  }

  const contenido = await fs.promises.readFile(rutaEncontrada, 'utf-8');
  if (!contenido || !contenido.trim()) {
    throw errorHttp(`El archivo '${nombreORuta}' se encuentra vacío`, 400);
  }

  return {
    contenido: contenido.trim(),
    nombreArchivo: path.basename(rutaEncontrada),
    rutaAbsoluta: rutaEncontrada
  };
};

export const fuenteService = {
  /**
   * Carga, fragmenta algorítmicamente e indexa un documento normativo para la IA
   * Acepta contenido directo en texto o el nombre/ruta de un archivo .md
   */
  async ingestarFuente(datos, usuarioId) {
    let { titulo, categoria, descripcion, contenido, enlaceUrl, version } = datos;
    const archivoReferencia = datos.nombreArchivo || datos.archivo || datos.rutaArchivo;

    // Si se envía archivo .md o .txt, resolverlo y leerlo del disco
    let archivoInfo = null;
    if (!contenido && archivoReferencia) {
      archivoInfo = await resolverYLeerArchivo(archivoReferencia);
      contenido = archivoInfo.contenido;

      // Deducir título si no se especificó (usar primer encabezado # del Markdown)
      if (!titulo) {
        const lineaH1 = contenido.split('\n').find((l) => l.startsWith('# '));
        titulo = lineaH1 ? lineaH1.replace(/^#\s+/, '').trim() : archivoInfo.nombreArchivo.replace(/\.(md|txt)$/i, '');
      }

      if (!descripcion) {
        descripcion = `Documento normativo institucional cargado desde archivo ${archivoInfo.nombreArchivo}`;
      }
    }

    if (!titulo || !contenido) {
      throw errorHttp('El título y el contenido textual (o el nombre de un archivo .md válido) son obligatorios', 400);
    }

    if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
      throw errorHttp(`Categoría inválida. Permitidas: ${CATEGORIAS_VALIDAS.join(', ')}`, 400);
    }

    // Fragmentación secuencial de texto para RAG
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
      message: archivoInfo
        ? `Archivo '${archivoInfo.nombreArchivo}' procesado, fragmentado e indexado exitosamente`
        : 'Fuente institucional procesada, fragmentada e indexada exitosamente',
      archivoProcesado: archivoInfo ? archivoInfo.nombreArchivo : null,
      totalFragmentos: fragmentos.length,
      fuente: toFuenteDto(nuevaFuente)
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
      fuentes: toFuenteListDto(fuentes)
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
      fuente: toFuenteDetalleDto(fuente)
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

    let nuevoContenido = contenido;
    const archivoReferencia = datos.nombreArchivo || datos.archivo || datos.rutaArchivo;
    if (!nuevoContenido && archivoReferencia) {
      const info = await resolverYLeerArchivo(archivoReferencia);
      nuevoContenido = info.contenido;
    }

    let fragmentosRecalculados = false;
    if (nuevoContenido && nuevoContenido.trim() !== fuente.contenido) {
      fuente.contenido = nuevoContenido.trim();
      fuente.fragmentos = dividirEnFragmentos(fuente.contenido);
      fragmentosRecalculados = true;
    }

    await fuente.save();

    return {
      success: true,
      message: 'Fuente institucional actualizada exitosamente',
      fragmentosActualizados: fragmentosRecalculados,
      totalFragmentos: fuente.fragmentos.length,
      fuente: toFuenteDto(fuente)
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
      fuente: toFuenteDto(fuente)
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

import { errorHttp } from '../../domain/utils/errorHttp.js';

/**
 * Middleware para procesar la subida del archivo normativo:
 * - Parámetros de configuración por Query Params (req.query: categoria, version, etc.)
 * - Archivo Markdown adjunto por Form-Data (req.body.contenido)
 */
export const procesarArchivoNormativo = async (req, res, next) => {
  try {
    const contentType = req.headers['content-type'] || '';

    // Si viene como JSON convencional (por compatibilidad)
    if (contentType.includes('application/json')) {
      req.body = { ...req.query, ...req.body };
      return next();
    }

    if (!contentType.includes('multipart/form-data')) {
      throw errorHttp('Debe adjuntar el archivo normativo usando form-data en el Body', 400);
    }

    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      throw errorHttp('Formato de carga multipart inválido', 400);
    }

    const boundary = boundaryMatch[1].trim().replace(/^["']|["']$/g, '');
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const parts = buffer.toString('utf-8').split('--' + boundary);

    // Los metadatos vienen por query params
    req.body = { ...req.query };

    for (const part of parts) {
      if (!part || part.trim() === '' || part.trim() === '--') continue;
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      const headers = part.slice(0, headerEnd);
      const content = part.slice(headerEnd + 4).replace(/\r\n$/, '');
      const filenameMatch = headers.match(/filename="([^"]+)"/);

      if (filenameMatch) {
        req.body.contenido = content.trim();
        req.body.nombreArchivo = filenameMatch[1];
      }
    }

    if (!req.body.contenido) {
      throw errorHttp('Debe adjuntar un archivo Markdown (.md o .txt) con contenido válido', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

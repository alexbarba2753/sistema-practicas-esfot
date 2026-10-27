/**
 * Middleware nativo para recepción y carga de archivos Markdown (.md o .txt)
 * sin dependencias externas (sin multer), usando streams nativos de Node.js.
 * 
 * Soporta:
 * 1. Postman Body -> binary (botón 'Select file') con metadatos por Query Params
 * 2. Postman Body -> form-data (campo 'archivo' de tipo File)
 * 3. Postman Body -> JSON tradicional
 */
export const procesarArchivoNormativo = async (req, res, next) => {
  try {
    const contentType = req.headers['content-type'] || '';

    // Caso 1: JSON convencional
    if (contentType.includes('application/json')) {
      req.body = { ...req.query, ...req.body };
      return next();
    }

    // Caso 2: multipart/form-data (Postman: form-data con archivo adjunto)
    if (contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        req.body = { ...req.query, ...req.body };
        return next();
      }

      const boundary = boundaryMatch[1].trim().replace(/^["']|["']$/g, '');
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const parts = buffer.toString('utf-8').split('--' + boundary);

      req.body = { ...req.query };

      for (const part of parts) {
        if (!part || part.trim() === '' || part.trim() === '--') continue;
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        const headers = part.slice(0, headerEnd);
        const bodyContent = part.slice(headerEnd + 4).replace(/\r\n$/, '');

        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);

        if (filenameMatch) {
          req.file = {
            filename: filenameMatch[1],
            content: bodyContent
          };
          req.body.contenido = bodyContent;
          req.body.nombreArchivo = filenameMatch[1];
        } else if (nameMatch) {
          req.body[nameMatch[1]] = bodyContent.trim();
        }
      }
      return next();
    }

    // Caso 3: application/octet-stream o binario crudo (Postman: binary con archivo adjunto)
    if (
      contentType.includes('application/octet-stream') ||
      contentType.includes('text/markdown') ||
      contentType.includes('text/plain') ||
      !contentType
    ) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const fileContent = Buffer.concat(chunks).toString('utf-8');
      req.body = { ...req.query, ...req.body };
      if (fileContent.trim()) {
        req.body.contenido = fileContent.trim();
        req.file = {
          filename: req.query.nombreArchivo || 'documento.md',
          content: fileContent.trim()
        };
      }
      return next();
    }

    req.body = { ...req.query, ...req.body };
    next();
  } catch (error) {
    next(error);
  }
};

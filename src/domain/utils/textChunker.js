/**
 * Utilidad de dominio pura para la partición y estructuración de textos largos en fragmentos (chunks)
 * indexables para el asistente inteligente RAG (Retrieval-Augmented Generation).
 */
export const dividirEnFragmentos = (texto, maxPalabras = 150) => {
  if (!texto || typeof texto !== 'string') {
    return [];
  }

  const textoLimpio = texto.trim();
  if (!textoLimpio) {
    return [];
  }

  // Dividir por párrafos iniciales
  const parrafos = textoLimpio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const fragmentos = [];
  let bufferActual = [];
  let conteoPalabrasBuffer = 0;

  for (const parrafo of parrafos) {
    const palabrasParrafo = parrafo.split(/\s+/).filter(Boolean);

    // Si el párrafo individual excede el tamaño máximo, se divide internamente por oraciones
    if (palabrasParrafo.length > maxPalabras) {
      if (bufferActual.length > 0) {
        fragmentos.push(bufferActual.join(' '));
        bufferActual = [];
        conteoPalabrasBuffer = 0;
      }

      const oraciones = parrafo.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [parrafo];
      let subBuffer = [];
      let conteoSub = 0;

      for (const oracion of oraciones) {
        const palabrasOracion = oracion.trim().split(/\s+/).filter(Boolean);
        if (conteoSub + palabrasOracion.length > maxPalabras && subBuffer.length > 0) {
          fragmentos.push(subBuffer.join(' '));
          subBuffer = [];
          conteoSub = 0;
        }
        subBuffer.push(oracion.trim());
        conteoSub += palabrasOracion.length;
      }

      if (subBuffer.length > 0) {
        fragmentos.push(subBuffer.join(' '));
      }
      continue;
    }

    if (conteoPalabrasBuffer + palabrasParrafo.length > maxPalabras && bufferActual.length > 0) {
      fragmentos.push(bufferActual.join('\n\n'));
      bufferActual = [];
      conteoPalabrasBuffer = 0;
    }

    bufferActual.push(parrafo);
    conteoPalabrasBuffer += palabrasParrafo.length;
  }

  if (bufferActual.length > 0) {
    fragmentos.push(bufferActual.join('\n\n'));
  }

  return fragmentos.map((txt, index) => ({
    orden: index + 1,
    texto: txt.trim()
  }));
};

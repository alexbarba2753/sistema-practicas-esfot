/**
 * Fragmenta un texto normativo extenso en bloques secuenciales para el asistente de IA (RAG)
 */
export const dividirEnFragmentos = (texto, maxPalabras = 150) => {
  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return [];
  }

  const parrafos = texto.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const fragmentos = [];
  let actual = '';

  for (const parrafo of parrafos) {
    const combinado = actual ? `${actual}\n\n${parrafo}` : parrafo;
    const totalPalabras = combinado.split(/\s+/).length;

    if (totalPalabras <= maxPalabras) {
      actual = combinado;
    } else {
      if (actual) fragmentos.push(actual);
      actual = parrafo;
    }
  }

  if (actual) {
    fragmentos.push(actual);
  }

  return fragmentos.map((txt, index) => ({
    orden: index + 1,
    texto: txt.trim()
  }));
};

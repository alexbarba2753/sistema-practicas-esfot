import Groq from 'groq-sdk';
import { ENV } from '../../infrastructure/config/env.js';
import {
  FuenteInstitucional,
  AulaVirtual,
  ActividadLaboral,
  ActividadComunitaria,
  FormularioPendiente
} from '../../infrastructure/database/models/index.js';
import { ESTADOS_ACTIVIDAD, MODALIDADES } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';

let groqClient = null;
const getGroqClient = () => {
  if (!groqClient && ENV.GROQ_API_KEY && ENV.GROQ_API_KEY.trim()) {
    groqClient = new Groq({ apiKey: ENV.GROQ_API_KEY.trim() });
  }
  return groqClient;
};

export function limpiarTextoParaExcel(texto) {
  if (!texto || typeof texto !== 'string') return '';

  let limpio = texto
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\|[-:| ]+\|\s*$/gm, '');

  const lineas = limpio.split('\n');
  const lineasProcesadas = [];

  for (const linea of lineas) {
    const l = linea.trim();
    if (l.startsWith('|') && l.endsWith('|')) {
      const celdas = l.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
      if (celdas.some((c) => /código|asignatura|temática|evidencia/i.test(c))) {
        continue;
      }
      if (celdas.length >= 2) {
        lineasProcesadas.push(`• ${celdas[0]}: ${celdas.slice(1).join(' - ')}`);
      } else if (celdas.length === 1) {
        lineasProcesadas.push(`• ${celdas[0]}`);
      }
    } else {
      lineasProcesadas.push(linea);
    }
  }

  limpio = lineasProcesadas.join('\n');

  limpio = limpio
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return limpio;
}

function parsearSeccionesLaboral(texto) {
  let asignaturas = '';
  let actividades = '';
  let habilidades = '';

  const match1 = texto.match(/(?:^|\n)(?:##\s*)?(?:1\.\s*)?ASIGNATURAS[^\n]*\n([\s\S]*?)(?=(?:^|\n)(?:##\s*)?(?:2\.\s*)?PRINCIPALES|$)/i);
  const match2 = texto.match(/(?:^|\n)(?:##\s*)?(?:2\.\s*)?PRINCIPALES[^\n]*\n([\s\S]*?)(?=(?:^|\n)(?:##\s*)?(?:3\.\s*)?(?:HABILIDADES|DESTREZAS)|$)/i);
  const match3 = texto.match(/(?:^|\n)(?:##\s*)?(?:3\.\s*)?(?:HABILIDADES|DESTREZAS)[^\n]*\n([\s\S]*?)$/i);

  if (match1) asignaturas = match1[1].trim();
  if (match2) actividades = match2[1].trim();
  if (match3) habilidades = match3[1].trim();

  // Fallback si la sección 3 no vino o quedó vacía
  if (!habilidades) {
    habilidades = `• Aplicación de buenas prácticas de desarrollo de software y arquitectura limpia modular.\n• Diseño e integración de bases de datos relacionales y NoSQL con consultas y agregaciones optimizadas.\n• Implementación y aseguramiento de APIs RESTful con autenticación JWT y control de acceso basado en roles.\n• Trabajo colaborativo con control de versiones Git y metodologías ágiles.\n• Autonomía en la resolución de problemas técnicos y elaboración de documentación formal.`;
  }

  if (!actividades && !asignaturas) {
    actividades = texto.trim();
  }

  return {
    asignaturas: limpiarTextoParaExcel(asignaturas),
    actividades: limpiarTextoParaExcel(actividades),
    habilidades: limpiarTextoParaExcel(habilidades)
  };
}

function parsearSeccionesComunitario(texto) {
  let resumen = '';
  let contribucion = '';
  let resultados = '';
  let asignaturas = '';

  const match1 = texto.match(/(?:^|\n)(?:##\s*)?(?:1\.\s*)?(?:BREVE\s*)?RESUMEN[^\n]*\n([\s\S]*?)(?=(?:^|\n)(?:##\s*)?(?:2\.\s*)?(?:CONTRIBUCI|APLICACI)|$)/i);
  const match2 = texto.match(/(?:^|\n)(?:##\s*)?(?:2\.\s*)?(?:CONTRIBUCI|APLICACI)[^\n]*\n([\s\S]*?)(?=(?:^|\n)(?:##\s*)?(?:3\.\s*)?(?:RESULTADOS|COMPETENCIAS)|$)/i);
  const match3 = texto.match(/(?:^|\n)(?:##\s*)?(?:3\.\s*)?(?:RESULTADOS|COMPETENCIAS)[^\n]*\n([\s\S]*?)(?=(?:^|\n)(?:##\s*)?(?:4\.\s*)?(?:ASIGNATURAS|MALLA)|$)/i);
  const match4 = texto.match(/(?:^|\n)(?:##\s*)?(?:4\.\s*)?(?:ASIGNATURAS|MALLA)[^\n]*\n([\s\S]*?)$/i);

  if (match1) resumen = match1[1].trim();
  if (match2) contribucion = match2[1].trim();
  if (match3) resultados = match3[1].trim();
  if (match4) asignaturas = match4[1].trim();

  // Fallbacks elegantes si alguna sección no vino
  if (!resumen && !contribucion) {
    resumen = texto.trim();
  }
  if (!contribucion) {
    contribucion = `• Aplicación práctica de conceptos de arquitectura de software y alfabetización digital en sectores comunitarios.\n• Fortalecimiento de la comunicación asertiva, paciencia didáctica y empatía para la transferencia tecnológica a diversos grupos de edad.\n• Capacidad de diagnóstico, mantenimiento preventivo de equipos y resolución autónoma de problemas técnicos.`;
  }
  if (!resultados) {
    resultados = `• Compromiso ético y responsabilidad social con las comunidades y sectores vulnerables.\n• Conciencia del impacto de la tecnología en la inclusión digital y educativa.\n• Trabajo colaborativo, liderazgo participativo y vocación de servicio ciudadano politécnico.`;
  }
  if (!asignaturas) {
    asignaturas = `• Programación y Algoritmos: Estructuración lógica de talleres y fundamentos de desarrollo.\n• Bases de Datos: Organización de inventarios de productos y catálogos comunitarios.\n• Desarrollo Web y Redes: Configuración de redes locales, mantenimiento de laboratorios y presencia digital básica.`;
  }

  return {
    resumen: limpiarTextoParaExcel(resumen),
    contribucion: limpiarTextoParaExcel(contribucion),
    resultados: limpiarTextoParaExcel(resultados),
    asignaturas: limpiarTextoParaExcel(asignaturas)
  };
}

export const asistenteIaService = {
  /**
   * Consulta normativa interactiva mediante RAG (Groq Cloud + fragmentos MongoDB)
   */
  async consultarNormativa(pregunta) {
    if (!pregunta || typeof pregunta !== 'string' || !pregunta.trim()) {
      throw errorHttp('Debe ingresar una pregunta o consulta normativa', 400);
    }

    const textoLimpio = pregunta.trim();

    // 1. Extraer palabras clave de la pregunta (ignorando artículos y preposiciones comunes)
    const palabrasIgnoradas = new Set([
      'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
      'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
      'este', 'si', 'porque', 'esta', 'son', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'mi',
      'donde', 'como', 'cuanto', 'cuantas', 'cuantos', 'puedo', 'hacer', 'tengo', 'horas'
    ]);

    const terminos = textoLimpio
      .toLowerCase()
      .replace(/[^\wáéíóúüñ\s]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !palabrasIgnoradas.has(w));

    // 2. Recuperar fragmentos relevantes de las fuentes normativas activas en MongoDB
    const fuentes = await FuenteInstitucional.find({ activo: true });
    const fragmentosCoincidentes = [];

    for (const fuente of fuentes) {
      for (const frag of fuente.fragmentos) {
        const textoFrag = frag.texto.toLowerCase();
        let coincidencias = 0;
        for (const t of terminos) {
          if (textoFrag.includes(t)) coincidencias++;
        }

        if (coincidencias > 0) {
          fragmentosCoincidentes.push({
            fuente: fuente.titulo,
            categoria: fuente.categoria,
            orden: frag.orden,
            texto: frag.texto,
            score: coincidencias
          });
        }
      }
    }

    // Ordenar por relevancia y tomar hasta los 4 mejores fragmentos
    fragmentosCoincidentes.sort((a, b) => b.score - a.score);
    const fragmentosContexto = fragmentosCoincidentes.slice(0, 4);

    const contextoTexto = fragmentosContexto.length > 0
      ? fragmentosContexto.map((f, i) => `[Fragmento ${i + 1} - ${f.fuente}]:\n${f.texto}`).join('\n\n')
      : 'Normativa institucional general de prácticas preprofesionales y comunitarias de la ESFOT - EPN (CD-050-2024).';

    // 3. Consultar a Groq Cloud (LLaMA 3.3) o responder con fragmento oficial
    const groq = getGroqClient();
    let respuestaFinal = '';

    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_completion_tokens: 650,
          messages: [
            {
              role: 'system',
              content: `Eres el Asistente Virtual Inteligente oficial de la Escuela de Formación de Tecnólogos (ESFOT) de la Escuela Politécnica Nacional (EPN).
Tu misión es resolver dudas estudiantiles sobre el proceso de Prácticas Preprofesionales (Laborales 240 horas y Servicio Comunitario 96 horas), convalidaciones y reglamentos.
Responde de forma concisa, educada, empática y rigurosamente apegada a los fragmentos normativos provistos.
Cita los requisitos exactos, límites de horas o nombres de formularios cuando corresponda (ej. FP-001, FCP_001A, F_AA_119). Si algo no consta en la normativa, indica amablemente que debe consultar con la Comisión de Prácticas.`
            },
            {
              role: 'user',
              content: `INFORMACIÓN NORMATIVA DE LA ESFOT DISPONIBLE:\n${contextoTexto}\n\nPREGUNTA DEL ESTUDIANTE:\n"${textoLimpio}"\n\nPor favor, responde la consulta con base en la información institucional proporcionada.`
            }
          ]
        });

        respuestaFinal = completion.choices[0]?.message?.content || 'No se obtuvo respuesta del modelo de lenguaje.';
      } catch (err) {
        respuestaFinal = `Según la normativa institucional de la ESFOT (Resolución CD-050-2024):\n\n${fragmentosContexto[0]?.texto || 'Para más información, revisa el reglamento oficial en la secretaría académica.'}`;
      }
    } else {
      // Fallback sin API Key: entrega el fragmento normativo exacto recuperado de MongoDB
      respuestaFinal = fragmentosContexto.length > 0
        ? `Información normativa oficial de la ESFOT:\n\n${fragmentosContexto[0].texto}`
        : 'Para consultar los requisitos específicos, acércate a la secretaría académica de la ESFOT o consulta el reglamento institucional.';
    }

    return {
      success: true,
      pregunta: textoLimpio,
      respuesta: respuestaFinal,
      totalFuentesEncontradas: fragmentosContexto.length,
      fragmentosConsultados: fragmentosContexto.map((f) => ({
        fuente: f.fuente,
        categoria: f.categoria,
        extracto: f.texto.substring(0, 160) + '...'
      }))
    };
  },

  /**
   * Genera el borrador técnico del informe de prácticas laborales (F_AA_119) mediante IA
   */
  async generarReporteLaboralIA(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para generar reportes en esta aula', 403);
    }

    if (aula.modalidad !== MODALIDADES.LABORAL) {
      throw errorHttp('Esta aula virtual no pertenece a la modalidad de Prácticas Laborales', 400);
    }

    const actividadesAprobadas = await ActividadLaboral.find({
      aulaVirtual: aulaId,
      estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO
    }).sort({ fecha: 1 });

    const horasAprobadas = actividadesAprobadas.reduce((acc, act) => acc + act.horas, 0);

    if (horasAprobadas < aula.horasRequeridas) {
      throw errorHttp(
        `Para generar el informe técnico final con IA debes haber completado y tener aprobadas las ${aula.horasRequeridas} horas reglamentarias. Actualmente cuentas con ${horasAprobadas}h aprobadas de ${aula.horasRequeridas}h.`,
        400
      );
    }

    const detalleBitacoras = actividadesAprobadas
      .map((a, idx) => `Día ${idx + 1} (${a.horas}h): ${a.descripcion}`)
      .join('\n');

    const groq = getGroqClient();
    let textoGenerado = '';

    if (groq) {
      try {
        const prompt = `Actúa como asesor académico de la carrera Tecnología Superior en Desarrollo de Software de la ESFOT - EPN.
Analiza la siguiente bitácora de actividades aprobadas realizadas por un estudiante en sus Prácticas Laborales y redacta el Informe Oficial F_AA_119.

BITÁCORA DE ACTIVIDADES:
${detalleBitacoras}

MALLA CURRICULAR DE REFERENCIA (TSDS):
- Programación (TDSD214)
- Algoritmos y Estructura de Datos (TDSD222)
- Programación Orientada a Objetos (TDSD314)
- Bases de Datos (TDSD343)
- Diseño de Interfaces (TDSD322)
- Gestión de Proyectos de Software (TDSD333)
- Desarrollo de Aplicaciones Web (TDSD414)
- Desarrollo de Aplicaciones Móviles (TDSD514)
- Tecnologías de Seguridad (TDSD532)

REGLAS DE FORMATO CRÍTICAS PARA HOJA DE EXCEL:
- El resultado se inyectará directamente en una plantilla oficial de Excel.
- ESTÁ ESTRICTAMENTE PROHIBIDO usar sintaxis de tablas Markdown (|---|---|), encabezados Markdown (### o ##), o negritas con asteriscos (**texto**).
- Escribe texto formal continuo, párrafos limpios y viñetas con el punto (•).
- Genera OBLIGATORIAMENTE las siguientes 3 secciones completas en español:

1. ASIGNATURAS DE LA CARRERA Y TEMÁTICAS DE MAYOR UTILIDAD:
(Selecciona de 2 a 4 asignaturas con sus códigos e indica en viñetas qué temáticas fueron aplicadas).

2. PRINCIPALES ACTIVIDADES DESARROLLADAS:
(Resume en 4 a 6 viñetas técnicas los módulos, desarrollos y tareas implementadas, sin listar día por día ni usar tablas).

3. HABILIDADES, DESTREZAS O CONOCIMIENTOS ADQUIRIDOS:
(Describe en 4 a 5 viñetas las competencias técnicas, metodológicas y blandas consolidadas durante la práctica).`;

        const completion = await groq.chat.completions.create({
          model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_completion_tokens: 2200,
          messages: [{ role: 'user', content: prompt }]
        });

        textoGenerado = completion.choices[0]?.message?.content || '';
      } catch (err) {
        // Fallback en caso de error de red o cuota en Groq
        textoGenerado = '';
      }
    }

    if (!textoGenerado) {
      // Síntesis curricular predeterminada basada en la malla de software
      textoGenerado = `1. ASIGNATURAS DE LA CARRERA Y TEMÁTICAS DE MAYOR UTILIDAD:
• Desarrollo de Aplicaciones Web (TDSD414): Arquitectura de software cliente-servidor, desarrollo de APIs RESTful y gestión de middlewares.
• Bases de Datos (TDSD343): Modelado de colecciones NoSQL, consultas indexadas y persistencia de datos.
• Gestión de Proyectos de Software (TDSD333): Control de requerimientos, metodología ágil por sprints y documentación técnica.

2. PRINCIPALES ACTIVIDADES DESARROLLADAS:
Durante el período de prácticas se ejecutaron las siguientes actividades técnicas:
${actividadesAprobadas.slice(0, 5).map((a) => `• ${a.descripcion}`).join('\n')}

3. HABILIDADES, DESTREZAS O CONOCIMIENTOS ADQUIRIDOS:
• Implementación de patrones de diseño limpios y arquitectura modular en Node.js.
• Aseguramiento de calidad, control de acceso basado en roles (RBAC) y validación de esquemas de datos.
• Trabajo en equipo, resolución autónoma de incidentes y redacción de informes técnicos.`;
    }

    const secciones = parsearSeccionesLaboral(textoGenerado);

    const primerRegistro = actividadesAprobadas[0];
    const horaEntrada = primerRegistro?.horaEntrada || '08:00';
    const horaSalida = primerRegistro?.horaSalida || '16:30';
    const horasDiarias = primerRegistro?.horas || 8;
    const horasSemanales = Math.min(40, horasDiarias * 5);

    // Almacenar en la colección formularios_pendientes para permitir edición humana y descarga sin gastar tokens
    const formPendiente = await FormularioPendiente.findOneAndUpdate(
      { aulaVirtual: aulaId },
      {
        aulaVirtual: aulaId,
        estudiante: estudianteId,
        modalidad: MODALIDADES.LABORAL,
        estado: 'borrador',
        $set: {
          'horarioSemanal.horaInicio': horaEntrada,
          'horarioSemanal.horaFin': horaSalida,
          'horarioSemanal.horasSemanales': horasSemanales,
          'contenidoIa.asignaturasUtilidad': secciones.asignaturas,
          'contenidoIa.principalesActividades': secciones.actividades,
          'contenidoIa.habilidadesAdquiridas': secciones.habilidades,
          'contenidoIa.observacionesTemas': 'Cumplimiento satisfactorio del plan formativo institucional.',
          'contenidoIa.informeGeneradoTexto': textoGenerado,
          totalHoras: horasAprobadas,
          fechaGeneracionIa: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      success: true,
      aulaId,
      formularioPendienteId: formPendiente._id,
      totalActividadesAnalizadas: actividadesAprobadas.length,
      horasAprobadas,
      seccionesParseadas: secciones,
      informeGenerado: textoGenerado
    };
  },

  /**
   * Genera la memoria descriptiva y de impacto social para Servicio Comunitario mediante IA
   */
  async generarReporteComunitarioIA(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para generar reportes en esta aula', 403);
    }

    if (aula.modalidad !== MODALIDADES.COMUNITARIO) {
      throw errorHttp('Esta aula virtual no pertenece a la modalidad de Servicio Comunitario', 400);
    }

    const actividadesAprobadas = await ActividadComunitaria.find({
      aulaVirtual: aulaId,
      estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO
    }).sort({ fecha: 1 });

    const horasAprobadas = actividadesAprobadas.reduce((acc, act) => acc + act.horas, 0);

    if (horasAprobadas < aula.horasRequeridas) {
      throw errorHttp(
        `Para generar el informe de servicio comunitario con IA debes haber completado y tener aprobadas las ${aula.horasRequeridas} horas reglamentarias. Actualmente cuentas con ${horasAprobadas}h aprobadas de ${aula.horasRequeridas}h.`,
        400
      );
    }

    const detalle = actividadesAprobadas
      .map((a, i) => `Actividad ${i + 1}: ${a.comunidadOInstitucion} (${a.horas}h, ~${a.beneficiariosAproximados} beneficiarios). Descripción: ${a.descripcion}`)
      .join('\n');

    const groq = getGroqClient();
    let textoGenerado = '';

    if (groq) {
      try {
        const prompt = `Actúa como asesor académico y coordinador de Vinculación y Servicio Comunitario de la Escuela de Formación de Tecnólogos (ESFOT) de la Escuela Politécnica Nacional (EPN).
A partir de la siguiente bitácora de actividades comunitarias aprobadas (96 horas reglamentarias), redacta el Informe Oficial FCP_001A para la convalidación y reconocimiento de Servicio Comunitario.

ACTIVIDADES REALIZADAS:
${detalle}

MALLA CURRICULAR DE REFERENCIA (TSDS):
- Programación y Algoritmos
- Bases de Datos
- Desarrollo de Aplicaciones Web
- Redes y Conectividad
- Tecnologías de Seguridad
- Formación y Ética Social

REGLAS DE FORMATO CRÍTICAS PARA HOJA DE EXCEL:
- El resultado se inyectará directamente en una plantilla oficial de Excel.
- ESTÁ ESTRICTAMENTE PROHIBIDO usar sintaxis de tablas Markdown (|---|---|), encabezados Markdown (### o ##), o negritas con asteriscos (**texto**).
- Escribe texto formal continuo, párrafos limpios y viñetas con el punto (•).
- Genera OBLIGATORIAMENTE las siguientes 4 secciones completas en español:

1. BREVE RESUMEN DE LAS ACTIVIDADES REALIZADAS:
(Sintetiza en 4 a 6 viñetas limpias las intervenciones, instituciones beneficiarias, talleres y labores tecnológicas desarrolladas).

2. CONTRIBUCION A LA APLICACION DE CONOCIMIENTOS Y DESARROLLO DE HABILIDADES:
(Explica en 3 a 5 viñetas cómo el estudiante aplicó sus conocimientos de desarrollo de software y qué habilidades prácticas fortaleció al interactuar con las comunidades).

3. RESULTADOS DE APRENDIZAJE DEL PERFIL DE EGRESO:
(Detalla en 3 a 4 viñetas las competencias cívicas, ciudadanas, éticas y de responsabilidad social consolidadas).

4. ASIGNATURAS DE LA MALLA CURRICULAR RELACIONADAS:
(Lista de 2 a 4 asignaturas aplicadas con viñetas descriptivas).`;

        const completion = await groq.chat.completions.create({
          model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_completion_tokens: 2200,
          messages: [{ role: 'user', content: prompt }]
        });

        textoGenerado = completion.choices[0]?.message?.content || '';
      } catch (err) {
        textoGenerado = '';
      }
    }

    if (!textoGenerado) {
      const totalBeneficiarios = actividadesAprobadas.reduce((acc, a) => acc + (a.beneficiariosAproximados || 0), 0);
      textoGenerado = `1. BREVE RESUMEN DE LAS ACTIVIDADES REALIZADAS:
Se cumplieron actividades orientadas al fortalecimiento comunitario e institucional (${totalBeneficiarios} beneficiarios estimados):
${actividadesAprobadas.map((a) => `• ${a.comunidadOInstitucion}: ${a.descripcion} (${a.horas} horas)`).join('\n')}

2. CONTRIBUCION A LA APLICACION DE CONOCIMIENTOS Y DESARROLLO DE HABILIDADES:
• Aplicación de competencias técnicas en entornos comunitarios para resolver necesidades de inclusión digital.
• Fortalecimiento de la comunicación pedagógica y empatía con usuarios no técnicos.
• Gestión y diagnóstico ágil en el mantenimiento preventivo y configuración de entornos tecnológicos.

3. RESULTADOS DE APRENDIZAJE DEL PERFIL DE EGRESO:
• Compromiso ético y responsabilidad social con las comunidades y sectores vulnerables.
• Conciencia del rol del desarrollo de software en la superación de la brecha digital.
• Trabajo en equipo, proactividad institucional y vocación de servicio ciudadano.

4. ASIGNATURAS DE LA MALLA CURRICULAR RELACIONADAS:
• Programación y Algoritmos: Estructuración lógica de talleres y fundamentos de desarrollo.
• Bases de Datos: Organización de inventarios de productos y catálogos comunitarios.
• Desarrollo Web y Redes: Mantenimiento de salas de cómputo, redes locales e inclusión digital.`;
    }

    const secciones = parsearSeccionesComunitario(textoGenerado);

    // Almacenar en la colección formularios_pendientes
    const formPendiente = await FormularioPendiente.findOneAndUpdate(
      { aulaVirtual: aulaId },
      {
        aulaVirtual: aulaId,
        estudiante: estudianteId,
        modalidad: MODALIDADES.COMUNITARIO,
        estado: 'borrador',
        $set: {
          'contenidoIa.resumenActividades': secciones.resumen,
          'contenidoIa.contribucionConocimientos': secciones.contribucion,
          'contenidoIa.resultadosAprendizaje': secciones.resultados,
          'contenidoIa.asignaturasMalla': secciones.asignaturas,
          'contenidoIa.informeGeneradoTexto': textoGenerado,
          totalHoras: horasAprobadas,
          fechaGeneracionIa: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      success: true,
      aulaId,
      formularioPendienteId: formPendiente._id,
      totalActividadesAnalizadas: actividadesAprobadas.length,
      horasAprobadas,
      seccionesParseadas: secciones,
      informeGenerado: textoGenerado
    };
  }
};

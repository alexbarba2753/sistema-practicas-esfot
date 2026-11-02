import Groq from 'groq-sdk';
import { ENV } from '../../infrastructure/config/env.js';
import { FuenteInstitucional, AulaVirtual, ActividadLaboral, ActividadComunitaria } from '../../infrastructure/database/models/index.js';
import { ESTADOS_ACTIVIDAD, MODALIDADES } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';

let groqClient = null;
const getGroqClient = () => {
  if (!groqClient && ENV.GROQ_API_KEY && ENV.GROQ_API_KEY.trim()) {
    groqClient = new Groq({ apiKey: ENV.GROQ_API_KEY.trim() });
  }
  return groqClient;
};

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

    const actividades = await ActividadLaboral.find({
      aulaVirtual: aulaId,
      estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO
    }).sort({ fecha: 1 });

    const totalActividades = actividades.length > 0
      ? actividades
      : await ActividadLaboral.find({ aulaVirtual: aulaId }).sort({ fecha: 1 });

    if (totalActividades.length === 0) {
      throw errorHttp('No tienes actividades registradas en tu bitácora para generar el informe', 400);
    }

    const detalleBitacoras = totalActividades
      .map((a, idx) => `Día ${idx + 1} (${a.horas}h): ${a.descripcion}`)
      .join('\n');

    const groq = getGroqClient();
    let textoGenerado = '';

    if (groq) {
      try {
        const prompt = `Actúa como asesor académico de la carrera Tecnología Superior en Desarrollo de Software de la ESFOT - EPN.
Analiza la siguiente bitácora de actividades realizadas por un estudiante en sus Prácticas Laborales y genera un borrador formal estructurado para el Informe Oficial F_AA_119.

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

DEBES GENERAR EN ESPAÑOL LAS SIGUIENTES 3 SECCIONES OBLIGATORIAS:
1. ASIGNATURAS DE LA CARRERA Y TEMÁTICAS DE MAYOR UTILIDAD: (Selecciona de 2 a 4 asignaturas con sus códigos de la lista anterior y explica qué temas específicos fueron útiles para las tareas).
2. PRINCIPALES ACTIVIDADES DESARROLLADAS: (Redacta un resumen técnico consolidado y formal de los desarrollos, arquitecturas o módulos implementados).
3. HABILIDADES, DESTREZAS O CONOCIMIENTOS ADQUIRIDOS: (Describe las competencias técnicas, metodológicas y blandas adquiridas o fortalecidas).`;

        const completion = await groq.chat.completions.create({
          model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_completion_tokens: 1000,
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
- Desarrollo de Aplicaciones Web (TDSD414): Arquitectura de software cliente-servidor, desarrollo de APIs RESTful y gestión de middlewares.
- Bases de Datos (TDSD343): Modelado de colecciones NoSQL, consultas indexadas y persistencia de datos.
- Gestión de Proyectos de Software (TDSD333): Control de requerimientos, metodología ágil por sprints y documentación técnica.

2. PRINCIPALES ACTIVIDADES DESARROLLADAS:
Durante el período de prácticas se ejecutaron las siguientes actividades técnicas:
${totalActividades.slice(0, 5).map((a) => `- ${a.descripcion}`).join('\n')}

3. HABILIDADES, DESTREZAS O CONOCIMIENTOS ADQUIRIDOS:
- Implementación de patrones de diseño limpios y arquitectura modular.
- Aseguramiento de calidad, control de acceso basado en roles (RBAC) y validación de esquemas de datos.
- Trabajo en equipo, resolución autónoma de incidentes y redacción de informes técnicos.`;
    }

    return {
      success: true,
      aulaId,
      totalActividadesAnalizadas: totalActividades.length,
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

    const actividades = await ActividadComunitaria.find({ aulaVirtual: aulaId }).sort({ fecha: 1 });
    if (actividades.length === 0) {
      throw errorHttp('No tienes actividades comunitarias registradas para generar el informe', 400);
    }

    const detalle = actividades
      .map((a, i) => `Actividad ${i + 1}: ${a.comunidadOInstitucion} (${a.horas}h, ~${a.beneficiariosAproximados} beneficiarios). Descripción: ${a.descripcion}`)
      .join('\n');

    const groq = getGroqClient();
    let textoGenerado = '';

    if (groq) {
      try {
        const prompt = `Actúa como coordinador de Vinculación y Servicio Comunitario de la ESFOT - EPN.
A partir de las siguientes actividades comunitarias registradas por un estudiante, redacta la memoria de impacto social para el expediente de culminación:

ACTIVIDADES REPORTADAS:
${detalle}

ESTRUCTURA EL INFORME CON:
1. RESUMEN EJECUTIVO DE ACTIVIDADES SOLIDARIAS Y DE COOPERACIÓN.
2. POBLACIÓN BENEFICIARIA E IMPACTO SOCIAL LOGRADO.
3. COMPETENCIAS CIUDADANAS, ÉTICAS Y SOCIALES DESARROLLADAS.`;

        const completion = await groq.chat.completions.create({
          model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_completion_tokens: 900,
          messages: [{ role: 'user', content: prompt }]
        });

        textoGenerado = completion.choices[0]?.message?.content || '';
      } catch (err) {
        textoGenerado = '';
      }
    }

    if (!textoGenerado) {
      const totalBeneficiarios = actividades.reduce((acc, a) => acc + (a.beneficiariosAproximados || 0), 0);
      textoGenerado = `1. RESUMEN EJECUTIVO DE ACTIVIDADES SOLIDARIAS Y DE COOPERACIÓN:
Se cumplieron actividades orientadas al fortalecimiento comunitario e institucional:
${actividades.map((a) => `- ${a.comunidadOInstitucion}: ${a.descripcion} (${a.horas} horas)`).join('\n')}

2. POBLACIÓN BENEFICIARIA E IMPACTO SOCIAL LOGRADO:
Se brindó atención y soporte a un estimado de ${totalBeneficiarios} beneficiarios directos e indirectos, facilitando el acceso a herramientas digitales y procesos colaborativos.

3. COMPETENCIAS CIUDADANAS, ÉTICAS Y SOCIALES DESARROLLADAS:
- Compromiso social y vocación de servicio con sectores prioritarios.
- Comunicación asertiva y empatía en la transferencia de conocimientos tecnológicos.
- Ética profesional y responsabilidad institucional politécnica.`;
    }

    return {
      success: true,
      aulaId,
      totalActividadesAnalizadas: actividades.length,
      informeGenerado: textoGenerado
    };
  }
};

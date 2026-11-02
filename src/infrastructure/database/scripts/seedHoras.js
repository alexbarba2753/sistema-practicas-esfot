import { connectDB, disconnectDB } from '../db.js';
import { Usuario, AulaVirtual, ActividadLaboral, ActividadComunitaria } from '../models/index.js';
import { ROLES, ESTADOS_AULA, ESTADOS_ACTIVIDAD, MODALIDADES } from '../../../domain/constants/practicasConstants.js';

// Catálogo de 30 actividades laborales realistas (TSDS - ESFOT EPN)
const TAREAS_LABORALES = [
  'Levantamiento de requerimientos funcionales y diseño de diagramas de arquitectura de software.',
  'Configuración del entorno de desarrollo local con Node.js, Express y control de versiones Git.',
  'Diseño del modelo entidad-relación y esquemas de colecciones en MongoDB Atlas.',
  'Implementación de scripts de inicialización y conexión a la base de datos con Mongoose.',
  'Desarrollo del módulo de autenticación de usuarios mediante tokens JSON Web Tokens (JWT).',
  'Implementación de cifrado seguro de credenciales de usuario con la librería bcryptjs.',
  'Construcción de middlewares para validación de cabeceras de autorización y tokens expirados.',
  'Diseño y desarrollo de endpoints RESTful para la gestión del perfil de usuario.',
  'Implementación de servicio de envío de correos transaccionales para verificación de cuentas.',
  'Desarrollo del flujo de recuperación de contraseña con tokens de un solo uso.',
  'Creación de capa de servicios y separación de responsabilidades bajo arquitectura limpia.',
  'Implementación de validación de datos de entrada y manejo centralizado de excepciones HTTP.',
  'Desarrollo de controladores y rutas para la administración de aulas virtuales institucionales.',
  'Construcción de endpoints para asignación de docentes tutores y matriculación de estudiantes.',
  'Implementación de bitácoras diarias de actividades laborales con validación de jornada de 8h.',
  'Desarrollo del servicio de cálculo y auditoría de horas acumuladas en tiempo real.',
  'Diseño e integración de consultas de agregación en MongoDB para estadísticas de progreso.',
  'Implementación de filtros de seguridad por roles (RBAC) para perfiles Estudiante y Administrador.',
  'Desarrollo del servicio de consulta normativa institucional mediante modelo RAG con Groq LLaMA 3.',
  'Indexación de documentos reglamentarios oficiales de la ESFOT en la base de conocimientos.',
  'Optimización del prompt del asistente de IA para evitar alucinaciones y citar normativa oficial.',
  'Diseño de pruebas de integración con Supertest para verificar el ciclo de vida de los endpoints.',
  'Depuración de consultas a la base de datos e implementación de índices para mejorar rendimiento.',
  'Refactorización de controladores para desacoplar lógica de negocio hacia la capa de aplicación.',
  'Configuración de variables de entorno seguras para producción y entornos de prueba.',
  'Pruebas de carga y auditoría de seguridad en la transmisión de tokens y cabeceras CORS.',
  'Elaboración de la colección de pruebas en Postman con scripts de extracción dinámica de variables.',
  'Corrección de errores reportados en la validación cruzada entre modalidades de prácticas.',
  'Generación automatizada de borradores de informes técnicos de convalidación con IA.',
  'Revisión final de código, documentación técnica del repositorio y preparación para entrega formal.'
];

// Catálogo de 4 actividades comunitarias (96 horas en total = 24h cada una)
const TAREAS_COMUNITARIAS = [
  {
    horas: 24,
    institucion: 'Fundación Social Renacer Quito',
    beneficiarios: 45,
    descripcion: 'Capacitación en alfabetización digital, navegación segura en internet y herramientas ofimáticas básicas dirigida a adultos mayores de la comunidad.'
  },
  {
    horas: 24,
    institucion: 'Escuela de Educación Básica Comunitaria San José',
    beneficiarios: 120,
    descripcion: 'Mantenimiento preventivo y correctivo del laboratorio de cómputo institucional, instalación de software educativo y configuración de red local.'
  },
  {
    horas: 24,
    institucion: 'Centro Parroquial de Juventudes',
    beneficiarios: 35,
    descripcion: 'Taller participativo de introducción a la lógica computacional, algoritmia y robótica educativa para jóvenes de escasos recursos económicos.'
  },
  {
    horas: 24,
    institucion: 'Asociación Barrial de Emprendedores del Sur',
    beneficiarios: 60,
    descripcion: 'Asesoría técnica y desarrollo de un catálogo digital básico para visibilizar productos locales y optimizar la gestión comercial de pequeños emprendedores.'
  }
];

export async function sembrarHoras(correoEstudiante = null) {
  try {
    console.log('\n============================================================');
    console.log('   ESFOT - EPN: SCRIPT SEEDER DE HORAS PARA PRUEBAS (CLI)   ');
    console.log('============================================================\n');

    await connectDB();

    // 1. Localizar al estudiante
    let estudiante = null;
    if (correoEstudiante) {
      estudiante = await Usuario.findOne({ correo: correoEstudiante.trim().toLowerCase(), rol: ROLES.ESTUDIANTE });
      if (!estudiante) {
        console.error(`[Error] No se encontró ningún estudiante con el correo: ${correoEstudiante}`);
        process.exit(1);
      }
    } else {
      // Buscar el primer estudiante con aulas o el primero registrado
      estudiante = await Usuario.findOne({ rol: ROLES.ESTUDIANTE }).sort({ createdAt: -1 });
      if (!estudiante) {
        console.error('[Error] No existen estudiantes en la base de datos. Por favor crea o registra uno primero.');
        process.exit(1);
      }
    }

    console.log(`[Estudiante Seleccionado] ${estudiante.nombres} ${estudiante.apellidos} (${estudiante.correo})`);

    // 2. Localizar o asegurar un docente tutor
    let docente = await Usuario.findOne({ rol: ROLES.DOCENTE });
    if (!docente) {
      docente = await Usuario.create({
        nombres: 'Tutor',
        apellidos: 'Institucional ESFOT',
        correo: 'docente.tutor@epn.edu.ec',
        password: 'Password123!',
        cedula: '1720001122',
        telefono: '0990001122',
        rol: ROLES.DOCENTE,
        correoVerificado: true,
        estado: 'activo'
      });
      console.log(`[Docente Creado] ${docente.nombres} ${docente.apellidos} (${docente.correo})`);
    }

    // 3. Procesar Aula de Prácticas Laborales
    let aulaLaboral = await AulaVirtual.findOne({
      estudiante: estudiante._id,
      modalidad: MODALIDADES.LABORAL
    });

    if (!aulaLaboral) {
      aulaLaboral = await AulaVirtual.create({
        nombre: 'Prácticas Laborales TSDS - 2024-B',
        codigo: 'PRAC-LAB-' + Math.floor(1000 + Math.random() * 9000),
        modalidad: MODALIDADES.LABORAL,
        horasRequeridas: 240,
        periodo: '2024-B',
        fechaInicio: new Date(Date.now() - 60 * 24 * 3600 * 1000),
        fechaFin: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        estudiante: estudiante._id,
        docenteTutor: docente._id,
        estado: ESTADOS_AULA.ABIERTA
      });
      console.log(`(+) Creada aula laboral de prueba: "${aulaLaboral.nombre}" (ID: ${aulaLaboral._id})`);
    } else {
      console.log(`[Aula Laboral Encontrada] "${aulaLaboral.nombre}" (ID: ${aulaLaboral._id})`);
    }

    // Limpiar bitácoras previas del aula para evitar duplicados en la prueba
    await ActividadLaboral.deleteMany({ aulaVirtual: aulaLaboral._id });

    // Sembrar 30 días x 8h = 240 horas
    const fechaBase = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    const actividadesLaboralesInsertar = [];

    for (let i = 0; i < 30; i++) {
      const fechaDia = new Date(fechaBase.getTime() + i * 24 * 3600 * 1000);
      actividadesLaboralesInsertar.push({
        estudiante: estudiante._id,
        aulaVirtual: aulaLaboral._id,
        fecha: fechaDia,
        horaEntrada: '08:00',
        horaSalida: '16:30',
        horas: 8,
        descripcion: TAREAS_LABORALES[i] || `Desarrollo de módulos de software del proyecto - Jornada ${i + 1}`,
        estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO,
        observacionesDocente: 'Actividad técnica validada y aprobada conforme a los objetivos de la práctica.'
      });
    }

    await ActividadLaboral.insertMany(actividadesLaboralesInsertar);
    console.log(`✔ [Prácticas Laborales] Se registraron exitosamente 30 actividades (240 HORAS APROBADAS).`);

    // 4. Procesar Aula de Servicio Comunitario
    let aulaComunitaria = await AulaVirtual.findOne({
      estudiante: estudiante._id,
      modalidad: MODALIDADES.COMUNITARIO
    });

    if (!aulaComunitaria) {
      aulaComunitaria = await AulaVirtual.create({
        nombre: 'Servicio Comunitario TSDS - 2024-B',
        codigo: 'SERV-COM-' + Math.floor(1000 + Math.random() * 9000),
        modalidad: MODALIDADES.COMUNITARIO,
        horasRequeridas: 96,
        periodo: '2024-B',
        fechaInicio: new Date(Date.now() - 45 * 24 * 3600 * 1000),
        fechaFin: new Date(Date.now() + 45 * 24 * 3600 * 1000),
        estudiante: estudiante._id,
        docenteTutor: docente._id,
        estado: ESTADOS_AULA.ABIERTA
      });
      console.log(`(+) Creada aula comunitaria de prueba: "${aulaComunitaria.nombre}" (ID: ${aulaComunitaria._id})`);
    } else {
      console.log(`[Aula Comunitaria Encontrada] "${aulaComunitaria.nombre}" (ID: ${aulaComunitaria._id})`);
    }

    // Limpiar actividades comunitarias previas
    await ActividadComunitaria.deleteMany({ aulaVirtual: aulaComunitaria._id });

    const actividadesComunitariasInsertar = TAREAS_COMUNITARIAS.map((t, idx) => ({
      estudiante: estudiante._id,
      aulaVirtual: aulaComunitaria._id,
      fecha: new Date(Date.now() - (20 - idx * 5) * 24 * 3600 * 1000),
      horas: t.horas,
      comunidadOInstitucion: t.institucion,
      beneficiariosAproximados: t.beneficiarios,
      descripcion: t.descripcion,
      archivoEvidenciaUrl: 'https://esfot.epn.edu.ec/evidencias/comunitario_cert_' + (idx + 1) + '.pdf',
      estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO,
      observacionesDocente: 'Horas comunitarias verificadas y acreditadas favorablemente.'
    }));

    await ActividadComunitaria.insertMany(actividadesComunitariasInsertar);
    console.log(`✔ [Servicio Comunitario] Se registraron exitosamente 4 actividades (96 HORAS APROBADAS).`);

    console.log('\n============================================================');
    console.log('   ¡SIMULACIÓN COMPLETADA EXITOSAMENTE!                     ');
    console.log(`   - Laborales:   240/240 horas aprobadas (Aula ID: ${aulaLaboral._id})`);
    console.log(`   - Comunitarias: 96/96 horas aprobadas  (Aula ID: ${aulaComunitaria._id})`);
    console.log('   Ya puedes ir a Postman y probar la generación de informes');
    console.log('   asistida por IA con los 30 días analizados en vivo.');
    console.log('============================================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error Fatal al sembrar horas]:', error.message);
    process.exit(1);
  }
}

// Ejecución directa si se invoca por CLI
const correoArg = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
sembrarHoras(correoArg);

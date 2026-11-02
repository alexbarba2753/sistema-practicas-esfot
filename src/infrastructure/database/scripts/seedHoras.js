import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../db.js';
import { ENV } from '../../config/env.js';
import { Usuario, AulaVirtual, ActividadLaboral, ActividadComunitaria, FormularioAprobacion } from '../models/index.js';
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

export async function sembrarHorasDemo() {
  try {
    console.log('\n============================================================');
    console.log('   ESFOT - EPN: GENERADOR DE AMBIENTE DEMO Y HORAS (CLI)   ');
    console.log('   (Crea usuario, aulas y horas exclusivas para pruebas)   ');
    console.log('============================================================\n');

    await connectDB();

    const CORREO_DEMO_ESTUDIANTE = 'estudiante.demo@epn.edu.ec';
    const CORREO_DEMO_DOCENTE = 'docente.demo@epn.edu.ec';

    // 1. Limpiar ambiente demo previo si ya existía (sin tocar ningún otro usuario)
    const demoEstudiantePrevio = await Usuario.findOne({ correo: CORREO_DEMO_ESTUDIANTE });
    if (demoEstudiantePrevio) {
      const aulasPrevias = await AulaVirtual.find({ estudiante: demoEstudiantePrevio._id });
      for (const a of aulasPrevias) {
        await ActividadLaboral.deleteMany({ aulaVirtual: a._id });
        await ActividadComunitaria.deleteMany({ aulaVirtual: a._id });
        await FormularioAprobacion.deleteMany({ aulaVirtual: a._id });
      }
      await AulaVirtual.deleteMany({ estudiante: demoEstudiantePrevio._id });
      await Usuario.deleteOne({ _id: demoEstudiantePrevio._id });
      console.log('[Limpieza] Ambiente demo anterior eliminado para generar uno nuevo e impecable.');
    }

    // 2. Crear docente demo (o reutilizar si ya existe)
    let demoDocente = await Usuario.findOne({ correo: CORREO_DEMO_DOCENTE });
    if (!demoDocente) {
      demoDocente = await Usuario.create({
        nombres: 'Tutor Demo',
        apellidos: 'ESFOT Pruebas',
        correo: CORREO_DEMO_DOCENTE,
        password: 'Password123!',
        cedula: '1729990001',
        telefono: '0990000001',
        rol: ROLES.DOCENTE,
        correoVerificado: true,
        estado: 'activo'
      });
      console.log(`(+) Docente Demo creado: ${demoDocente.correo}`);
    }

    // 3. Crear estudiante demo nuevo e independiente
    const demoEstudiante = await Usuario.create({
      nombres: 'Estudiante Demo',
      apellidos: 'Pruebas Completas',
      correo: CORREO_DEMO_ESTUDIANTE,
      password: 'Password123!',
      cedula: '1729990002',
      telefono: '0990000002',
      rol: ROLES.ESTUDIANTE,
      correoVerificado: true,
      estado: 'activo'
    });
    console.log(`(+) Estudiante Demo creado: ${demoEstudiante.correo} (ID: ${demoEstudiante._id})`);

    // 4. Crear Aula Laboral Demo (240 Horas)
    const aulaLaboral = await AulaVirtual.create({
      nombre: 'Prácticas Laborales - Demo Completa 240h',
      codigo: 'PRAC-LAB-DEMO-' + Math.floor(1000 + Math.random() * 9000),
      modalidad: MODALIDADES.LABORAL,
      horasRequeridas: 240,
      periodo: '2024-B',
      fechaInicio: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      fechaFin: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      estudiante: demoEstudiante._id,
      docenteTutor: demoDocente._id,
      estado: ESTADOS_AULA.ABIERTA,
      expedienteEntregado: false
    });
    console.log(`(+) Aula Laboral Demo creada: "${aulaLaboral.nombre}" (ID: ${aulaLaboral._id})`);

    // Sembrar 30 actividades de 8h = 240h aprobadas
    const fechaBaseLaboral = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    const actividadesLaborales = [];
    for (let i = 0; i < 30; i++) {
      actividadesLaborales.push({
        estudiante: demoEstudiante._id,
        aulaVirtual: aulaLaboral._id,
        fecha: new Date(fechaBaseLaboral.getTime() + i * 24 * 3600 * 1000),
        horaEntrada: '08:00',
        horaSalida: '16:30',
        horas: 8,
        descripcion: TAREAS_LABORALES[i] || `Desarrollo de componentes del sistema - Día ${i + 1}`,
        estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO,
        observacionesDocente: 'Actividad técnica validada y aprobada.'
      });
    }
    await ActividadLaboral.insertMany(actividadesLaborales);
    console.log(`✔ [Prácticas Laborales] Se registraron 30 bitácoras (240 HORAS APROBADAS).`);

    // 5. Crear Aula Comunitaria Demo (96 Horas)
    const aulaComunitaria = await AulaVirtual.create({
      nombre: 'Servicio Comunitario - Demo Completa 96h',
      codigo: 'SERV-COM-DEMO-' + Math.floor(1000 + Math.random() * 9000),
      modalidad: MODALIDADES.COMUNITARIO,
      horasRequeridas: 96,
      periodo: '2024-B',
      fechaInicio: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      fechaFin: new Date(Date.now() + 45 * 24 * 3600 * 1000),
      estudiante: demoEstudiante._id,
      docenteTutor: demoDocente._id,
      estado: ESTADOS_AULA.ABIERTA,
      expedienteEntregado: false
    });
    console.log(`(+) Aula Comunitaria Demo creada: "${aulaComunitaria.nombre}" (ID: ${aulaComunitaria._id})`);

    // Sembrar 4 actividades comunitarias = 96h aprobadas
    const actividadesComunitarias = TAREAS_COMUNITARIAS.map((t, idx) => ({
      estudiante: demoEstudiante._id,
      aulaVirtual: aulaComunitaria._id,
      fecha: new Date(Date.now() - (20 - idx * 5) * 24 * 3600 * 1000),
      horas: t.horas,
      comunidadOInstitucion: t.institucion,
      beneficiariosAproximados: t.beneficiarios,
      descripcion: t.descripcion,
      archivoEvidenciaUrl: 'https://esfot.epn.edu.ec/evidencias/demo_cert_' + (idx + 1) + '.pdf',
      estadoAprobacion: ESTADOS_ACTIVIDAD.APROBADO,
      observacionesDocente: 'Horas comunitarias verificadas y acreditadas.'
    }));
    await ActividadComunitaria.insertMany(actividadesComunitarias);
    console.log(`✔ [Servicio Comunitario] Se registraron 4 actividades (96 HORAS APROBADAS).`);

    // 6. Generar Token JWT de autenticación listo para usar en Postman
    const tokenDemo = jwt.sign(
      {
        id: demoEstudiante._id.toString(),
        correo: demoEstudiante.correo,
        rol: demoEstudiante.rol,
        nombres: demoEstudiante.nombres,
        apellidos: demoEstudiante.apellidos
      },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('\n================================================================================');
    console.log('   DATOS DEL AMBIENTE DEMO GENERADO (LISTO PARA POSTMAN)                       ');
    console.log('================================================================================');
    console.log(`   USUARIO ESTUDIANTE DEMO:`);
    console.log(`   - Correo:              ${CORREO_DEMO_ESTUDIANTE}`);
    console.log(`   - Contraseña:          Password123!`);
    console.log(`   - ID Estudiante:       ${demoEstudiante._id}`);
    console.log(`\n   AULAS VIRTUALES CON 100% DE HORAS APROBADAS:`);
    console.log(`   - Aula Laboral ID:     ${aulaLaboral._id}  (240h cumplidas para probar reporte laboral IA)`);
    console.log(`   - Aula Comunitaria ID: ${aulaComunitaria._id}  (96h cumplidas para probar reporte comunitario IA)`);
    console.log(`\n   TOKEN JWT (Copia y pega en Postman Authorization -> Bearer Token):`);
    console.log(`   ${tokenDemo}`);
    console.log('================================================================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error Fatal al sembrar ambiente demo]:', error.message);
    process.exit(1);
  }
}

sembrarHorasDemo();

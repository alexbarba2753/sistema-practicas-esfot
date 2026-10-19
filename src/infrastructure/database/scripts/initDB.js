import { connectDB, disconnectDB } from '../db.js';
import {
  Usuario,
  AulaVirtual,
  ActividadLaboral,
  ActividadComunitaria,
  FuenteInstitucional,
  FormularioAprobacion
} from '../models/index.js';
import { ROLES } from '../../../domain/constants/practicas.constants.js';

const initDatabase = async () => {
  try {
    console.log('=== Iniciando verificación y configuración de MongoDB Atlas (Hexagonal / Clean) ===');
    const conn = await connectDB();
    const db = conn.connection.db;

    const collectionsExpected = [
      'usuarios',
      'aulas_virtuales',
      'actividades_laborales',
      'actividades_comunitarias',
      'fuentes_institucionales',
      'formularios_aprobacion'
    ];

    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    console.log(`Colecciones en Atlas: ${existingNames.join(', ') || 'Ninguna'}`);

    for (const colName of collectionsExpected) {
      if (!existingNames.includes(colName)) {
        await db.createCollection(colName);
        console.log(`[+] Colección creada con éxito: ${colName}`);
      } else {
        console.log(`[=] Colección ya existente: ${colName}`);
      }
    }

    // Asegurar índices de los modelos
    await Usuario.init();
    await AulaVirtual.init();
    await ActividadLaboral.init();
    await ActividadComunitaria.init();
    await FuenteInstitucional.init();
    await FormularioAprobacion.init();
    console.log('[✓] Índices de todas las colecciones inicializados.');

    // Verificar si ya existe un usuario administrador base
    const adminExistente = await Usuario.findOne({ rol: ROLES.ADMINISTRADOR });
    if (!adminExistente) {
      const adminBase = new Usuario({
        cedula: '1700000001',
        nombres: 'Administrador',
        apellidos: 'ESFOT Sistema',
        correo: 'admin@epn.edu.ec',
        password: 'AdminPassword123!',
        telefono: '0999999999',
        rol: ROLES.ADMINISTRADOR,
        estado: 'activo'
      });
      await adminBase.save();
      console.log('[+] Usuario administrador inicial creado: admin@epn.edu.ec');
    } else {
      console.log(`[=] Usuario administrador existente: ${adminExistente.correo}`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
    process.exit(1);
  }
};

initDatabase();

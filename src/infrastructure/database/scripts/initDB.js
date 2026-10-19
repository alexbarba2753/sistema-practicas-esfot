import { connectDB, disconnectDB } from '../db.js';
import {Usuario} from '../models/index.js';
import { ROLES } from '../../../domain/constants/practicas.constants.js';

const initDatabase = async () => {
  try {
    console.log('Iniciando verificación y configuración de MongoDB Atlas');
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

    for (const collName of collectionsExpected) {
      if (!existingNames.includes(collName)) {
        await db.createCollection(collName);
        console.log(`(+) Colección creada con éxito: ${collName}`);
      } else {
        console.log(`Colección ya existente: ${collName}`);
      }
    }

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
      console.log('Usuario administrador inicial creado: admin@epn.edu.ec');
    } else {
      console.log(`Usuario administrador existente: ${adminExistente.correo}`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
    process.exit(1);
  }
};

initDatabase();

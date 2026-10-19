import dns from 'dns';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

// Configuración DNS para resolución de registros SRV en Windows / Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('No se pudo sobrescribir servidores DNS:', e.message);
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      autoIndex: true
    });
    console.log(`[MongoDB Atlas] Conexión establecida con éxito en: ${conn.connection.host}`);
    console.log(`[MongoDB Atlas] Base de datos activa: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Atlas] Error al conectar a la base de datos: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB Atlas] Conexión cerrada.');
  } catch (error) {
    console.error(`[MongoDB Atlas] Error al cerrar conexión: ${error.message}`);
  }
};

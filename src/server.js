import app from './app.js';
import { connectDB } from './infrastructure/database/db.js';
import { ENV } from './infrastructure/config/env.js';

const startServer = async () => {
  try {
    // Conectar a MongoDB Atlas (Infraestructura)
    await connectDB();

    // Iniciar servidor HTTP
    app.listen(ENV.PORT, () => {
      console.log(`[Servidor] Escuchando en http://localhost:${ENV.PORT}`);
      console.log(`[Arquitectura] Hexagonal con principios de Clean Architecture`);
      console.log(`[Entorno] Modo: ${ENV.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error al arrancar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();

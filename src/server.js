import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  try {
    // Conectar a MongoDB Atlas
    await connectDB();

    // Iniciar servidor HTTP
    app.listen(ENV.PORT, () => {
      console.log(`[Servidor] Escuchando en http://localhost:${ENV.PORT}`);
      console.log(`[Entorno] Modo: ${ENV.NODE_ENV}`);
      console.log(`[Health] http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (error) {
    console.error('Error al arrancar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();

import express from 'express';
import cors from 'cors';
import routes from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

const app = express();

// Middlewares requeridos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas base de la API
app.use('/api', routes);

// Middleware para manejo de 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

export default app;

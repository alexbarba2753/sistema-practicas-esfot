import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

const app = express();

// Middlewares globales de seguridad y utilitarios
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas base de la API (Capa de Presentación)
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

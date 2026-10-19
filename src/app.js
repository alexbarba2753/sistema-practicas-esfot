import express from 'express';
import cors from 'cors';
import routes from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

app.use(errorHandler);

export default app;

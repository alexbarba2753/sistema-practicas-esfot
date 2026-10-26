import mongoose from 'mongoose';
import { ESTADOS_ACTIVIDAD } from '../../../domain/constants/practicasConstants.js';

const actividadLaboralSchema = new mongoose.Schema(
  {
    estudiante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    aulaVirtual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AulaVirtual',
      required: true
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha de la actividad es obligatoria']
    },
    horaEntrada: {
      type: String,
      required: [true, 'La hora de entrada es obligatoria (formato HH:mm)'],
      trim: true
    },
    horaSalida: {
      type: String,
      required: [true, 'La hora de salida es obligatoria (formato HH:mm)'],
      trim: true
    },
    horas: {
      type: Number,
      required: [true, 'El total de horas cumplidas es obligatorio'],
      min: [0.5, 'Mínimo media hora'],
      max: [8, 'Máximo 8 horas por jornada diaria según el régimen académico']
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción técnica de las actividades es obligatoria'],
      trim: true
    },
    estadoAprobacion: {
      type: String,
      enum: Object.values(ESTADOS_ACTIVIDAD),
      default: ESTADOS_ACTIVIDAD.PENDIENTE
    },
    observacionesDocente: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'actividades_laborales',
    timestamps: true
  }
);

export const ActividadLaboral = mongoose.model('ActividadLaboral', actividadLaboralSchema);

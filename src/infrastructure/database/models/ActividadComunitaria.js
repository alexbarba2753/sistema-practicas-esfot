import mongoose from 'mongoose';
import { ESTADOS_ACTIVIDAD } from '../../../domain/constants/practicas.constants.js';

const actividadComunitariaSchema = new mongoose.Schema(
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
      required: [true, 'La fecha de la actividad comunitaria es obligatoria']
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
      max: [10, 'Máximo 10 horas por jornada diaria']
    },
    comunidadOInstitucion: {
      type: String,
      required: [true, 'El nombre de la comunidad o institución beneficiaria es obligatorio'],
      trim: true
    },
    beneficiariosAproximados: {
      type: Number,
      default: 0,
      min: 0
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción de las actividades de servicio comunitario es obligatoria'],
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
    collection: 'actividades_comunitarias',
    timestamps: true
  }
);

export const ActividadComunitaria = mongoose.model('ActividadComunitaria', actividadComunitariaSchema);

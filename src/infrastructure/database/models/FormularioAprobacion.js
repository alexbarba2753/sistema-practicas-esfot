import mongoose from 'mongoose';
import { MODALIDADES } from '../../../domain/constants/practicas.constants.js';

const formularioAprobacionSchema = new mongoose.Schema(
  {
    estudiante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    docenteTutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    aulaVirtual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AulaVirtual',
      required: true
    },
    modalidad: {
      type: String,
      enum: Object.values(MODALIDADES),
      required: true
    },
    horasCompletadas: {
      type: Number,
      required: true,
      min: 0
    },
    horasRequeridas: {
      type: Number,
      required: true
    },
    calificacionTutor: {
      type: Number,
      min: 0,
      max: 20,
      default: null
    },
    observacionesFinales: {
      type: String,
      trim: true,
      default: ''
    },
    estado: {
      type: String,
      enum: ['en_revision', 'aprobado', 'rechazado'],
      default: 'en_revision'
    },
    fechaEmision: {
      type: Date,
      default: Date.now
    },
    archivoActaUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'formularios_aprobacion',
    timestamps: true
  }
);

export const FormularioAprobacion = mongoose.model('FormularioAprobacion', formularioAprobacionSchema);

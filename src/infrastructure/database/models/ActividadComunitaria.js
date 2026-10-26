import mongoose from 'mongoose';
import { ESTADOS_ACTIVIDAD } from '../../../domain/constants/practicasConstants.js';

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
      required: [true, 'La fecha de la actividad comunitaria es obligatoria'],
      default: Date.now
    },
    horas: {
      type: Number,
      required: [true, 'El total de horas cumplidas o acreditadas es obligatorio'],
      min: [1, 'Mínimo 1 hora'],
      max: [96, 'No puede superar el tope reglamentario de 96 horas']
    },
    comunidadOInstitucion: {
      type: String,
      required: [true, 'El nombre de la comunidad, institución u organismo beneficiario es obligatorio'],
      trim: true
    },
    beneficiariosAproximados: {
      type: Number,
      default: 0,
      min: 0
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción de las actividades o proyecto de servicio comunitario es obligatoria'],
      trim: true
    },
    archivoEvidenciaUrl: {
      type: String,
      trim: true,
      default: ''
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

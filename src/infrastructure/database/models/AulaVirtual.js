import mongoose from 'mongoose';
import { MODALIDADES, HORAS_REGLAMENTARIAS, ESTADOS_AULA } from '../../../domain/constants/practicasConstants.js';

const aulaVirtualSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del aula virtual es obligatorio'],
      trim: true
    },
    periodo: {
      type: String,
      required: [true, 'El período académico es obligatorio'],
      trim: true
    },
    modalidad: {
      type: String,
      enum: Object.values(MODALIDADES),
      required: [true, 'La modalidad es obligatoria']
    },
    docenteTutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El docente tutor asignado es obligatorio']
    },
    // Relación 1 a 1: En cada aula virtual participa exactamente 1 estudiante
    estudiante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null
    },
    horasRequeridas: {
      type: Number,
      default: function () {
        return this.modalidad === MODALIDADES.LABORAL
          ? HORAS_REGLAMENTARIAS.LABORAL
          : HORAS_REGLAMENTARIAS.COMUNITARIO;
      }
    },
    fechaInicio: {
      type: Date,
      default: Date.now
    },
    fechaFin: {
      type: Date,
      required: [true, 'La fecha límite de entrega es obligatoria']
    },
    estado: {
      type: String,
      enum: Object.values(ESTADOS_AULA),
      default: ESTADOS_AULA.ABIERTA
    }
  },
  {
    collection: 'aulas_virtuales',
    timestamps: true
  }
);

export const AulaVirtual = mongoose.model('AulaVirtual', aulaVirtualSchema);

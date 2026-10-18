import mongoose from 'mongoose';

const aulaVirtualSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del aula virtual es obligatorio'],
      trim: true
    },
    periodo: {
      type: String,
      required: [true, 'El período académico es obligatorio (ej. 2026-A)'],
      trim: true
    },
    modalidad: {
      type: String,
      enum: ['laboral', 'comunitario'],
      required: [true, 'La modalidad es obligatoria']
    },
    docenteTutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El docente tutor asignado es obligatorio']
    },
    estudiantes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
      }
    ],
    horasRequeridas: {
      type: Number,
      default: function () {
        return this.modalidad === 'laboral' ? 240 : 96;
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
      enum: ['abierta', 'cerrada'],
      default: 'abierta'
    }
  },
  {
    collection: 'aulas_virtuales',
    timestamps: true
  }
);

export const AulaVirtual = mongoose.model('AulaVirtual', aulaVirtualSchema);

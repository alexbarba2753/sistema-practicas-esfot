import mongoose from 'mongoose';

const fuenteInstitucionalSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título del documento o reglamento es obligatorio'],
      trim: true
    },
    categoria: {
      type: String,
      enum: ['reglamento', 'instructivo', 'formato', 'resolucion', 'general'],
      default: 'reglamento'
    },
    descripcion: {
      type: String,
      trim: true,
      default: ''
    },
    contenido: {
      type: String,
      required: [true, 'El contenido textual o resumen para el modelo RAG es obligatorio']
    },
    enlaceUrl: {
      type: String,
      trim: true,
      default: ''
    },
    version: {
      type: String,
      default: '1.0',
      trim: true
    },
    activo: {
      type: Boolean,
      default: true
    },
    subidoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    }
  },
  {
    collection: 'fuentes_institucionales',
    timestamps: true
  }
);

export const FuenteInstitucional = mongoose.model('FuenteInstitucional', fuenteInstitucionalSchema);

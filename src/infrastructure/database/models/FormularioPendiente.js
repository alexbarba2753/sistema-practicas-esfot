import mongoose from 'mongoose';
import { MODALIDADES } from '../../../domain/constants/practicasConstants.js';

const formularioPendienteSchema = new mongoose.Schema(
  {
    aulaVirtual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AulaVirtual',
      required: true,
      unique: true,
      index: true
    },
    estudiante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true
    },
    modalidad: {
      type: String,
      enum: Object.values(MODALIDADES),
      required: true
    },
    estado: {
      type: String,
      enum: ['borrador', 'en_revision', 'aprobado'],
      default: 'borrador'
    },
    // Datos de la Entidad o Empresa Receptora
    entidadReceptora: {
      razonSocial: { type: String, default: 'Empresa Receptora de Prácticas' },
      ruc: { type: String, default: '1790000000001' },
      direccion: { type: String, default: 'Quito, Ecuador' },
      correo: { type: String, default: 'contacto@empresa.com' },
      ciudad: { type: String, default: 'Quito' },
      telefono: { type: String, default: '022999000' },
      celular: { type: String, default: '0999000000' },
      tipoEntidad: { type: String, default: 'Privada' },
      responsable: { type: String, default: 'Ing. Supervisor Responsable' },
      tutorEmpresarial: { type: String, default: 'Ing. Tutor Empresarial' },
      areaAsignada: { type: String, default: 'Desarrollo de Software / TI' }
    },
    // Contenido técnico elaborado por la IA (editable manualmente por el estudiante con 0 tokens)
    contenidoIa: {
      // Campos específicos para Prácticas Laborales (Formulario F_AA_119)
      asignaturasUtilidad: { type: String, default: '' },
      principalesActividades: { type: String, default: '' },
      habilidadesAdquiridas: { type: String, default: '' },
      observacionesTemas: { type: String, default: '' },

      // Campos específicos para Servicio Comunitario (Formulario FCP_001A)
      resumenActividades: { type: String, default: '' },
      contribucionConocimientos: { type: String, default: '' },
      resultadosAprendizaje: { type: String, default: '' },
      asignaturasMalla: { type: String, default: '' },

      // Texto unificado emitido por Groq LLM
      informeGeneradoTexto: { type: String, default: '' }
    },
    totalHoras: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    fechaGeneracionIa: {
      type: Date,
      default: Date.now
    },
    ultimaEdicionEstudiante: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'formularios_pendientes',
    timestamps: true
  }
);

export const FormularioPendiente = mongoose.model('FormularioPendiente', formularioPendienteSchema);

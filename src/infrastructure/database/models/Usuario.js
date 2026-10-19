import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../../../domain/constants/practicas.constants.js';

const usuarioSchema = new mongoose.Schema(
  {
    cedula: {
      type: String,
      required: [true, 'El número de cédula es obligatorio'],
      unique: true,
      trim: true
    },
    nombres: {
      type: String,
      required: [true, 'Los nombres son obligatorios'],
      trim: true
    },
    apellidos: {
      type: String,
      required: [true, 'Los apellidos son obligatorios'],
      trim: true
    },
    correo: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false
    },
    telefono: {
      type: String,
      trim: true,
      default: ''
    },
    rol: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ESTUDIANTE
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'usuarios',
    timestamps: true
  }
);

// Hash de contraseña antes de guardar
usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Usuario = mongoose.model('Usuario', usuarioSchema);

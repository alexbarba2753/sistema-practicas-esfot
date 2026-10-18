import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'secret_fallback_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_RESET_SECRET: process.env.JWT_RESET_SECRET || 'reset_secret_key',
  JWT_RESET_EXPIRES_IN: process.env.JWT_RESET_EXPIRES_IN || '1h',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@esfot.epn.edu.ec',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173'
};

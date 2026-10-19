# Sistema de Gestión de Prácticas Laborales y Comunitarias - ESFOT EPN
## Backend API RESTful

API RESTful backend desarrollada para el **Sistema de Gestión de Prácticas Preprofesionales (Laborales y Comunitarias)** de la Escuela de Formación de Tecnólogos (ESFOT) de la Escuela Politécnica Nacional (EPN).

---

### 📋 Información del Proyecto

* **Institución:** Escuela Politécnica Nacional (EPN)
* **Facultad/Unidad:** Escuela de Formación de Tecnólogos (ESFOT)
* **Carreras:** Tecnología Superior en Desarrollo de Software (TSDS), Redes y Seguridad Informática (TSRSI), Agua y Saneamiento Ambiental (TSASA), Electromecánica (TSEM).
* **Autor:** Alex Mateo Barba Gavidia

---

### 🏛️ Arquitectura del Sistema

El backend está estructurado bajo **Arquitectura Hexagonal (Ports and Adapters)**, combinada con principios de **Clean Architecture** y el principio **KISS (Keep It Simple, Stupid)** para garantizar modularidad, mantenibilidad e independencia tecnológica:

```text
src/
├── domain/                      # Capa de Dominio (Entidades, Reglas de Negocio Puras)
│   ├── constants/               # Constantes del dominio (Roles, Modalidades, Estados, Horas)
│   └── utils/                   # Utilidades de negocio (Validación de Cédula Ecuatoriana - Módulo 10)
│
├── application/                 # Capa de Aplicación (Casos de Uso / Servicios)
│   └── services/                # Servicios de negocio (authService)
│
├── infrastructure/              # Capa de Infraestructura (Adaptadores externos y DB)
│   ├── adapters/                # Adaptador de correos con SendGrid y fallback local
│   ├── config/                  # Variables de entorno centralizadas
│   └── database/                # Conexión resiliente a Atlas, Modelos Mongoose y Scripts de Seed
│       ├── models/              # Modelos de datos (Usuario, AulaVirtual, Actividades, etc.)
│       └── scripts/             # Script de inicialización y siembra de Administrador
│
└── presentation/                # Capa de Presentación (Controladores, Rutas y Middlewares)
    ├── controllers/             # Controladores HTTP
    ├── middlewares/             # Autenticación JWT y Manejo Global de Errores
    └── routes/                  # Definición y montaje de endpoints RESTful
```

---

### 🛠️ Stack Tecnológico y Librerías

El desarrollo se encuentra estrictamente apegado a las librerías documentadas en el marco metodológico del proyecto de titulación:

| Tecnología / Librería | Versión | Propósito en el Sistema |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0` | Entorno de ejecución del servidor backend |
| **Express** | `^5.3.0` | Framework HTTP para la construcción de la API RESTful |
| **Mongoose** | `^9.11.2` | Modelado de objetos y persistencia en MongoDB Atlas |
| **jsonwebtoken** | `^9.0.3` | Emisión y validación de credenciales JWT (Bearer Tokens) |
| **bcryptjs** | `^3.0.3` | Cifrado unidireccional y hashing seguro de contraseñas |
| **@sendgrid/mail** | `^8.1.6` | Envío transaccional de correos (activación y recuperación) |
| **exceljs** | `^4.4.0` | Generación y exportación de reportes de prácticas en formato Excel |
| **groq-sdk** | `^1.6.0` | Integración con LLaMA 3 mediante Groq Cloud API para IA |
| **dotenv** | `^18.0.8` | Gestión segura de variables de entorno del sistema |
| **cors** | `^2.8.6` | Configuración de política de intercambio de recursos de origen cruzado |

---

### 🚀 Estado del Desarrollo por Sprints

#### ✅ Sprint 0: Inicialización, Base de Datos y Arquitectura Base
* Conexión resiliente a **MongoDB Atlas** con soporte de contingencia DNS (Google DNS `8.8.8.8` / `8.8.4.4`).
* Definición y validación de las 6 colecciones principales:
  1. `usuarios`: Cuentas de Estudiantes, Docentes y Administradores.
  2. `aulas_virtuales`: Periodos académicos y asignación de prácticas.
  3. `actividades_laborales`: Registro y validación de prácticas laborales.
  4. `actividades_comunitarias`: Registro y validación de prácticas de servicio comunitario.
  5. `fuentes_institucionales`: Catálogo de convenios y empresas receptoras.
  6. `formularios_aprobacion`: Solicitudes y dictámenes de aprobación.
* Auto-sembrado del **Usuario Administrador Inicial** al arrancar el servidor (`admin@epn.edu.ec`).

#### ✅ Sprint 1: Cuentas Administrador, Docente y Estudiante
* **Registro de Usuarios:** Creación de cuentas para los 3 roles con validación de cédula ecuatoriana y formato de correo.
* **Verificación de Cuentas:** Generación de token temporal unificado (24h) y activación de cuenta para habilitar el acceso.
* **Autenticación y Sesiones:** Inicio de sesión seguro con verificación de hash (`bcryptjs`) y generación de token de acceso JWT.
* **Gestión de Perfil:** Consulta y actualización de datos personales (nombres, apellidos, teléfono).
* **Seguridad de Credenciales:** Cambio de contraseña solicitando validación de la contraseña actual.
* **Recuperación de Contraseña:** Generación de token temporal seguro (1h) y restablecimiento de contraseña olvidada.
* **Cierre de Sesión:** Endpoint para invalidar acceso en frontend.

---

### ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/alexbarba2753/sistema-practicas-esfot.git
   cd sistema-practicas-esfot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crear un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:
   ```env
   PORT=3000
   NODE_ENV=development

   MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.4dccbj0.mongodb.net/sistema_practicas_esfot?retryWrites=true&w=majority

   JWT_SECRET=tu_jwt_secret_key
   JWT_EXPIRES_IN=24h
   JWT_RESET_SECRET=tu_jwt_reset_secret
   JWT_RESET_EXPIRES_IN=1h

   SENDGRID_API_KEY=tu_sendgrid_api_key
   EMAIL_FROM=no-reply@esfot.epn.edu.ec

   GROQ_API_KEY=tu_groq_api_key
   GROQ_MODEL=llama-3.3-70b-versatile

   CLIENT_URL=http://localhost:5173
   ```

4. **Ejecutar el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```

---

### 🧪 Pruebas de Endpoints (Postman)

La colección de Postman oficial del proyecto se encuentra estructurada por roles para cubrir la totalidad de flujos del Sprint 1:

* **Estudiante:**
  1. `1.- Registro de Estudiante`
  2. `2.- Verificar Cuenta`
  3. `3.- Inicio de Sesión`
  4. `4.- Consultar Perfil`
  5. `5.- Actualizar Datos Personales`
  6. `6.- Cambiar Contraseña`
  7. `7.- Solicitar Recuperación de Contraseña`
  8. `8.- Restablecer Contraseña`
  9. `9.- Cerrar Sesión`
* **Docente:** Flujo completo de 9 pasos con rol docente.
* **Administrador:** Flujo completo de 9 pasos con rol administrador.

*(Los scripts de prueba de Postman capturan y transmiten automáticamente las variables `tokenVerificacion`, `token` JWT y `tokenRecuperacion` para permitir ejecuciones continuas sin intervención manual).*

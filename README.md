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
│   └── utils/                   # Utilidades de negocio (Validación Cédula Módulo 10, Fragmentador RAG)
│
├── application/                 # Capa de Aplicación (Casos de Uso / Servicios de Negocio)
│   └── services/                # authService, adminUsuariosService, aulaVirtualService, fuenteService
│
├── infrastructure/              # Capa de Infraestructura (Adaptadores externos y DB)
│   ├── adapters/                # Adaptador de correos con SendGrid y fallback local
│   ├── config/                  # Variables de entorno centralizadas
│   └── database/                # Conexión resiliente a Atlas, Modelos Mongoose y Scripts de Seed
│       ├── models/              # Modelos de datos (Usuario, AulaVirtual, FuenteInstitucional, etc.)
│       └── scripts/             # Script de inicialización y siembra de Administrador
│
└── presentation/                # Capa de Presentación (Controladores, Rutas y Middlewares)
    ├── controllers/             # authController, adminUsuariosController, aulaVirtualController, fuenteController
    ├── middlewares/             # authMiddleware (JWT), roleMiddleware (RBAC) y errorHandler (Global)
    └── routes/                  # Definición y montaje de endpoints RESTful (/api/auth, /api/admin)
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
  5. `fuentes_institucionales`: Catálogo normativo e insumos indexados para la IA.
  6. `formularios_aprobacion`: Solicitudes y dictámenes de aprobación.
* Auto-sembrado del **Usuario Administrador Inicial** al arrancar el servidor (`admin@epn.edu.ec`).

#### ✅ Sprint 1: Autenticación, Registro y Perfil (Estudiante, Docente y Administrador)
* **Registro de Usuarios:** Creación de cuentas para los 3 roles con validación de cédula ecuatoriana y formato de correo institucional o personal.
* **Verificación de Cuentas:** Generación de token temporal unificado (24h) y activación de cuenta para habilitar el acceso.
* **Autenticación y Sesiones:** Inicio de sesión seguro con verificación de hash (`bcryptjs`) y generación de token de acceso JWT.
* **Gestión de Perfil:** Consulta y actualización de datos personales (nombres, apellidos, teléfono).
* **Seguridad de Credenciales:** Cambio de contraseña solicitando validación de la contraseña actual.
* **Recuperación de Contraseña:** Generación de token temporal seguro (1h) y restablecimiento de contraseña olvidada.
* **Cierre de Sesión:** Endpoint para invalidar acceso en frontend.

#### ✅ Sprint 2: Rol Administrador (Gestión General del Sistema)
* **Administración de cuentas de docentes y estudiantes:**
  * Alta directa de docentes y alumnos desde el rol administrador sin colisión de cédula o correo.
  * Listado general de usuarios con filtros combinados por rol (`docente`, `estudiante`, `administrador`), estado (`activo`, `inactivo`, `pendiente`) y búsqueda por texto.
  * Consulta detallada de usuario por ID y actualización de datos de contacto.
  * Suspensión y reactivación inmediata de cuentas (`activo` / `inactivo`).
* **Creación y parametrización de aulas virtuales:**
  * Apertura de aulas asociadas a un período lectivo con cálculo automático de horas reglamentarias: **240 horas** para prácticas laborales y **96 horas** para comunitarias.
  * Asignación obligatoria y validada de docente tutor activo.
  * Matriculación unitaria o masiva de estudiantes con control estricto de no duplicidad.
  * Desmatriculación de alumnos y fijación de fechas límite de entrega.
* **Ingesta y gestión de fuentes institucionales para la IA (RAG):**
  * Carga y catalogación de normativa de la ESFOT (reglamentos, instructivos, resoluciones y formatos).
  * Algoritmo de fragmentación de texto ordenado (`textChunker.js`) que segmenta párrafos extensos en fragmentos indexados preservando coherencia léxica para el asistente inteligente.
  * Reindexación automática de fragmentos ante actualizaciones de contenido y control de vigencia (`activo` / `inactivo`).
* **Control de Acceso Basado en Roles (RBAC):**
  * Middleware de autorización `requireRole(ROLES.ADMINISTRADOR)` que protege integralmente las rutas bajo `/api/admin`.

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

### 🧪 Colección Oficial de Endpoints (Postman)

La colección de Postman oficial del proyecto se encuentra estructurada y sincronizada por roles y módulos de trabajo:

* **Estudiante (`Autenticación y Perfil`):**
  1. `1.- Registro de Estudiante`
  2. `2.- Verificar Cuenta`
  3. `3.- Inicio de Sesión`
  4. `4.- Consultar Perfil`
  5. `5.- Actualizar Datos Personales`
  6. `6.- Cambiar Contraseña`
  7. `7.- Solicitar Recuperación de Contraseña`
  8. `8.- Restablecer Contraseña`
  9. `9.- Cerrar Sesión`
* **Docente (`Autenticación y Perfil`):** Flujo completo de 9 pasos con rol docente.
* **Administrador (`Autenticación y Perfil`):** Flujo completo de 9 pasos con rol administrador.
* **Administrador (`Gestión de Usuarios`):**
  1. `1.- Crear Usuario por Administrador` (`POST /api/admin/usuarios`)
  2. `2.- Listar Usuarios con Filtros` (`GET /api/admin/usuarios`)
  3. `3.- Consultar Usuario por ID` (`GET /api/admin/usuarios/:id`)
  4. `4.- Actualizar Datos de Usuario` (`PUT /api/admin/usuarios/:id`)
  5. `5.- Cambiar Estado de Usuario` (`PATCH /api/admin/usuarios/:id/estado`)
* **Administrador (`Aulas Virtuales`):**
  1. `1.- Crear Aula Virtual` (`POST /api/admin/aulas-virtuales`)
  2. `2.- Listar Aulas Virtuales` (`GET /api/admin/aulas-virtuales`)
  3. `3.- Consultar Aula Virtual por ID` (`GET /api/admin/aulas-virtuales/:id`)
  4. `4.- Actualizar Aula Virtual` (`PUT /api/admin/aulas-virtuales/:id`)
  5. `5.- Matricular Estudiantes en Aula` (`POST /api/admin/aulas-virtuales/:id/estudiantes`)
  6. `6.- Desmatricular Estudiante de Aula` (`DELETE /api/admin/aulas-virtuales/:id/estudiantes/:estudianteId`)
* **Administrador (`Ingesta de Fuentes IA`):**
  1. `1.- Ingestar Documento Normativo` (`POST /api/admin/fuentes`)
  2. `2.- Listar Fuentes Institucionales` (`GET /api/admin/fuentes`)
  3. `3.- Consultar Fuente y Fragmentos por ID` (`GET /api/admin/fuentes/:id`)
  4. `4.- Actualizar Documento Normativo` (`PUT /api/admin/fuentes/:id`)
  5. `5.- Cambiar Vigencia de Fuente` (`PATCH /api/admin/fuentes/:id/estado`)
  6. `6.- Eliminar Fuente Institucional` (`DELETE /api/admin/fuentes/:id`)

*(Los scripts de prueba automáticos de Postman almacenan y encadenan `token`, `usuarioId`, `docenteId`, `estudianteId`, `aulaId` y `fuenteId` en las variables de colección y entorno para agilizar la ejecución y captura de evidencias).*

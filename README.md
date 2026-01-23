# 📝 Tasker - Gestor de Tareas

Un gestor de tareas moderno y responsivo construido con React, Bootstrap y una API REST. Organiza tus tareas por categorías y mantén un seguimiento de tu productividad.

## ✨ Características

- ✅ **Kanban Board** - Visualiza tus tareas en columnas por estado (Pendiente, En Progreso, Completada)
- 📂 **Categorías** - Organiza tus tareas por categorías personalizables con colores
- 🎯 **Prioridades** - Asigna nivel de prioridad (Baja, Media, Alta) a cada tarea
- 📅 **Fechas de Vencimiento** - Establece y visualiza fechas límite
- 👤 **Autenticación** - Sistema de login y registro seguro
- 📊 **Dashboard** - Panel de control con estadísticas de tareas
- 📱 **Responsive** - Funciona perfectamente en desktop, tablet y móvil
- 🎨 **UI Moderna** - Interfaz limpia basada en Bootstrap 5

## 🛠️ Stack Tecnológico

- **Framework:** React 19
- **Build Tool:** Vite
- **UI Library:** React-Bootstrap 2.x (Bootstrap 5)
- **Iconos:** react-icons (Feather Icons)
- **HTTP Client:** Axios
- **Routing:** React Router v7
- **Estilos:** CSS con variables CSS + Bootstrap utilities

## 📋 Requisitos

- Node.js 16+
- npm o yarn

## 🚀 Instalación

1. **Clonar el repositorio:**
```bash
git clone <tu-repo>
cd tasker-client
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Edita `.env` con tu configuración:
```
VITE_API_URL=http://localhost:3000/api
```

4. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:5173`

## 📦 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Compila la aplicación para producción
- `npm run lint` - Ejecuta el linter
- `npm run preview` - Vista previa de la build de producción

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── auth/           # Componentes de autenticación
│   ├── categories/     # Componentes de categorías
│   ├── tasks/          # Componentes de tareas
│   ├── common/         # Componentes comunes (Modal, etc)
│   └── layout/         # Layout principal
├── pages/              # Páginas de la aplicación
│   ├── auth/          # Páginas de login/registro
│   └── dashboard/     # Dashboard principal
├── services/           # Servicios de API
├── context/            # React Context (AuthContext)
├── hooks/              # Custom hooks
├── styles/             # Estilos globales
└── utils/              # Utilidades
```

## 🔐 Autenticación

La aplicación usa JWT para autenticación. Las rutas protegidas requieren un token válido.

- **Rutas públicas:** `/login`, `/register`
- **Rutas protegidas:** `/dashboard`, `/categories`

## 🎨 Personalizando

### Variables CSS

Los colores principales se definen en `src/styles/App.css`:

```css
--primary: #0d6efd;
--success: #198754;
--danger: #dc3545;
--warning: #ffc107;
--info: #0dcaf0;
```

### Temas de Categorías

Cada categoría puede tener su propio color (hex) que se muestra en las tarjetas de tareas.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo licencia MIT.

## 🔗 Enlaces Útiles

- [Documentación de API](./API_DOCS.md)

## 💡 Roadmap

- [ ] Drag & drop entre columnas del Kanban
- [ ] Filtros avanzados de tareas
- [ ] Temas claro/oscuro
- [ ] Exportar tareas a PDF
- [ ] Notificaciones
- [ ] Sincronización en tiempo real

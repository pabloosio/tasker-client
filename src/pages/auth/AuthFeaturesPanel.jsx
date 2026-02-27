import { FiCheckSquare, FiUsers, FiTag, FiCalendar, FiBarChart2, FiList, FiLayers } from 'react-icons/fi';

// Lista de características del producto.
// Actualizar aquí Y en CLAUDE.md cuando se agregue o elimine una característica.
export const FEATURES = [
  {
    icon: FiCheckSquare,
    title: 'Kanban drag & drop',
    desc: 'Mueve tareas entre Pendiente, En Progreso y Completada arrastrándolas.'
  },
  {
    icon: FiUsers,
    title: 'Colabora en equipo',
    desc: 'Crea tableros compartidos, invita miembros y asigna tareas a quien corresponda.'
  },
  {
    icon: FiLayers,
    title: 'Tableros y espacios',
    desc: 'Organiza tu trabajo en tableros separados: personal, laboral o por proyecto.'
  },
  {
    icon: FiList,
    title: 'Subtareas y progreso',
    desc: 'Divide el trabajo en pasos y visualiza el avance con una barra de progreso.'
  },
  {
    icon: FiTag,
    title: 'Categorías con color',
    desc: 'Clasifica tus tareas por proyecto, cliente o área con un solo vistazo.'
  },
  {
    icon: FiCalendar,
    title: 'Fechas y prioridades',
    desc: 'Marca plazos y niveles Alta / Media / Baja para enfocarte en lo importante.'
  },
  {
    icon: FiBarChart2,
    title: 'Reportes semanales y mensuales',
    desc: 'Visualiza qué se hizo, quién lo hizo y descarga el reporte en Excel o PDF.'
  }
];

/**
 * Panel desktop: columna izquierda con headline + grid de tarjetas.
 * Usar dentro de un Col con d-none d-lg-block.
 */
export const AuthFeaturesDesktop = () => (
  <div className="auth-features">
    <div className="auth-features-eyebrow">✓ Gestión de tareas simple y efectiva</div>
    <h1 className="auth-features-headline">
      Organiza tu trabajo.<br />
      <span>Cumple tus metas.</span>
    </h1>
    <p className="auth-features-sub">
      Un tablero Kanban para ti y tu equipo. Sin complicaciones.
    </p>
    <div className="auth-features-list">
      {FEATURES.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="auth-feature-item">
          <div className="auth-feature-icon">
            <Icon size={15} />
          </div>
          <div>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Tira mobile: fila de pills compactos encima del formulario.
 * Usar con d-lg-none.
 */
export const AuthFeaturesMobile = () => (
  <div className="auth-features-mobile d-lg-none">
    <p className="auth-features-mobile-label">¿Qué puedes hacer?</p>
    <div className="auth-features-pills">
      {FEATURES.map(({ icon: Icon, title }) => (
        <div key={title} className="auth-feature-pill">
          <Icon size={12} />
          {title}
        </div>
      ))}
    </div>
  </div>
);

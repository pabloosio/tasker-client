import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1 w-100">
        {children}
      </main>
      <footer className="bg-light py-3 mt-auto w-100">
        <div className="text-center">
          <small className="text-muted">
            © 2024 Tasker. Todos los derechos reservados.
          </small>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
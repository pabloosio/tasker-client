import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1 w-100">
        {children}
      </main>
      <footer className="app-footer mt-auto w-100">
        <div className="text-center">
          <small>
            © {new Date().getFullYear()} Palomea Tareas
          </small>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
import { NavLink } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="content-grid">
      <section className="card" aria-labelledby="not-found-heading">
        <h2 id="not-found-heading">Página no encontrada</h2>
        <p>
          No pudimos encontrar la vista solicitada. Vuelve a la calculadora para continuar planificando tus retiros o explora el
          resto del menú.
        </p>
        <NavLink to="/" className="primary-button" style={{ alignSelf: 'flex-start' }}>
          Ir a la calculadora
        </NavLink>
      </section>
    </div>
  );
}

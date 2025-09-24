import { NavLink } from 'react-router-dom';

export function AppFooter() {
  return (
    <footer className="app-footer">
      <p>
        Esta herramienta no constituye asesoramiento financiero. Las criptomonedas implican alto riesgo. Haz tu propia
        investigación.
      </p>
      <NavLink to="/terminos" className="app-footer__link">
        Ver términos de uso
      </NavLink>
    </footer>
  );
}

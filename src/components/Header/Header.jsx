import './Header.css';
import { Image } from '../Image/Image';

const Header = () => {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          <Image
            src="https://seeklogo.com/images/W/wrapped-bitcoin-wbtc-logo-A3917F45C9-seeklogo.com.png"
            alt="Bitcoin"
          />
          <div>
            <h1>Calculadora de BTC</h1>
            <p>Diseña tu estrategia de retiro con datos en tiempo real.</p>
          </div>
        </div>
        <nav className="header__actions" aria-label="Acciones rápidas">
          <a href="#calculator-heading">Calculadora</a>
          <a href="#dashboard-heading">Dashboard</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;

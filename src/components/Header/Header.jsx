import './Header.css';
import {Image} from '../Image/Image';
const Header = () => {

return (
    <header className="header">
        <Image src="https://seeklogo.com/images/W/wrapped-bitcoin-wbtc-logo-A3917F45C9-seeklogo.com.png" alt="Bitcoin"/>
        <h1>Calculadora de BTC</h1>
    </header>
    );
};

export default Header;
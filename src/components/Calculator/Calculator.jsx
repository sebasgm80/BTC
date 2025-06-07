import { UseBTCPrice } from "../../hook/BTC";
import { useState } from "react";



export function App() {
    // Estados para almacenar los valores de los inputs
    const [walletValue, setWalletValue] = useState(0);
    const [btcIntocableValue, setBtcIntocableValue] = useState(0);
  
    // Función para manejar el cambio en el input de la wallet
    const handleWalletChange = (event) => {
      setWalletValue(parseFloat(event.target.value)); // Convertimos el valor a número flotante
    };
  
    // Función para manejar el cambio en el input de BTC Intocable
    const handleBtcIntocableChange = (event) => {
      setBtcIntocableValue(parseFloat(event.target.value)); // Convertimos el valor a número flotante
    };
}  

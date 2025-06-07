import React, { useState } from 'react';
import './App.css';
import { UseBTCPrice } from './hook/BTC';
import Header from './components/Header/Header';
import { differenceInMonths } from 'date-fns';



function App() {
  // Definir los estados para los valores de los inputs y el resultado del cálculo
  const [walletAmount, setWalletAmount] = useState(0);
  const [btcIntocableAmount, setBTCIntocableAmount] = useState(0);
  const btcPrice = UseBTCPrice();
  const [selectedDate, setSelectedDate] = useState('');
  const calculateMonthsDifference = () => {
    if (!selectedDate) return 0; // Si no se ha seleccionado ninguna fecha, retornar 0

    const currentDate = new Date();
    const parsedSelectedDate = new Date(selectedDate);

    return differenceInMonths(parsedSelectedDate, currentDate);
  };

  // Función para calcular el valor total de los BTC en base a los inputs
  const monthsDifference = calculateMonthsDifference();
  const displayMonths = monthsDifference > 0 ? monthsDifference : 0;

  const calculateTotalBTCValue = () => {
    if (monthsDifference <= 0) return 0;
    return (walletAmount - btcIntocableAmount) / monthsDifference;
  };

  return (
    <>
      <Header />
      <div className='principal'>
      <div>
        <p>Precio de BTC: {btcPrice}</p>
      </div>
      <p>Fecha actual: {new Date().toLocaleDateString()}</p>
      <p>Fecha Final seleccionar: <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
        /></p>
      <div>
        <p>Meses transcurridos desde la fecha seleccionada: {displayMonths}</p>
      </div>
      <div>
        <p>Wallet</p>
        <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(parseFloat(e.target.value))} />
      </div>
      <div>
        <p>BTC Intocable</p>
        <input type="number" value={btcIntocableAmount} onChange={(e) => setBTCIntocableAmount(parseFloat(e.target.value))} />
      </div>
      <div>
        <p>BTC mensual para retirar: {calculateTotalBTCValue()}</p>
      </div>
      <div>
        <p>Valor total de EUR: {(calculateTotalBTCValue() * btcPrice).toFixed(2)}</p>
      </div>
      </div>
    </>
  );
}

export default App;

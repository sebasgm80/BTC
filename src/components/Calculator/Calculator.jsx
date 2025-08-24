import useBTCPrice from "../../hooks/useBTCPrice";
import { useState } from "react";
import { differenceInMonths } from "date-fns";
import "./Calculator.css";



export function Calculator() {
    // Estados para almacenar los valores de los inputs
    const [walletValue, setWalletValue] = useState(0);
    const [btcIntocableValue, setBtcIntocableValue] = useState(0);
    const [selectedDate, setSelectedDate] = useState("");
    const { price: btcPrice } = useBTCPrice('EUR');

    // Función para manejar el cambio en el input de la wallet
    const handleWalletChange = (event) => {
      const value = Number(event.target.value);
      setWalletValue(Number.isNaN(value) ? 0 : value);
    };

    // Función para manejar el cambio en el input de BTC Intocable
    const handleBtcIntocableChange = (event) => {
      const value = Number(event.target.value);
      setBtcIntocableValue(Number.isNaN(value) ? 0 : value);
    };

    // Función para manejar el cambio en la fecha seleccionada
    const handleDateChange = (event) => {
      setSelectedDate(event.target.value);
    };

    const calculateMonthsDifference = () => {
      if (!selectedDate) return 0;
      const currentDate = new Date();
      const parsedSelectedDate = new Date(selectedDate);
      return differenceInMonths(currentDate, parsedSelectedDate);
    };

    const monthsDifference = calculateMonthsDifference();
    const validDate = selectedDate && monthsDifference < 0;

    // Validaciones y mensajes de error
    const walletError = walletValue < 0 ? "El valor debe ser positivo" : "";
    const btcError =
      btcIntocableValue < 0
        ? "El valor debe ser positivo"
        : btcIntocableValue > walletValue
        ? "No puede superar el total"
        : "";
    const dateError =
      selectedDate === ""
        ? "Selecciona una fecha"
        : monthsDifference >= 0
        ? "La fecha debe ser futura"
        : "";

    // Función para calcular el valor total de los BTC en base a los inputs
    const calculateTotalBTCValue = () => {
      if (!validDate) return 0; // Evitar divisiones por cero o fechas inválidas
      return ((walletValue - btcIntocableValue) / monthsDifference) * -1;
    };
    const totalBTCValue = calculateTotalBTCValue();

    return (
      <form className="calculator" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label>Precio de BTC: {btcPrice}</label>
        </div>

        <div className="field">
          <label htmlFor="date">Fecha final</label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />
          {dateError ? (
            <p className="error">{dateError}</p>
          ) : (
            <p className="help">Selecciona la fecha final</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="wallet">Wallet</label>
          <input
            id="wallet"
            type="number"
            value={walletValue}
            onChange={handleWalletChange}
          />
          {walletError ? (
            <p className="error">{walletError}</p>
          ) : (
            <p className="help">Total de BTC en la wallet</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="btc">BTC Intocable</label>
          <input
            id="btc"
            type="number"
            value={btcIntocableValue}
            onChange={handleBtcIntocableChange}
          />
          {btcError ? (
            <p className="error">{btcError}</p>
          ) : (
            <p className="help">Cantidad de BTC que no se puede retirar</p>
          )}
        </div>

        <div className="field">
          <p>BTC mensual para retirar: {totalBTCValue}</p>
        </div>

        <div className="field">
          <p>
            Valor total de EUR: {(totalBTCValue * btcPrice).toFixed(2)}
          </p>
        </div>
      </form>
    );
}

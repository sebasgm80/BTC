import { useState } from 'react';
import useBTCPrice from '../../hooks/useBTCPrice';
import './Dashboard.css';

export function Dashboard() {
  const { price, loading, error } = useBTCPrice('EUR');
  const [interval, setInterval] = useState('1D');
  const intervals = ['1D', '1W', '1M', '1Y'];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <img src="https://i.pravatar.cc/48" alt="Avatar" className="avatar" />
        <span className="username">Usuario</span>
      </div>
      <div className="balance-card">
        <h2>Balance actual</h2>
        <p>
          {loading ? 'Cargando...' : error ? error : `${price} EUR`}
        </p>
      </div>
      <div className="interval-buttons">
        {intervals.map((i) => (
          <button
            key={i}
            type="button"
            className={interval === i ? 'active' : ''}
            onClick={() => setInterval(i)}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}


import { Calculator } from '../components/Calculator/Calculator';
import { usePriceData } from '../context/PriceContext';

export default function Calculadora() {
  const { price, source, loading, error, lastUpdated, refresh } = usePriceData();

  return (
    <div className="content-grid">
      <Calculator
        price={price}
        source={source}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
      />
    </div>
  );
}

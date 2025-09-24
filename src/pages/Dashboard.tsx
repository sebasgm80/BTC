import { Dashboard as DashboardWidget } from '../components/Dashboard/Dashboard';
import { usePriceData } from '../context/PriceContext';

export default function Dashboard() {
  const { price, source, lastUpdated, chartHistory, history, clearHistory, autoRefreshMs } = usePriceData();

  return (
    <div className="content-grid">
      <DashboardWidget
        username="Ada Lovelace"
        avatarUrl="https://i.pravatar.cc/100?img=5"
        history={chartHistory}
        rawHistory={history}
        price={price}
        source={source}
        lastUpdated={lastUpdated}
        onClearHistory={clearHistory}
        autoRefreshMs={autoRefreshMs}
      />
    </div>
  );
}

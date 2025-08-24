import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Dataset ficticio de ganancias y pérdidas mensuales
const data = [
  { month: "Ene", value: 400 },
  { month: "Feb", value: -200 },
  { month: "Mar", value: 1000 },
  { month: "Abr", value: -800 },
  { month: "May", value: 650 },
];

// Subcomponente que muestra un gráfico de barras de ganancias/pérdidas
function ProfitLossChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <defs>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#646cff" />
            <stop offset="100%" stopColor="#42a5f5" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="value" fill="url(#profitGradient)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard({ username = "Guest", avatarUrl = "https://i.pravatar.cc/100" }) {
  return (
    <section>
      <header>
        <img src={avatarUrl} alt={`${username} avatar`} width="50" height="50" />
        <h2>{username}</h2>
      </header>
      <h3>Profit &amp; Loss</h3>
      <ProfitLossChart />
    </section>
  );
}


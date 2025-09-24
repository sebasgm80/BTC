import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PriceProvider } from './context/PriceContext';
import { Layout } from './layout/Layout';
import Calculadora from './pages/Calculadora';
import Escenarios from './pages/Escenarios';
import Dashboard from './pages/Dashboard';
import Metodologia from './pages/Metodologia';
import Alertas from './pages/Alertas';
import Terminos from './pages/Terminos';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <PriceProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Calculadora />} />
            <Route path="/escenarios" element={<Escenarios />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/metodologia" element={<Metodologia />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </PriceProvider>
  );
}

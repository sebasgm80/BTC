import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import { Calculator } from './components/Calculator/Calculator';
import { Dashboard } from './components/Dashboard/Dashboard';

function App() {
  return (
    <>
      <Header />
      <div className='principal'>
        <Calculator />
        <Dashboard />
      </div>
    </>
  );
}

export default App;


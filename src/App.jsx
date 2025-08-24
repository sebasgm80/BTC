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
        <Dashboard username="Ada Lovelace" avatarUrl="https://i.pravatar.cc/100?img=5" />
      </div>
    </>
  );
}

export default App;

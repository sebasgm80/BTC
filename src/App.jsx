import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import { Calculator } from './components/Calculator/Calculator';

function App() {
  return (
    <>
      <Header />
      <div className='principal'>
        <Calculator />
      </div>
    </>
  );
}

export default App;

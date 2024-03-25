import React, { useState, useEffect } from 'react';

export function UseBTCPrice() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    fetch('https://api.coindesk.com/v1/bpi/currentprice/EUR.json')
      .then(response => response.json())
      .then(data => setPrice(data.bpi.EUR.rate_float));
  }, []);

  return price;
}




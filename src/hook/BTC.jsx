import React, { useState, useEffect } from 'react';

export function UseBTCPrice() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice/EUR.json');
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        setPrice(data.bpi.EUR.rate_float);
      } catch (error) {
        console.error('Failed to fetch BTC price:', error);
        setPrice(null);
      }
    };

    fetchPrice();
  }, []);

  return price;
}




import React, { useState, useEffect } from 'react';

export function useBTCPrice() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coindesk.com/v1/bpi/currentprice/EUR.json'
        );
        const data = await response.json();
        setPrice(data.bpi.EUR.rate_float);
      } catch (error) {
        console.error('Failed to fetch BTC price:', error);
        setPrice(0);
      }
    };

    fetchPrice();
  }, []);

  return price;
}




# BTC Calculator

This project is a small Bitcoin calculator built with React and Vite. It lets you check how much BTC you can withdraw each month based on your wallet balance, the amount you want to keep untouched, and a target date. Current BTC price data is fetched from CoinDesk.

## Setup

1. Install [Node.js](https://nodejs.org/) (version 18 or later is recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` by default.

## Development Commands

- `npm run dev` – start the Vite dev server with hot reload.
- `npm run build` – build the production bundle.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint on the project files.

## Project Structure

The main React code lives in `src/`. `App.jsx` holds the calculator logic and renders header, inputs, and results. `src/hook/BTC.jsx` provides a hook to retrieve the current BTC price.

## License

This project is provided as-is without warranty.

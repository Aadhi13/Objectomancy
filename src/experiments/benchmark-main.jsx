/**
 * Entry point for the DeepLab benchmark page.
 * Completely isolated from the production Objectomancy app.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import DeepLabBenchmark from './DeepLabBenchmark';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DeepLabBenchmark />
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FaceMeshProvider } from './components/FaceMeshContext'; // import your provider
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FaceMeshProvider>
      <App />
    </FaceMeshProvider>
  </React.StrictMode>
);

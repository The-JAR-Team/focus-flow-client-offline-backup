import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import { store, persistor } from './redux/store';
import { setUserData } from './redux/userSlice';
import { fetchUserInfo } from './services/api';
import { PersistGate } from 'redux-persist/integration/react';

function Bootstrapper({ children }) {
  useEffect(() => {
    // Load offline guest user once
    fetchUserInfo().then(user => {
      store.dispatch(setUserData(user));
    }).catch(() => {
      // Fallback minimal guest
      store.dispatch(setUserData({
        first_name: 'guest',
        last_name: 'mode',
        email: 'guest@local',
        permission: 0,
        user_id: 0
      }));
    });
  }, []);
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Bootstrapper>
          <App />
        </Bootstrapper>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
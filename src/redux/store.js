import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage
import userReducer from './userSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'] // only persist user slice
};

const persistedReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Needed for Redux Persist
    })
});

export const persistor = persistStore(store);
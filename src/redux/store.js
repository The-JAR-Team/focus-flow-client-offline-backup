import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage

import userReducer from './userSlice';
import playlistReducer from './playlistSlice';

const userPersistConfig = {
  key: 'user',
  storage,
  whitelist: ['currentUser'] // only persist user slice
};

const playlistPersistConfig = {
  key: 'playlist',
  storage,
  whitelist: ['playlist'] // only persist current playlist
};

const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
const persistedPlaylistReducer = persistReducer(playlistPersistConfig, playlistReducer);

// Create root reducer with all slices
const rootReducer = combineReducers({
  user: persistedUserReducer,
  playlist: persistedPlaylistReducer
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Needed for Redux Persist
    })
});

export const persistor = persistStore(store);
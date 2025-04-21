import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage/session';

import userReducer from './userSlice';
import playlistReducer from './playlistSlice';
import dashboardReducer from './dashboardSlice';

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

const dashboardPersistConfig = {
  key: 'dashboard',
  storage,
  whitelist: ['myGenericVideos', 'otherGenericVideos', 'myPlaylists', 'otherPlaylists', 'isLoaded']
};

const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
const persistedPlaylistReducer = persistReducer(playlistPersistConfig, playlistReducer);
const persistedDashboardReducer = persistReducer(dashboardPersistConfig, dashboardReducer);

// Create app reducer with all slices
const appReducer = combineReducers({
  user: persistedUserReducer,
  playlist: persistedPlaylistReducer,
  dashboard: persistedDashboardReducer
});

// Add wrapper reducer
const rootReducer = (state, action) => {
  if (action.type === 'user/logoutUser') {
    // Setting state to undefined makes reducers return their initial state
    state = undefined;
  }
  return appReducer(state, action);
};

// Use rootReducer instead of the original
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Needed for Redux Persist
    })
});

export const persistor = persistStore(store);
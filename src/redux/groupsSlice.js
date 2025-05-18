import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    groups: [],
    favorites: null,
    isLoaded: false
};

const groupsSlice = createSlice({
    name: 'groups',
    initialState,
    reducers: {
        setGroups: (state, action) => {
            return {
                ...state,
                groups: action.payload,
                isLoaded: true
            };
        },
        setFavorites: (state, action) => {
            return {
                ...state,
                favorites: action.payload
            };
        },
        addPlaylistToFavorites: (state, action) => {
            if (state.favorites && state.favorites.playlists) {
                // Check if playlist already exists in favorites
                if (!state.favorites.playlists.some(p => p.playlist_id === action.payload.playlist_id)) {
                    state.favorites.playlists.push(action.payload);
                }
            }
        },
        removePlaylistFromFavorites: (state, action) => {
            if (state.favorites && state.favorites.playlists) {
                state.favorites.playlists = state.favorites.playlists.filter(
                    playlist => playlist.playlist_id !== action.payload.playlist_id
                );
            }
        },
        addVideoToFavorites: (state, action) => {
            if (state.favorites && state.favorites.videos) {
                // Check if video already exists in favorites
                if (!state.favorites.videos.some(v => v.video_id === action.payload.video_id)) {
                    state.favorites.videos.push(action.payload);
                }
            }
        },
        removeVideoFromFavorites: (state, action) => {
            if (state.favorites && state.favorites.videos) {
                state.favorites.videos = state.favorites.videos.filter(
                    video => video.video_id !== action.payload.video_id
                );
            }
        }
    }
});

export const { 
    setGroups, 
    setFavorites, 
    addPlaylistToFavorites, 
    removePlaylistFromFavorites,
    addVideoToFavorites,
    removeVideoFromFavorites
} = groupsSlice.actions;

export default groupsSlice.reducer;

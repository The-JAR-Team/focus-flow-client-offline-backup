import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    myGenericVideos: [],
    otherGenericVideos: [],
    myPlaylists: [],
    otherPlaylists: [],
    isLoaded: false
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setDashboardData: (state, action) => {
            return {
                ...state,
                ...action.payload,
                isLoaded: true
            };
        },
        removeVideo: (state, action) => {
            const { playlist_name, playlist_item_id } = action.payload;
            const playlistIndex = state.myPlaylists.findIndex(p => p.playlist_name === playlist_name);
            state.myPlaylists[playlistIndex].playlist_items = state.myPlaylists[playlistIndex].playlist_items.filter(item => item.playlist_item_id !== playlist_item_id)
        },
        updatePlaylistData: (state, action) => {
            const { playlist_name, name, permission } = action.payload;
            const playlistIndex = state.myPlaylists.findIndex(p => p.playlist_name === playlist_name);
            if (name) {
                state.myPlaylists[playlistIndex].playlist_name = name;
            }
            if (permission) {
                state.myPlaylists[playlistIndex].playlist_permission = permission;
            }
        }
    }
});

export const { setDashboardData, removeVideo, updatePlaylistData} = dashboardSlice.actions;
export default dashboardSlice.reducer;
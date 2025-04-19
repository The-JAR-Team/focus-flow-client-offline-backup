import { createSlice } from '@reduxjs/toolkit';
import { removeVideo } from './dashboardSlice';

const playlistSlice = createSlice({
    name: 'playlist',
    initialState: {
        playlist: null
    },
    reducers: {
        setSelectedPlaylist: (state, action) => {
            state.playlist = action.payload;
        },
        clearPlaylist: (state) => {
            state.playlist = null;
        },
        removeVideoFromSelectedPlaylist: (state, action) => {
            const { playlist_item_id } = action.payload;
            state.playlist[playlistIndex].playlist_items = state.playlist[playlistIndex].playlist_items.filter(item => item.playlist_item_id !== playlist_item_id);
        }
    }
});

export const { setSelectedPlaylist, clearPlaylist, removeVideoFromSelectedPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
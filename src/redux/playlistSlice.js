import { createSlice } from '@reduxjs/toolkit';

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
            state.playlist.playlist_items = state.playlist.playlist_items.filter(item => item.playlist_item_id !== playlist_item_id);
        },
        editSelectedPlaylist: (state, action) => {
            const { name, permission } = action.payload;
            if (name) {
                state.playlist.playlist_name = name;
            }
            if (permission) {
                state.playlist.playlist_permission = permission;
            }
        }
    }
});

export const { setSelectedPlaylist, clearPlaylist, removeVideoFromSelectedPlaylist, editSelectedPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
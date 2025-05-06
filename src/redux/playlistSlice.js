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
        editSelectedPlaylistName: (state, action) => {
            state.playlist.playlist_name = action.payload;
        },
        editSelectedPlaylistPermission: (state, action) => {
            state.playlist.playlist_permission = action.payload;
        }
    }
});

export const { 
    setSelectedPlaylist, 
    clearPlaylist, 
    removeVideoFromSelectedPlaylist, 
    editSelectedPlaylistName,
     editSelectedPlaylistPermission
} = playlistSlice.actions;
export default playlistSlice.reducer;
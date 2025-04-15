import { createSlice } from '@reduxjs/toolkit';

const playlistSlice = createSlice({
    name: 'playlist',
    initialState: {
        playlist: null,
        allPlaylists: []
    },
    reducers: {
        setSelectedPlaylist: (state, action) => {
            state.playlist = action.payload;
        },
        clearPlaylist: (state) => {
            state.playlist = null;
        },
        setAllPlaylists: (state, action) => {
            state.allPlaylists = action.payload;
        }
    }
});

export const { setSelectedPlaylist, clearPlaylist, setAllPlaylists } = playlistSlice.actions;
export default playlistSlice.reducer;
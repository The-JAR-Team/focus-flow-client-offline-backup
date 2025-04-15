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
        }
    }
});

export const { setSelectedPlaylist, clearPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
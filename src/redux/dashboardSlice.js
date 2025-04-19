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
        addVideo: (state, action) => {
            state.myGenericVideos.push(action.payload);
        },
        addPlaylist: (state, action) => {
            state.myPlaylists.push(action.payload);
        },
        updatePlaylist: (state, action) => {
            const index = state.myPlaylists.findIndex(p => p.playlist_id === action.payload.playlist_id);
            if (index !== -1) {
                state.myPlaylists[index] = action.payload;
            }
        }
    }
});

export const { setDashboardData, addVideo, addPlaylist, updatePlaylist } = dashboardSlice.actions;
export default dashboardSlice.reducer;
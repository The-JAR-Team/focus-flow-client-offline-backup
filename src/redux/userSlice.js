import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        currentUser: null
    },
    reducers: {
        setUserData: (state, action) => {
            state.currentUser = action.payload;
        },
        clearUserData: (state) => {
            state.currentUser = null;
        }
    }
});

export const { setUserData, clearUserData } = userSlice.actions;
export default userSlice.reducer;
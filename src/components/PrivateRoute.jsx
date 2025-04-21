import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function PrivateRoute({ children }) {
    const { currentUser } = useSelector(state => state.user);

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default PrivateRoute;
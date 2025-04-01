import React from 'react';

const Spinner = ({ size = 'medium', message }) => {
  const spinnerClass = `spinner spinner-${size}`;
  
  return (
    <div className="spinner-container">
      <div className={spinnerClass}></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default Spinner;

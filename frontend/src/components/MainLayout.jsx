import React from 'react';
import Sidebar from './sidebar';
import Home from '../pages/home';

const MainLayout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ marginLeft: '280px', width: 'calc(100% - 280px)', transition: 'margin-left 0.3s ease' }}>
        <Home />
      </div>
    </div>
  );
};

export default MainLayout;
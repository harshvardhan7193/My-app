import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import { AdminDataProvider } from './data/AdminDataContext';
import { ToastProvider } from './components/Toast';
import './admin.css';

const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <AdminDataProvider>
      <ToastProvider>
        <div className="admin-layout">
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          <main className="admin-main">
            <AdminHeader isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <div className="admin-content">
              <Outlet />
            </div>
          </main>
        </div>
      </ToastProvider>
    </AdminDataProvider>
  );
};

export default AdminLayout;

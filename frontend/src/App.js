import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Signup from './pages/sginup';
import Signin from './pages/sginin';
import Home from './pages/home';
import Sidebar from './components/sidebar';
import Community from './pages/community';
import AllCrops from './pages/crops';
import Messages from './pages/Messages';
import Store from './pages/StorePage';
import AIChat from './pages/AIChat';
import MyOrdersPage from './pages/MyOrdersPage';
    import UserProfile from "./pages/UserProfile";
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import AdminProducts from './pages/admin/product';
import AdminOrders from './pages/admin/orders';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const RequireAuth = ({ children }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? children : <Navigate to="/signin" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/signup" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        
        {/* Protected Routes with Sidebar */}
        <Route path="/home" element={
          <RequireAuth>
            <div style={{ display: 'flex' }}>
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div 
                style={{ 
                  marginLeft: isCollapsed ? '80px' : '280px', 
                  width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                  transition: 'margin-left 0.3s ease, width 0.3s ease' 
                }}
              >
                <Home />
              </div>
            </div>
          </RequireAuth>
        } />
        <Route path="/community" element={
          <RequireAuth>
            <div style={{ display: 'flex' }}>
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div 
                style={{ 
                  marginLeft: isCollapsed ? '80px' : '280px', 
                  width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                  transition: 'margin-left 0.3s ease, width 0.3s ease' 
                }}
              >
                <Community />
              </div>
            </div>
          </RequireAuth>
        } />
        
       <Route path="/crops" element={
          <RequireAuth>
            <div style={{ display: 'flex' }}>
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div 
                style={{ 
                  marginLeft: isCollapsed ? '80px' : '280px', 
                  width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                  transition: 'margin-left 0.3s ease, width 0.3s ease' 
                }}
              >
                <AllCrops />
              </div>
            </div>
          </RequireAuth>
        } />

        <Route path="/admin/dashboard" element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        } />
        <Route path="/admin/users" element={
          <RequireAuth>
            <UsersPage />
          </RequireAuth>
        } />
        <Route path="/admin/products" element={
          <RequireAuth>
            <AdminProducts />
          </RequireAuth>
        } />
        <Route path="/admin/orders" element={
          <RequireAuth>
            <AdminOrders />
          </RequireAuth>
        } />
        <Route path="/admin/community" element={
          <RequireAuth>
            <Community useAdminHeader />
          </RequireAuth>
        } />

        <Route path="/messages" element={
          <div style={{ display: 'flex' }}>
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <div 
              style={{ 
                marginLeft: isCollapsed ? '80px' : '280px', 
                width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                transition: 'margin-left 0.3s ease, width 0.3s ease' 
              }}
            >
              <Messages />
            </div>
          </div>
        } />
         
        <Route path="/store" element={
          <div style={{ display: 'flex' }}>
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <div 
              style={{ 
                marginLeft: isCollapsed ? '80px' : '280px', 
                width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                transition: 'margin-left 0.3s ease, width 0.3s ease' 
              }}
            >
              <Store />
            </div>
          </div>
        } />

        <Route path="/orders" element={
          <RequireAuth>
            <div style={{ display: 'flex' }}>
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div 
                style={{ 
                  marginLeft: isCollapsed ? '80px' : '280px', 
                  width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                  transition: 'margin-left 0.3s ease, width 0.3s ease' 
                }}
              >
                <MyOrdersPage />
              </div>
            </div>
          </RequireAuth>
        } />
    

<Route
  path="/profile/me"
  element={
    <UserProfile
      isOwner={true}
      onBack={() => window.history.back()}
    />
  }
/>
<Route 
  path="/profile/:id"
  element={
    <UserProfile
      isOwner={false}
      onBack={() => window.history.back()}
    />
  }
/>

        <Route path="/ai-chat" element={
          <RequireAuth>
            <div style={{ display: 'flex' }}>
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div 
                style={{ 
                  marginLeft: isCollapsed ? '80px' : '280px', 
                  width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)', 
                  transition: 'margin-left 0.3s ease, width 0.3s ease' 
                }}
              >
                <AIChat />
              </div>
            </div>
          </RequireAuth>
        } />
      </Routes>
    </Router>
  );
}

export default App;

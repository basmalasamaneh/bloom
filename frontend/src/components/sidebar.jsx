import React from 'react';
import { FiHome, FiMessageSquare, FiShoppingBag, FiLogOut, FiChevronLeft, FiChevronRight, FiUsers } from 'react-icons/fi';
import { FaLeaf, FaRobot } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'home', label: 'Home', icon: FiHome, path: '/home' },
    { id: 'crops', label: 'All Crops', icon: FaLeaf, path: '/crops' },
    { id: 'community', label: 'Community', icon: FiUsers, path: '/community' }, 
    { id: 'messages', label: 'Messages', icon: FiMessageSquare, path: '/messages' },
    { id: 'store', label: 'Store', icon: FiShoppingBag, path: '/store' },
    { id: 'ai', label: 'AI Chat Bot', icon: FaRobot, path: '/ai-chat' }
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    // Clear auth token and send user to sign-in page
    try { localStorage.removeItem('token'); } catch (e) { /* ignore */ }
    navigate('/signin');
  };

  return (
    <>
      <style>{`
        * { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }

        .sidebar-container {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: rgba(27, 67, 50, 0.95);
          backdrop-filter: blur(8px);
          border-right: 1px solid rgba(255,255,255,.1);
          z-index: 1000;
          transition: width .3s ease;
          overflow: hidden;
        }

        .sidebar-container.collapsed { width: 80px; }
        .sidebar-container.expanded { width: 260px; }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.3rem;
          border-bottom: 1px solid rgba(255,255,255,.15);
        }

        .logo {
          display: flex;
          align-items: center;
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
        }

        .logo-icon {
          font-size: 1.9rem;
          color: #F2C94C;
          margin-right: .6rem;
        }

        .toggle-btn {
          background: rgba(255,255,255,.1);
          border: none;
          border-radius: 10px;
          padding: .5rem;
          color: #fff;
          cursor: pointer;
          transition: .3s;
        }
        .toggle-btn:hover { background: rgba(255,255,255,.2); }

        .sidebar-menu { padding: 1.2rem 0; }

        .menu-item {
          display: flex;
          align-items: center;
          padding: .9rem 1.25rem;
          color: #fff;
          text-decoration: none;
          position: relative;
          transition: .25s;
          border-radius: 10px;
          margin: .3rem .5rem;
        }

        .menu-item.active,
        .menu-item:hover {
          background: rgba(255,255,255,.12);
          box-shadow: 0px 4px 12px rgba(0,0,0,.15);
        }

        .menu-icon {
          font-size: 1.4rem;
          color: #F2C94C;
          margin-right: 1rem;
          transition: .25s;
        }

        .menu-item:hover .menu-icon,
        .menu-item.active .menu-icon { color: #fff; }

        .menu-text { white-space: nowrap; font-weight: 500; }

        .sidebar-container.collapsed .menu-text { display: none; }
        .sidebar-container.collapsed .menu-icon { margin-right: 0; }

        .sidebar-footer {
          position: absolute;
          bottom: 0;
          width: 100%;
          padding: 1.2rem;
          border-top: 1px solid rgba(255,255,255,.15);
        }

        .logout-btn {
          background: rgba(255,255,255,.15);
          border: none;
          width: 100%;
          padding: .9rem;
          border-radius: 10px;
          color: #fff;
          font-size: 1rem;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: .25s;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,.25);
        }

        .logout-icon { margin-right: .7rem; }

        .sidebar-container.collapsed .logout-text { display: none; }
        .sidebar-container.collapsed .logout-icon { margin-right: 0; }
      `}</style>

      <div className={`sidebar-container ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FaLeaf className="logo-icon" />
            {!isCollapsed && "Bloom"}
          </div>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <Link 
              key={item.id}
              to={item.path}
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon className="menu-icon" />
              <span className="menu-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut className="logout-icon" />
            {!isCollapsed && <span className="logout-text">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { FaLeaf, FaUserCircle } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";

export default function AdminHeader() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="admin-header">
      {/* Logo */}
      <div className="admin-logo" onClick={() => navigate("/admin/dashboard")}>
        <FaLeaf className="admin-logo-icon" /> Bloom Admin
      </div>

      {/* Navigation */}
      <nav className="admin-nav">
        <NavLink to="/admin/dashboard">Dashboard</NavLink>
        <NavLink to="/admin/users">Users</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/orders">Orders & Rentals</NavLink>
        <NavLink to="/admin/community">Community</NavLink>
      </nav>

      {/* Right side */}
      <div className="admin-right">
        <div
          className="admin-avatar"
          onClick={() => setShowMenu(!showMenu)}
        >
          <FaUserCircle />
        </div>

        {/* Dropdown */}
        <div className={`admin-dropdown ${showMenu ? "active" : ""}`}>
          <div
            className="admin-dropdown-item"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.assign("/signin");
            }}
          >
            <FiLogOut /> Logout
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 2rem;
          background: #1B4332;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(46,139,87,0.15);
          border: 1px solid rgba(46,139,87,0.2);
          animation: slideDown 0.4s ease;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        @keyframes slideDown {
          from { transform: translateY(-40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Logo */
        .admin-logo {
          display: flex;
          align-items: center;
          font-size: 1.8rem;
          font-weight: 800;
          color: #FFFFFF;
          cursor: pointer;
        }

        .admin-logo-icon {
          margin-right: 0.6rem;
          font-size: 2.1rem;
          color: #F2C94C;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* Nav */
        .admin-nav {
          display: flex;
          gap: 1.8rem;
        }

        .admin-nav a {
          color: #E8F3E8;
          text-decoration: none;
          font-weight: 600;
          position: relative;
          padding-bottom: 6px;
          transition: color 0.3s ease;
        }

        /* Hover effect */
        .admin-nav a:hover {
          color: #F2C94C;
        }

        .admin-nav a::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 3px;
          background: #F2C94C;
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .admin-nav a:hover::after {
          width: 100%;
        }

        /* Active page */
        .admin-nav a.active {
          color: #F2C94C;
        }

        .admin-nav a.active::after {
          width: 100%;
        }

        /* Right */
        .admin-right {
          position: relative;
        }

        .admin-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #2E8B57;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.6rem;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(46,139,87,0.4);
        }

        /* Dropdown */
        .admin-dropdown {
          position: absolute;
          top: 55px;
          right: 0;
          background: #FFFFFF;
          width: 200px;
          border-radius: 14px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.15);
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: 0.25s;
        }

        .admin-dropdown.active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .admin-dropdown-item {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #333333;
          transition: background 0.2s;
        }

        .admin-dropdown-item:hover {
          background: rgba(242,201,76,0.15);
        }

        @media (max-width: 900px) {
          .admin-nav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

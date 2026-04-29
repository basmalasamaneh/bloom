import React, { useState, useEffect } from 'react';
import AdminHeader from './AdminHeader';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const ADMIN_BASE = `${API_BASE}/admin`;
const AdminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingExperts: 0,
    totalProducts: 0,
    activeRentals: 0,
    totalPlatformGain: 0
  });
  const [revenue, setRevenue] = useState({
    sales: 0,
    rentals: 0,
    expertChats: 0
  });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pendingExperts, setPendingExperts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const formatActivityTime = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        const headers = { ...getAuthHeaders() };
        const [statsRes, expertsRes, activityRes, alertsRes] = await Promise.all([
          fetch(`${ADMIN_BASE}/stats`, { headers, signal: controller.signal }),
          fetch(`${ADMIN_BASE}/pending-experts`, { headers, signal: controller.signal }),
          fetch(`${ADMIN_BASE}/activity`, { headers, signal: controller.signal }),
          fetch(`${ADMIN_BASE}/alerts`, { headers, signal: controller.signal })
        ]);

        if (!statsRes.ok) throw new Error('Failed to load stats');
        if (!expertsRes.ok) throw new Error('Failed to load experts');
        if (!activityRes.ok) throw new Error('Failed to load activity');
        if (!alertsRes.ok) throw new Error('Failed to load alerts');

        const statsJson = await statsRes.json();
        const expertsJson = await expertsRes.json();
        const activityJson = await activityRes.json();
        const alertsJson = await alertsRes.json();

        setStats({
          totalUsers: statsJson.totalUsers || 0,
          pendingExperts: statsJson.pendingExperts || 0,
          totalProducts: statsJson.totalProducts || 0,
          activeRentals: statsJson.activeRentals || 0,
          totalPlatformGain: statsJson.totalPlatformGain || 0
        });

        setRevenue({
          sales: statsJson?.revenue?.sales || 0,
          rentals: statsJson?.revenue?.rentals || 0,
          expertChats: statsJson?.revenue?.expertChats || 0
        });

        setPendingExperts(Array.isArray(expertsJson) ? expertsJson : []);
        setRecentActivity(
          Array.isArray(activityJson)
            ? activityJson.map(item => ({ ...item, time: formatActivityTime(item.time) }))
            : []
        );
        setAlerts(Array.isArray(alertsJson) ? alertsJson : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Admin dashboard fetch error', err);
        setError('Unable to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    return () => controller.abort();
  }, [timeFilter]);

  const handleApproveExpert = async (id) => {
    try {
      setError('');
      setSuccessMessage('');
      const res = await fetch(`${ADMIN_BASE}/experts/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!res.ok) throw new Error('Approve failed');

      setPendingExperts(prev => prev.filter(expert => expert.id !== id));
      setStats(prev => ({
        ...prev,
        pendingExperts: Math.max((prev.pendingExperts || 1) - 1, 0)
      }));
      setSuccessMessage('Expert approved successfully.');
    } catch (err) {
      console.error('Approve expert error', err);
      setError('Could not approve expert. Please try again.');
    }
  };

  const handleRejectExpert = async (id) => {
    try {
      setError('');
      setSuccessMessage('');
      const res = await fetch(`${ADMIN_BASE}/experts/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!res.ok) throw new Error('Reject failed');

      setPendingExperts(prev => prev.filter(expert => expert.id !== id));
      setStats(prev => ({
        ...prev,
        pendingExperts: Math.max((prev.pendingExperts || 1) - 1, 0)
      }));
      setSuccessMessage('Expert rejected successfully.');
    } catch (err) {
      console.error('Reject expert error', err);
      setError('Could not reject expert. Please try again.');
    }
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'product': return '🛒';
      case 'rental': return '📦';
      case 'chat': return '💬';
      case 'report': return '⚠️';
      case 'post': return '📰';
      default: return 'ℹ️';
    }
  };

  const getAlertIcon = (type) => {
    switch(type) {
      case 'overdue': return '⏰';
      case 'report': return '🚩';
      case 'suspended': return '🚫';
      default: return '⚠️';
    }
  };

  const getPercentage = (value, total) => {
    if (!total) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
  };

  // CSS Variables and Styles
  const styles = {
    ':root': {
      '--forest': '#2E8B57',
      '--leaf': '#6FCF97',
      '--yellow': '#F2C94C',
      '--cream': '#FAF9F6',
      '--sage': '#E8F3E8',
      '--olive': '#1B4332',
      '--text': '#333333',
      '--sub': '#4F6F52',
      '--white': '#ffffff',
      '--error': '#e74c3c',
      '--success': '#2ecc71'
    },
    adminDashboard: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: '#FAF9F6',
      color: '#333333',
      padding: '20px',
      minHeight: '100vh'
    },
    dashboardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    statusMessage: {
      backgroundColor: '#ffecec',
      color: '#c0392b',
      padding: '12px 16px',
      borderRadius: '10px',
      marginBottom: '16px',
      border: '1px solid rgba(231, 76, 60, 0.3)',
      fontWeight: '600'
    },
    successMessage: {
      backgroundColor: '#E8F3E8',
      color: '#1B4332',
      padding: '12px 16px',
      borderRadius: '10px',
      marginBottom: '16px',
      border: '1px solid rgba(27, 67, 50, 0.2)',
      fontWeight: '600'
    },
    loadingMessage: {
      backgroundColor: '#E8F3E8',
      color: '#1B4332',
      padding: '10px 14px',
      borderRadius: '10px',
      marginBottom: '16px',
      border: '1px solid rgba(27, 67, 50, 0.2)',
      fontWeight: '600'
    },
    dashboardTitle: {
      color: '#1B4332',
      fontSize: '2rem',
      fontWeight: '700'
    },
    timeFilter: {
      display: 'flex',
      gap: '10px'
    },
    filterBtn: {
      backgroundColor: '#ffffff',
      border: '1px solid #E8F3E8',
      color: '#4F6F52',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    filterBtnActive: {
      backgroundColor: '#2E8B57',
      color: '#ffffff',
      borderColor: '#2E8B57'
    },
    statsCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    },
    statCardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
    },
    statIcon: {
      fontSize: '2rem',
      marginRight: '15px',
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%'
    },
    statIconUsers: {
      backgroundColor: 'rgba(46, 139, 87, 0.1)'
    },
    statIconExperts: {
      backgroundColor: 'rgba(242, 201, 76, 0.1)'
    },
    statIconProducts: {
      backgroundColor: 'rgba(111, 207, 151, 0.1)'
    },
    statIconRentals: {
      backgroundColor: 'rgba(79, 111, 82, 0.1)'
    },
    statIconGain: {
      backgroundColor: 'rgba(27, 67, 50, 0.1)'
    },
    statContent: {
      flex: '1'
    },
    statValue: {
      fontSize: '1.8rem',
      fontWeight: '700',
      margin: '0',
      color: '#1B4332'
    },
    statLabel: {
      margin: '5px 0 0',
      color: '#4F6F52',
      fontSize: '0.9rem'
    },
    revenueOverview: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    },
    sectionTitle: {
      color: '#1B4332',
      fontSize: '1.5rem',
      marginTop: '0',
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '1px solid #E8F3E8'
    },
    revenueCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px'
    },
    revenueCard: {
      padding: '15px',
      borderRadius: '8px',
      position: 'relative'
    },
    revenueCardSales: {
      backgroundColor: 'rgba(46, 139, 87, 0.05)'
    },
    revenueCardRentals: {
      backgroundColor: 'rgba(111, 207, 151, 0.05)'
    },
    revenueCardChats: {
      backgroundColor: 'rgba(242, 201, 76, 0.05)'
    },
    revenueLabel: {
      margin: '0 0 10px',
      color: '#4F6F52',
      fontSize: '0.9rem',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    revenueValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      margin: '0 0 15px',
      color: '#1B4332'
    },
    revenueBar: {
      height: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    revenueFill: {
      height: '100%',
      borderRadius: '4px'
    },
    salesFill: {
      backgroundColor: '#2E8B57'
    },
    rentalsFill: {
      backgroundColor: '#6FCF97'
    },
    chatsFill: {
      backgroundColor: '#F2C94C'
    },
    dashboardRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '30px',
      marginBottom: '30px'
    },
    expertApproval: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    },
    expertTableContainer: {
      overflowX: 'auto'
    },
    expertTable: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    expertTableTh: {
      textAlign: 'left',
      padding: '12px 15px',
      borderBottom: '1px solid #E8F3E8',
      color: '#4F6F52',
      fontWeight: '600'
    },
    expertTableTd: {
      padding: '12px 15px',
      borderBottom: '1px solid #E8F3E8'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: '600'
    },
    statusBadgePending: {
      backgroundColor: 'rgba(242, 201, 76, 0.2)',
      color: '#F2C94C'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    btnApprove: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '0.8rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: '#2ecc71',
      color: '#ffffff'
    },
    btnReject: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '0.8rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: '#e74c3c',
      color: '#ffffff'
    },
    latestActivity: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    },
    activityList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    activityItem: {
      display: 'flex',
      alignItems: 'flex-start',
      padding: '10px',
      borderRadius: '8px',
      transition: 'background-color 0.3s ease'
    },
    activityItemHover: {
      backgroundColor: '#E8F3E8'
    },
    activityIcon: {
      fontSize: '1.5rem',
      marginRight: '15px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(46, 139, 87, 0.1)',
      borderRadius: '50%'
    },
    activityContent: {
      flex: '1'
    },
    activityAction: {
      margin: '0 0 5px',
      fontWeight: '600'
    },
    activityDetails: {
      margin: '0 0 5px',
      color: '#4F6F52',
      fontSize: '0.9rem'
    },
    activityTime: {
      margin: '0',
      color: '#4F6F52',
      fontSize: '0.8rem',
      fontStyle: 'italic'
    },
    alertsSection: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    },
    alertsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '15px'
    },
    alertItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '15px',
      borderRadius: '8px',
      borderLeft: '4px solid'
    },
    alertItemOverdue: {
      backgroundColor: 'rgba(242, 201, 76, 0.1)',
      borderLeftColor: '#F2C94C'
    },
    alertItemReport: {
      backgroundColor: 'rgba(46, 139, 87, 0.1)',
      borderLeftColor: '#2E8B57'
    },
    alertItemSuspended: {
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      borderLeftColor: '#e74c3c'
    },
    alertIcon: {
      fontSize: '1.5rem',
      marginRight: '15px'
    },
    alertMessage: {
      margin: '0',
      fontWeight: '500'
    },
    emptyState: {
      padding: '12px 0',
      color: '#4F6F52',
      fontStyle: 'italic'
    }
  };

  return (
    <>
      <AdminHeader currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div style={styles.adminDashboard}>
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-row {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 768px) {
          .stats-cards {
            grid-template-columns: 1fr !important;
          }
          
          .revenue-cards {
            grid-template-columns: 1fr !important;
          }
          
          .dashboard-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 15px !important;
          }
        }
      `}</style>

      {error && <div style={styles.statusMessage}>{error}</div>}
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
      {loading && !error && <div style={styles.loadingMessage}>Loading latest data...</div>}

      {/* Top Summary Cards */}
      <section style={styles.statsCards}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, ...styles.statIconUsers}}>👤</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.totalUsers.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Users</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, ...styles.statIconExperts}}>🧑‍🔬</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.pendingExperts}</h3>
            <p style={styles.statLabel}>Pending Experts</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, ...styles.statIconProducts}}>🛒</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.totalProducts}</h3>
            <p style={styles.statLabel}>Total Products</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, ...styles.statIconRentals}}>🔄</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.activeRentals}</h3>
            <p style={styles.statLabel}>Active Rentals</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, ...styles.statIconGain}}>💰</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>${stats.totalPlatformGain.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Platform Gain</p>
          </div>
        </div>
      </section>

      {/* Revenue Overview */}
      <section style={styles.revenueOverview}>
        <h2 style={styles.sectionTitle}>Revenue Overview</h2>
        <div style={styles.revenueCards}>
          <div style={{...styles.revenueCard, ...styles.revenueCardSales}}>
            <h3 style={styles.revenueLabel}>Sales</h3>
            <p style={styles.revenueValue}>${revenue.sales.toLocaleString()}</p>
            <div style={styles.revenueBar}>
              <div style={{...styles.revenueFill, ...styles.salesFill, width: `${getPercentage(revenue.sales, stats.totalPlatformGain)}%`}}></div>
            </div>
          </div>
          
          <div style={{...styles.revenueCard, ...styles.revenueCardRentals}}>
            <h3 style={styles.revenueLabel}>Rentals</h3>
            <p style={styles.revenueValue}>${revenue.rentals.toLocaleString()}</p>
            <div style={styles.revenueBar}>
              <div style={{...styles.revenueFill, ...styles.rentalsFill, width: `${getPercentage(revenue.rentals, stats.totalPlatformGain)}%`}}></div>
            </div>
          </div>
          
          <div style={{...styles.revenueCard, ...styles.revenueCardChats}}>
            <h3 style={styles.revenueLabel}>Expert Chats</h3>
            <p style={styles.revenueValue}>${revenue.expertChats.toLocaleString()}</p>
            <div style={styles.revenueBar}>
              <div style={{...styles.revenueFill, ...styles.chatsFill, width: `${getPercentage(revenue.expertChats, stats.totalPlatformGain)}%`}}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts and Warnings */}
      <section style={styles.alertsSection}>
        <h2 style={styles.sectionTitle}>System Alerts</h2>
        <div style={styles.alertsContainer}>
          {alerts.length === 0 ? (
            <div style={styles.emptyState}>No alerts right now.</div>
          ) : (
            alerts.map(alert => (
              <div 
                key={alert.id || alert.message} 
                style={{
                  ...styles.alertItem,
                  ...(alert.type === 'overdue' ? styles.alertItemOverdue : 
                     alert.type === 'report' ? styles.alertItemReport : 
                     styles.alertItemSuspended)
                }}
              >
                <div style={styles.alertIcon}>{getAlertIcon(alert.type)}</div>
                <p style={styles.alertMessage}>{alert.message}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <div style={styles.dashboardRow}>
        {/* Expert Approval Widget */}
        <section style={styles.expertApproval}>
          <h2 style={styles.sectionTitle}>Pending Expert Approvals</h2>
          <div style={styles.expertTableContainer}>
            <table style={styles.expertTable}>
              <thead>
                <tr>
                  <th style={styles.expertTableTh}>Name</th>
                  <th style={styles.expertTableTh}>Email</th>
                  <th style={styles.expertTableTh}>Status</th>
                  <th style={styles.expertTableTh}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingExperts.length === 0 ? (
                  <tr>
                    <td style={styles.expertTableTd} colSpan="4">
                      <div style={styles.emptyState}>No pending expert approvals.</div>
                    </td>
                  </tr>
                ) : (
                  pendingExperts.map(expert => {
                    const expertName = expert.farmer?.name || expert.name || 'Unknown';
                    const expertEmail = expert.farmer?.email || expert.email || 'Unknown';

                    return (
                      <tr key={expert.id}>
                      <td style={styles.expertTableTd}>{expertName}</td>
                      <td style={styles.expertTableTd}>{expertEmail}</td>
                      <td style={styles.expertTableTd}>
                        <span style={{...styles.statusBadge, ...styles.statusBadgePending}}>Pending</span>
                      </td>
                      <td style={styles.expertTableTd}>
                        <div style={styles.actionButtons}>
                          <button 
                            style={styles.btnApprove}
                            onClick={() => handleApproveExpert(expert.id)}
                          >
                            Approve
                          </button>
                          <button 
                            style={styles.btnReject}
                            onClick={() => handleRejectExpert(expert.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Latest Activity */}
        <section style={styles.latestActivity}>
          <h2 style={styles.sectionTitle}>Latest Activity</h2>
          <div style={styles.activityList}>
            {recentActivity.length === 0 ? (
              <div style={styles.emptyState}>No recent activity.</div>
            ) : (
              recentActivity.map((activity, index) => {
                const activityKey = activity.id ?? `${activity.type || 'activity'}-${activity.time || index}-${activity.action || ''}`;

                return (
                  <div 
                    key={activityKey} 
                    style={styles.activityItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F3E8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
                    <div style={styles.activityContent}>
                      <p style={styles.activityAction}>{activity.action}</p>
                      <p style={styles.activityDetails}>{activity.details || 'No details provided.'}</p>
                      <p style={styles.activityTime}>{activity.time || ''}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

    </div>
    </>
  );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token } = useAuth();
  const { onlineUsers, notifications, clearNotification } = useSocket();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/exams`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch papers');

        const data = await response.json();
        setPapers(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [token]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="dashboard">
          <header className="dashboard-header">
            <div>
              <h1>Workspace</h1>
              <p className="text-muted">Welcome back, {user?.name}. Here is your systemic overview.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {/* Notifications Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="btn btn-secondary"
                  style={{ position: 'relative' }}
                >
                  🔔
                  {notifications.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: 'var(--danger)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '350px',
                    maxHeight: '400px',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 'bold',
                    }}>
                      Notifications
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div key={notification.id} style={{
                            padding: '1rem',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => clearNotification(notification.id)}
                          >
                            <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                              {notification.message}
                            </div>
                            {notification.details && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                {notification.details}
                              </div>
                            )}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {formatTime(notification.timestamp)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <a href="/exam/create" className="btn btn-primary">+ Draft New Paper</a>
            </div>
          </header>

          <div className="dashboard-content">
            <div className="dashboard-main">
              <div className="stat-grid">
                <div className="stat-card card">
                  <span className="label">Total Repository</span>
                  <span className="value">{papers.length}</span>
                </div>
                <div className="stat-card card">
                  <span className="label">Live Assessment</span>
                  <span className="value">{papers.filter(p => p.status === 'published').length}</span>
                </div>
                <div className="stat-card card">
                  <span className="label">Auth Level</span>
                  <span className="value" style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>{user?.role?.toUpperCase()}</span>
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="section-title">Academic Inventory</div>

              {loading ? (
                <div className="spinner"></div>
              ) : (
                <div className="papers-grid">
                  {papers.length === 0 ? (
                    <div className="card text-center" style={{ gridColumn: '1 / -1', padding: '3rem' }}>
                      <p className="text-muted">No assessment records found in this domain.</p>
                    </div>
                  ) : (
                    papers.map((paper) => (
                      <div key={paper._id} className="paper-card card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className={`status-indicator status-${paper.status}`}></div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{paper.status}</span>
                        </div>
                        <h3>{paper.title}</h3>
                        <div className="paper-meta">
                          <span className="meta-item">📚 {paper.subject}</span>
                          <span className="meta-item">⏱️ {paper.duration}m</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1 }}>
                          {paper.description || 'No description provided.'}
                        </p>
                        <a href={`/exam/${paper._id}`} className="btn btn-secondary" style={{ width: '100%' }}>
                          Open Repository
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <aside className="dashboard-sidebar">
              <div className="widget">
                <h3>System Integrity</h3>
                <div className="health-gauge">
                  <span className="health-value">98%</span>
                  <span className="health-label">HEALTHY</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                  All systems operational. No unauthorized access attempts detected in last 24h.
                </p>
              </div>

              <div className="widget">
                <h3>Online Users ({onlineUsers.length})</h3>
                <div className="activity-list">
                  {onlineUsers.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users online
                    </div>
                  ) : (
                    onlineUsers.slice(0, 5).map((onlineUser, index) => (
                      <div key={onlineUser.userId || index} className="activity-item">
                        <div className="activity-icon" style={{
                          backgroundColor: onlineUser.userRole === 'admin' ? 'var(--primary)' : 'var(--secondary)',
                          position: 'relative',
                        }}>
                          <span style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#10b981',
                            borderRadius: '50%',
                            border: '2px solid var(--card-bg)',
                          }}></span>
                        </div>
                        <div>
                          <strong>{onlineUser.userName}</strong>
                          <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {onlineUser.userRole === 'admin' ? 'Administrator' : 'User'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {onlineUsers.length > 5 && (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      +{onlineUsers.length - 5} more online
                    </div>
                  )}
                </div>
              </div>

              <div className="widget">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon" style={{ backgroundColor: 'var(--primary)' }}></div>
                    <div>
                      <strong>System Seed</strong>
                      <p className="text-muted">Auto-generated fallback users created.</p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon" style={{ backgroundColor: 'var(--secondary)' }}></div>
                    <div>
                      <strong>Identity Sync</strong>
                      <p className="text-muted">Profile successfully migrated to modern UI.</p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon" style={{ backgroundColor: '#10b981' }}></div>
                    <div>
                      <strong>Audit Complete</strong>
                      <p className="text-muted">Integrity check passed for all repositories.</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

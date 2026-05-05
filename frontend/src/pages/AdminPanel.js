import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'faculty',
    department: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role !== 'admin') {
      return;
    }

    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'audit') {
      fetchAuditTrail();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAuditTrail(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowCreateUser(false);
        setNewUser({ name: '', email: '', password: '', role: 'faculty', department: '' });
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="admin-panel">
          <header>
            <h1>System Oversight</h1>
            <p className="text-muted">Monitor platform activity and security audit trails.</p>
          </header>

          <div className="tabs">
            {['users', 'logs', 'audit', 'alerts'].map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'users' && (
              <div>
                <div className="flex-between">
                  <h2>User Management</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateUser(!showCreateUser)}
                  >
                    {showCreateUser ? 'Cancel' : '+ Create User'}
                  </button>
                </div>

                {showCreateUser && (
                  <div className="create-user-form">
                    <h3>Create New User</h3>
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={createUser}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Password</label>
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Role</label>
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        >
                          <option value="faculty">Faculty</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Department</label>
                        <input
                          type="text"
                          value={newUser.department}
                          onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td style={{ fontWeight: 600 }}>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`badge badge-${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>{user.department || '-'}</td>
                          <td>
                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <h2>Real-time Access Logs</h2>
                {loading ? <div className="spinner"></div> : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>User Identity</th>
                          <th>Operation</th>
                          <th>Timestamp</th>
                          <th>Availability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 600 }}>{log.userId?.name || 'System'}</td>
                            <td>{log.action}</td>
                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                            <td>
                              <span className={`badge badge-${log.status === 'success' ? 'success' : 'failed'}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div>
                <h2>Security Audit Trail</h2>
                {loading ? <div className="spinner"></div> : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Actor</th>
                          <th>Action</th>
                          <th>Entity Type</th>
                          <th>Severity</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditTrail.map((entry, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 600 }}>{entry.performedBy?.name || 'System'}</td>
                            <td><code>{entry.action}</code></td>
                            <td>{entry.entityType}</td>
                            <td>
                              <span className={`badge badge-${entry.severity === 'high' || entry.severity === 'critical' ? 'critical' : entry.severity}`}>
                                {entry.severity}
                              </span>
                            </td>
                            <td>{new Date(entry.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                <h2>Security Incident Alerts</h2>
                <div className="alert alert-warning">
                  Intrusion detection and real-time alerts are currently inactive.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uniqueKey, setUniqueKey] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, mfaRequired ? uniqueKey : null);
      if (result.mfaRequired) {
        setMfaRequired(true);
        setPassword(''); // Clear password for MFA attempt
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <h2>Secure. Transparent. Effortless.</h2>
        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon">🛡️</div>
            <div className="feature-text">
              <h4>Advanced Integrity</h4>
              <p>Multi-layered validation and tamper-proof storage for high-stakes exams.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-text">
              <h4>Instant Deployment</h4>
              <p>Streamlined workflow from drafting to publishing with real-time syncing.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🧠</div>
            <div className="feature-text">
              <h4>AI-Aided Insight</h4>
              <p>Sophisticated analytics and monitoring to ensure full systemic transparency.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <h1>SecureExam</h1>
          <p className="auth-subtitle">Sign in to your administration desk.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@secureexam.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mfaRequired}
              />
            </div>

            {!mfaRequired && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {mfaRequired && (
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={uniqueKey}
                  onChange={(e) => setUniqueKey(e.target.value)}
                  placeholder="6-digit unique key"
                  required
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : mfaRequired ? 'Verify & Continue' : 'Enter Workspace'}
            </button>
          </form>

          <p className="auth-link">
            Contact your administrator to request account access.
          </p>

          <div className="demo-credentials">
            <h3>Environment: Development</h3>
            <p><strong>Admin:</strong> admin@secureexam.com</p>
            <p><strong>Faculty:</strong> faculty@secureexam.com</p>
            <p><small>Testing bypass enabled for development purposes.</small></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

function LoginPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);

  // Generate floating particles
  useEffect(() => {
    const generated = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 5
    }));
    setParticles(generated);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (!formData.username.trim()) {
          throw new Error('Username is required');
        }
        await register(formData.username, formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${20 / p.speed}s`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      {/* Login Card */}
      <div className={`login-card ${isLogin ? 'login-mode' : 'register-mode'}`}>
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="2" y="6" width="44" height="32" rx="6" fill="url(#logoGrad)" opacity="0.9"/>
              <path d="M14 22h20M14 28h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="38" cy="34" r="8" fill="#00d2ff" stroke="#0a0a1a" strokeWidth="2"/>
              <path d="M35 34l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logoGrad" x1="2" y1="6" x2="46" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6c5ce7"/>
                  <stop offset="1" stopColor="#00cec9"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">ChatVerse</h1>
          <p className="logo-subtitle">
            {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="login-error">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group animate-in">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                id="password"
                type="password"
                placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 chars)'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <div className="btn-loader">
                <div className="btn-spinner"></div>
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="login-toggle">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button type="button" onClick={toggleMode} className="toggle-btn">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Features showcase */}
        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon">💬</div>
            <span>Real-time Chat</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📹</div>
            <span>Video Calls</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎤</div>
            <span>AI Voice</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📎</div>
            <span>File Sharing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

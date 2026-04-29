import React, { useState } from 'react';
import { FiUser, FiMail, FiLock, FiMapPin, FiHome, FiEye, FiEyeOff, FiSun, FiArrowRight } from 'react-icons/fi';
import { FaLeaf, FaSeedling, FaCloudSun } from 'react-icons/fa';

const signupImg = process.env.PUBLIC_URL + '/img/sginup.jpeg';

const passwordRuleRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: '',
    village: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [signingUp, setSigningUp] = useState(false);

  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') {
      setPasswordError(
        passwordRuleRegex.test(value)
          ? ''
          : 'Password must be at least 8 characters and include letters and numbers.'
      );
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!passwordRuleRegex.test(formData.password)) {
      setPasswordError('Password must be at least 8 characters and include letters and numbers.');
      return;
    }
    try {
      setSigningUp(true);
      const { register } = await import('../services/auth');
      await register(formData);
      alert('Welcome to Bloom! Your account has been created.');
      // After signup, go to Home page (then user can navigate to community)
      if (window && window.location) window.location.assign('/home');
    } catch (err) {
      console.error('Signup failed:', err);
      alert(err?.message || 'Failed to sign up. Please try again.');
    } finally {
      setSigningUp(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --bloom-bg: #FAF9F6;
          --bloom-card: #E8F3E8;
          --bloom-green: #2E8B57;
          --bloom-leaf: #6FCF97;
          --bloom-yellow: #F2C94C;
          --bloom-text: #333333;
          --bloom-sub: #4F6F52;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .signup-container {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
          background: var(--bloom-bg);
        }
        
        /* Creative gradient layers */
        .gradient-layer-1 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 20% 80%, rgba(111, 207, 151, 0.3) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(242, 201, 76, 0.25) 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, rgba(46, 139, 87, 0.2) 0%, transparent 50%);
          z-index: 1;
        }
        
        .gradient-layer-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, 
            rgba(46, 139, 87, 0.05) 0%, 
            rgba(111, 207, 151, 0.08) 25%, 
            rgba(242, 201, 76, 0.05) 50%, 
            rgba(232, 243, 232, 0.1) 75%, 
            rgba(46, 139, 87, 0.05) 100%);
          z-index: 2;
        }
        
        /* Organic floating elements */
        .organic-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 3;
          pointer-events: none;
        }
        
        .organic-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          animation: organicFloat 25s infinite ease-in-out;
        }
        
        .shape-1 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(111, 207, 151, 0.4) 0%, rgba(111, 207, 151, 0) 70%);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }
        
        .shape-2 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(242, 201, 76, 0.3) 0%, rgba(242, 201, 76, 0) 70%);
          bottom: -80px;
          right: -80px;
          animation-delay: 5s;
        }
        
        .shape-3 {
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(46, 139, 87, 0.3) 0%, rgba(46, 139, 87, 0) 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 10s;
        }
        
        @keyframes organicFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.7;
          }
          25% {
            transform: translate(30px, -30px) scale(1.1);
            opacity: 0.9;
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
            opacity: 0.6;
          }
          75% {
            transform: translate(40px, 10px) scale(1.05);
            opacity: 0.8;
          }
        }
        
        .left-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 4rem 2.5rem;
          color: var(--bloom-text);
          position: relative;
          z-index: 10;
          opacity: 0;
          transform: translateX(-50px);
          animation: slideInLeft 0.8s ease-out forwards;
        }
        
        .right-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 10;
          opacity: 0;
          transform: translateX(50px);
          animation: slideInRight 0.8s ease-out 0.2s forwards;
        }
        
        @keyframes slideInLeft {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .logo-container {
          position: relative;
          margin-bottom: 2rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--bloom-green);
          letter-spacing: -0.5px;
          animation: fadeInScale 1s ease-out 0.5s both;
          position: relative;
          z-index: 2;
        }
        
        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(242, 201, 76, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 1;
          animation: pulseGlow 3s infinite ease-in-out;
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .logo-icon {
          margin-right: 0.75rem;
          color: var(--bloom-yellow);
          font-size: 3.8rem;
          animation: bounce 2s infinite;
          filter: drop-shadow(0 4px 8px rgba(242, 201, 76, 0.3));
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .description {
          max-width: 28rem;
          font-size: 1.25rem;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 2rem;
          color: var(--bloom-sub);
          animation: fadeIn 1s ease-out 0.7s both;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .features {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 28rem;
          animation: fadeIn 1s ease-out 0.9s both;
        }
        
        .feature {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(232, 243, 232, 0.8) 0%, rgba(111, 207, 151, 0.1) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(46, 139, 87, 0.1);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
        }
        
        .feature::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(242, 201, 76, 0.2), transparent);
          transition: left 0.6s;
        }
        
        .feature:hover::before {
          left: 100%;
        }
        
        .feature:hover {
          transform: translateX(10px) scale(1.02);
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.15);
          border-color: rgba(111, 207, 151, 0.3);
        }
        
        .feature-icon {
          background: linear-gradient(135deg, var(--bloom-yellow) 0%, rgba(242, 201, 76, 0.8) 100%);
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(242, 201, 76, 0.3);
        }
        
        .feature:hover .feature-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 20px rgba(242, 201, 76, 0.4);
        }
        
        .feature-text {
          font-size: 1rem;
          font-weight: 500;
          color: var(--bloom-text);
        }
        
        .form-container {
          width: 90%;
          max-width: 500px;
          padding: 2.5rem;
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(232, 243, 232, 0.9) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(111, 207, 151, 0.2);
          box-shadow: 
            0 20px 40px rgba(46, 139, 87, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          animation: fadeInUp 0.8s ease-out 0.4s both;
          position: relative;
          overflow: hidden;
        }
        
        .form-container::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(242, 201, 76, 0.05) 0%, transparent 70%);
          animation: rotate 30s linear infinite;
          pointer-events: none;
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .form-title {
          font-size: 2.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--bloom-green) 0%, var(--bloom-leaf) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        
        .form-subtitle {
          font-size: 0.95rem;
          color: var(--bloom-sub);
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }
        
        .form-group {
          margin-bottom: 1.25rem;
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
          position: relative;
          z-index: 1;
        }
        
        .form-group:nth-child(3) {
          animation-delay: 0.5s;
        }
        
        .form-group:nth-child(4) {
          animation-delay: 0.6s;
        }
        
        .form-group:nth-child(5) {
          animation-delay: 0.7s;
        }
        
        .form-group:nth-child(6) {
          animation-delay: 0.8s;
        }
        
        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--bloom-green);
          margin-bottom: 0.5rem;
        }
        
        .input-group {
          display: flex;
          align-items: center;
          position: relative;
          border-radius: 18px;
          padding: 0.875rem 1.25rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: linear-gradient(145deg, rgba(232, 243, 232, 0.6) 0%, rgba(255, 255, 255, 0.8) 100%);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        
        .input-group::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 18px;
          padding: 2px;
          background: linear-gradient(135deg, var(--bloom-leaf), var(--bloom-yellow));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none; /* FIX: Added to prevent blocking input */
        }
        
        .input-group:focus-within::before {
          opacity: 1;
        }
        
        .input-group:focus-within {
          background: linear-gradient(145deg, rgba(232, 243, 232, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.12);
        }
        
        .input-icon {
          color: var(--bloom-sub);
          margin-right: 1rem;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }
        
        .input-group:focus-within .input-icon {
          color: var(--bloom-green);
          transform: scale(1.1);
        }
        
        .form-input {
          width: 100%;
          outline: none;
          background-color: transparent;
          font-size: 1rem;
          color: var(--bloom-text);
          transition: all 0.3s ease;
          position: relative; /* FIX: Added for z-index to work */
          z-index: 1; /* FIX: Added to ensure input is on top */
        }
        
        .form-input::placeholder {
          color: var(--bloom-sub);
          opacity: 0.6;
          transition: opacity 0.3s ease;
        }
        
        .input-group:focus-within .form-input::placeholder {
          opacity: 0.4;
        }
        
        .password-rule {
          font-size: 0.8rem;
          color: var(--bloom-sub);
          margin-top: 0.25rem;
          margin-left: 0.5rem;
        }

        .password-error {
          font-size: 0.8rem;
          color: #c53030;
          margin-top: 0.25rem;
          margin-left: 0.5rem;
        }
        
        .password-toggle {
          background: none;
          border: none;
          outline: none;
          color: var(--bloom-sub);
          cursor: pointer;
          margin-left: 0.5rem;
          transition: all 0.3s ease;
          padding: 0.25rem;
          position: relative; /* FIX: Added for z-index to work */
          z-index: 1; /* FIX: Added to ensure button is clickable */
        }
        
        .password-toggle:hover {
          color: var(--bloom-green);
          transform: scale(1.1);
        }
        
        .submit-button {
          width: 100%;
          background: linear-gradient(135deg, var(--bloom-green) 0%, var(--bloom-leaf) 100%);
          color: white;
          padding: 1rem;
          border-radius: 18px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-size: 1.05rem;
          margin-top: 1.5rem;
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          animation: fadeIn 0.5s ease-out 0.9s forwards;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }
        
        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s;
        }
        
        .submit-button:hover::before {
          left: 100%;
        }
        
        .submit-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 35px rgba(46, 139, 87, 0.35);
        }
        
        .submit-button:active {
          transform: translateY(-1px) scale(1.01);
        }
        
        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .signin-link {
          text-align: center;
          font-size: 0.9rem;
          color: var(--bloom-sub);
          margin-top: 1.5rem;
          opacity: 0;
          animation: fadeIn 0.5s ease-out 1s forwards;
          position: relative;
          z-index: 1;
        }
        
        .signin-link a {
          color: var(--bloom-green);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .signin-link a::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--bloom-green), var(--bloom-leaf));
          transition: width 0.3s ease;
        }
        
        .signin-link a:hover {
          color: var(--bloom-leaf);
        }
        
        .signin-link a:hover::after {
          width: 100%;
        }
        
        .sun-icon {
          position: absolute;
          top: 40px;
          right: 40px;
          font-size: 2rem;
          color: var(--bloom-yellow);
          animation: sunPulse 4s infinite ease-in-out;
          opacity: 0.6;
        }
        
        @keyframes sunPulse {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1) rotate(10deg);
            opacity: 0.9;
          }
        }
        
        @media (max-width: 768px) {
          .signup-container {
            flex-direction: column;
          }
          
          .left-section {
            padding: 2rem 1.5rem;
            min-height: 40vh;
          }
          
          .right-section {
            padding: 1rem;
          }
          
          .form-container {
            max-width: 100%;
            padding: 2rem;
          }
          
          .logo {
            font-size: 2.8rem;
          }
          
          .logo-icon {
            font-size: 3.1rem;
          }
          
          .description {
            font-size: 1.1rem;
          }
          
          .sun-icon {
            top: 20px;
            right: 20px;
            font-size: 1.5rem;
          }
        }
      `}</style>
      
      <div className="signup-container">
        {/* Creative gradient layers */}
        <div className="gradient-layer-1"></div>
        <div className="gradient-layer-2"></div>
        
        {/* Organic floating shapes */}
        <div className="organic-shapes">
          <div className="organic-shape shape-1"></div>
          <div className="organic-shape shape-2"></div>
          <div className="organic-shape shape-3"></div>
        </div>
        
        {/* Decorative sun icon */}
        <FiSun className="sun-icon" />
        
        {/* Left Section with Logo and Description */}
        <div className="left-section">
          <div className="logo-container">
            <div className="logo-glow"></div>
            <div className="logo">
              <FaLeaf className="logo-icon" /> Bloom
            </div>
          </div>
          <p className="description">
            Welcome to <span style={{ fontWeight: 700, color: 'var(--bloom-green)' }}>Bloom</span> — where your farming journey begins.
          </p>
          
          <div className="features">
            <div className="feature">
              <div className="feature-icon">
                <FaSeedling />
              </div>
              <div className="feature-text">Connect with agricultural experts</div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <FiMapPin />
              </div>
              <div className="feature-text">Get location-specific farming insights</div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <FaCloudSun />
              </div>
              <div className="feature-text">Track weather and growth cycles</div>
            </div>
          </div>
        </div>
        
        {/* Right Section with Form */}
        <div className="right-section">
          <div className="form-container">
            <form onSubmit={handleRegisterSubmit}>
              <h2 className="form-title">Join Bloom</h2>
              <p className="form-subtitle">Create your account to start farming smarter</p>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-group">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="form-input"
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-group">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="form-input"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    className="form-input"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <div className="password-rule">
                  Use 8+ characters with letters and numbers.
                </div>
                {passwordError && <p className="password-error">{passwordError}</p>}
              </div>

              {/* City */}
              <div className="form-group">
                <label className="form-label">City</label>
                <div className="input-group">
                  <FiMapPin className="input-icon" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter your city"
                    required
                    className="form-input"
                    onFocus={() => setFocusedField('city')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Village */}
              <div className="form-group">
                <label className="form-label">Village (optional)</label>
                <div className="input-group">
                  <FiHome className="input-icon" />
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    placeholder="Enter your village"
                    className="form-input"
                    onFocus={() => setFocusedField('village')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={signingUp}>
                {signingUp ? 'Creating Account...' : 'Join Bloom'}
                {!signingUp && <FiArrowRight />}
              </button>

              <p className="signin-link">
                Already have an account? <a href="/signin">Sign in here</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;

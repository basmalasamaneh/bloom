// Footer.jsx
import React, { useState } from 'react';
import { FaLeaf } from 'react-icons/fa';
import About from './About';
import HelpCenter from './HelpCenter';
import ContactUs from './ContactUs';

const Footer = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [email, setEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNavigation = (section) => {
    setActiveSection(section);
    
    if (section === 'about') {
      setShowAbout(true);
    } else if (section === 'privacy') {
      setShowPrivacy(true);
    } else if (section === 'terms') {
      setShowTerms(true);
    } else if (section === 'help') {
      setShowHelp(true);
    } else if (section === 'contact') {
      setShowContact(true);
    } else {
      console.log(`Navigating to: ${section}`);
      alert(`Navigating to ${section} page`);
    }
  };

  const handleCloseAbout = () => {
    setShowAbout(false);
  };

  const handleClosePrivacy = () => {
    setShowPrivacy(false);
  };

  const handleCloseTerms = () => {
    setShowTerms(false);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
  };

  const handleCloseContact = () => {
    setShowContact(false);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setSubscriptionStatus('');
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubscriptionStatus('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    setSubscriptionStatus('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubscriptionStatus('Successfully subscribed! Thank you for joining our community.');
      setEmail('');
      
      setTimeout(() => {
        setSubscriptionStatus('');
      }, 5000);
    } catch (error) {
      setSubscriptionStatus('Something went wrong. Please try again later.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <>
      <style>{`
        .footer {
          background: linear-gradient(135deg, #0a2e1a 0%, #1a4332 50%, #0f3829 100%);
          color: #about: 0;
          padding: 30px 0 20px;
          margin-top: 40px;
          position: relative;
        }

        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(46, 139, 87, 0.3), transparent);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 25px;
          padding: 0 20px;
        }

        .footer-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .footer-section:nth-child(1) { animation-delay: 0.1s; }
        .footer-section:nth-child(2) { animation-delay: 0.2s; }
        .footer-section:nth-child(3) { animation-delay: 0.3s; }
        .footer-section:nth-child(4) { animation-delay: 0.4s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .footer-section:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .footer-section h3 {
          margin-top: 0;
          margin-bottom: 12px;
          color: #F2C94C;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.3px;
          position: relative;
          display: inline-block;
        }

        .footer-section h3::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 20px;
          height: 2px;
          background: linear-gradient(90deg, #F2C94C, #2E8B57);
          border-radius: 1px;
          transition: width 0.3s ease;
        }

        .footer-section:hover h3::after {
          width: 100%;
        }

        .footer-section p {
          margin-bottom: 12px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
        }

        .footer-section ul {
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .footer-section ul li {
          margin-bottom: 8px;
          position: relative;
          padding-left: 15px;
          transition: transform 0.2s ease;
        }

        .footer-section ul li:hover {
          transform: translateX(5px);
        }

        .footer-section ul li .leaf-icon {
          position: absolute;
          left: 0;
          top: 2px;
          color: #F2C94C;
          font-size: 12px;
          transition: transform 0.3s ease;
        }

        .footer-section ul li:hover .leaf-icon {
          transform: rotate(15deg) scale(1.2);
        }

        .footer-section ul li a {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          font-size: 13px;
          transition: all 0.3s ease;
          cursor: pointer;
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          position: relative;
          z-index: 1;
        }

        .footer-section ul li a:hover {
          color: #F2C94C;
          background: rgba(255, 255, 255, 0.1);
        }

        .footer-section ul li a.active {
          color: #F2C94C;
          background: rgba(255, 255, 255, 0.15);
        }

        .social-links {
          display: flex;
          gap: 15px;
          margin-top: 15px;
        }

        .social-link {
          width: 35px;
          height: 35px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .social-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #2E8B57, #6FCF97);
          transform: scale(0);
          transition: transform 0.3s ease;
          border-radius: 50%;
          z-index: 0;
        }

        .social-link:hover::before {
          transform: scale(1);
        }

        .social-link:hover {
          transform: translateY(-3px) rotate(5deg);
          box-shadow: 0 5px 15px rgba(46, 139, 87, 0.3);
        }

        .social-link span {
          position: relative;
          z-index: 1;
        }

        .newsletter-form {
          display: flex;
          margin-top: 15px;
          flex-direction: column;
          gap: 10px;
        }

        .newsletter-input-wrapper {
          display: flex;
          width: 100%;
          position: relative;
          overflow: hidden;
          border-radius: 20px;
        }

        .newsletter-form input {
          flex-grow: 1;
          padding: 10px 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px 0 0 20px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 13px;
          transition: all 0.3s ease;
        }

        .newsletter-form input:focus {
          outline: none;
          border-color: #F2C94C;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 10px rgba(242, 201, 76, 0.3);
        }

        .newsletter-form input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .newsletter-form button {
          background: linear-gradient(135deg, #F2C94C, #E5B040);
          color: #1B4332;
          border: none;
          padding: 10px 20px;
          border-radius: 0 20px 20px 0;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          min-width: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .newsletter-form button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #E5B040, #F2C94C);
          transition: left 0.3s ease;
          z-index: 0;
        }

        .newsletter-form button:hover::before {
          left: 0;
        }

        .newsletter-form button span {
          position: relative;
          z-index: 1;
        }

        .newsletter-form button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(242, 201, 76, 0.3);
        }

        .newsletter-form button:active {
          transform: translateY(0);
        }

        .newsletter-form button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .newsletter-status {
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
          animation: slideIn 0.4s ease;
        }

        .newsletter-status.success {
          background-color: rgba(46, 139, 87, 0.2);
          color: #6FCF97;
          border: 1px solid rgba(111, 207, 151, 0.3);
        }

        .newsletter-status.error {
          background-color: rgba(220, 53, 69, 0.2);
          color: #ff6b6b;
          border: 1px solid rgba(255, 107, 107, 0.3);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .footer-bottom {
          text-align: center;
          padding-top: 20px;
          margin-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          position: relative;
        }

        .footer-bottom .leaf-icon {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16px;
          color: #F2C94C;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-5px);
          }
          60% {
            transform: translateX(-50%) translateY(-3px);
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background-color: white;
          border-radius: 16px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #E8F3E8;
        }

        .modal-title {
          margin: 0;
          color: #1B4332;
          font-size: 22px;
          font-weight: bold;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #4F6F52;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background-color: rgba(79, 79, 79, 0.1);
          transform: rotate(90deg);
        }

        .modal-content {
          padding: 20px;
        }

        /* Help Center Styles */
        .help-center {
          color: #333;
        }

        .help-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #E8F3E8;
        }

        .help-title {
          font-size: 28px;
          color: #1B4332;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .title-icon {
          color: #2E8B57;
        }

        .help-subtitle {
          color: #4F6F52;
          font-size: 16px;
        }

        .search-container {
          max-width: 500px;
          margin: 20px auto 0;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #4F6F52;
        }

        .search-input {
          width: 100%;
          padding: 12px 15px 12px 45px;
          border: 2px solid #E8F3E8;
          border-radius: 25px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #2E8B57;
          box-shadow: 0 0 10px rgba(46, 139, 87, 0.1);
        }

        .quick-links {
          margin-bottom: 30px;
        }

        .quick-links h3 {
          color: #1B4332;
          margin-bottom: 15px;
        }

        .link-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          background: #F8FBF8;
          border-radius: 8px;
          text-decoration: none;
          color: #2E8B57;
          transition: all 0.3s ease;
        }

        .quick-link:hover {
          background: #E8F3E8;
          transform: translateY(-2px);
        }

        .quick-link svg {
          font-size: 20px;
        }

        .faq-section h3 {
          color: #1B4332;
          margin-bottom: 20px;
        }

        .category-section {
          margin-bottom: 20px;
          border: 1px solid #E8F3E8;
          border-radius: 8px;
          overflow: hidden;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: #F8FBF8;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .category-header:hover {
          background: #E8F3E8;
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .category-icon {
          font-size: 24px;
        }

        .category-info h4 {
          margin: 0;
          color: #1B4332;
        }

        .category-info p {
          margin: 0;
          color: #4F6F52;
          font-size: 14px;
        }

        .faq-list {
          padding: 0 15px;
        }

        .faq-item {
          border-bottom: 1px solid #E8F3E8;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .faq-question:hover {
          background: #F8FBF8;
        }

        .faq-question h5 {
          margin: 0;
          color: #1B4332;
          font-size: 15px;
        }

        .faq-answer {
          padding: 0 15px 15px;
          color: #4F6F52;
          line-height: 1.6;
        }

        .contact-support {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #E8F3E8, #D4EED4);
          border-radius: 12px;
        }

        .contact-support h3 {
          color: #1B4332;
          margin-bottom: 10px;
        }

        .support-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .support-option {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: white;
          border-radius: 8px;
        }

        .option-icon {
          font-size: 24px;
          color: #2E8B57;
        }

        .support-option h4 {
          margin: 0;
          color: #1B4332;
        }

        .support-option p {
          margin: 0;
          color: #4F6F52;
        }

        .response-time {
          font-size: 12px;
          color: #6FCF97;
        }

        /* Contact Us Styles */
        .contact-us {
          color: #333;
        }

        .contact-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #E8F3E8;
        }

        .contact-title {
          font-size: 28px;
          color: #1B4332;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .contact-subtitle {
          color: #4F6F52;
          font-size: 16px;
        }

        .contact-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .contact-info-section h3 {
          color: #1B4332;
          margin-bottom: 20px;
        }

        .contact-grid {
          display: grid;
          gap: 15px;
          margin-bottom: 30px;
        }

        .contact-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: #F8FBF8;
          border-radius: 8px;
          border-top: 3px solid;
          transition: transform 0.3s ease;
        }

        .contact-card:hover {
          transform: translateY(-2px);
        }

        .contact-icon {
          font-size: 24px;
        }

        .contact-details h4 {
          margin: 0;
          color: #1B4332;
        }

        .contact-details p {
          margin: 0;
          color: #4F6F52;
        }

        .social-section h3 {
          color: #1B4332;
          margin-bottom: 10px;
        }

        .social-section p {
          color: #4F6F52;
          margin-bottom: 15px;
        }

        .social-links {
          display: flex;
          gap: 15px;
        }

        .social-links a {
          width: 40px;
          height: 40px;
          background: #2E8B57;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .social-links a:hover {
          background: #1B4332;
          transform: translateY(-2px);
        }

        .contact-form-section h3 {
          color: #1B4332;
          margin-bottom: 20px;
        }

        .contact-form {
          background: #F8FBF8;
          padding: 25px;
          border-radius: 12px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #1B4332;
          font-weight: 500;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #E8F3E8;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2E8B57;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .submit-btn {
          background: linear-gradient(135deg, #2E8B57, #1B4332);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(46, 139, 87, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .success-message {
          margin-top: 15px;
          padding: 10px;
          background: rgba(46, 139, 87, 0.1);
          color: #2E8B57;
          border-radius: 6px;
          text-align: center;
        }

        .error-message {
          margin-top: 15px;
          padding: 10px;
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          border-radius: 6px;
          text-align: center;
        }

        .map-section {
          text-align: center;
        }

        .map-section h3 {
          color: #1B4332;
          margin-bottom: 20px;
        }

        .map-placeholder {
          height: 300px;
          background: #F8FBF8;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #4F6F52;
        }

        .map-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .map-placeholder p {
          font-size: 18px;
          font-weight: 500;
          margin: 0;
        }

        .map-placeholder span {
          font-size: 14px;
          margin-top: 5px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .footer-section {
            padding: 15px;
          }

          .contact-content {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .footer {
            padding: 20px 0 10px;
          }
          
          .footer-container {
            padding: 0 10px;
          }
        }
      `}</style>
      
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h3>Bloom Community</h3>
            <p>Connecting nature enthusiasts worldwide through shared experiences and knowledge.</p>
            <div className="social-links">
              <span className="social-link"><span>📘</span></span>
              <span className="social-link"><span>🐦</span></span>
              <span className="social-link"><span>📷</span></span>
              <span className="social-link"><span>📺</span></span>
            </div>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#about" 
                  className={activeSection === 'about' ? 'active' : ''}
                  onClick={() => handleNavigation('about')}
                >
                  About Us
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#guidelines" 
                  className={activeSection === 'guidelines' ? 'active' : ''}
                  onClick={() => handleNavigation('guidelines')}
                >
                  Community Guidelines
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#events" 
                  className={activeSection === 'events' ? 'active' : ''}
                  onClick={() => handleNavigation('events')}
                >
                  Events
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#resources" 
                  className={activeSection === 'resources' ? 'active' : ''}
                  onClick={() => handleNavigation('resources')}
                >
                  Resources
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Support</h3>
            <ul>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#help" 
                  className={activeSection === 'help' ? 'active' : ''}
                  onClick={() => handleNavigation('help')}
                >
                  Help Center
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#contact" 
                  className={activeSection === 'contact' ? 'active' : ''}
                  onClick={() => handleNavigation('contact')}
                >
                  Contact Us
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#privacy" 
                  className={activeSection === 'privacy' ? 'active' : ''}
                  onClick={() => handleNavigation('privacy')}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <span className="leaf-icon"><FaLeaf /></span>
                <a 
                  href="#terms" 
                  className={activeSection === 'terms' ? 'active' : ''}
                  onClick={() => handleNavigation('terms')}
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Newsletter</h3>
            <p>Subscribe to receive updates on events and community news.</p>
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <div className="newsletter-input-wrapper">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isSubscribing}
                />
                <button type="submit" disabled={isSubscribing}>
                  <span>{isSubscribing ? 'Subscribing...' : 'Subscribe'}</span>
                </button>
              </div>
              {subscriptionStatus && (
                <div className={`newsletter-status ${subscriptionStatus.includes('Successfully') ? 'success' : 'error'}`}>
                  {subscriptionStatus}
                </div>
              )}
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="leaf-icon"><FaLeaf /></span>
          <p>&copy; 2025 Bloom Community. All rights reserved.</p>
        </div>
        
        {/* About Modal */}
        {showAbout && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">About Bloom Community</h2>
                <button className="close-btn" onClick={handleCloseAbout}>✕</button>
              </div>
              <div className="modal-content">
                <About />
              </div>
            </div>
          </div>
        )}
        
        {/* Help Center Modal */}
        {showHelp && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Help Center</h2>
                <button className="close-btn" onClick={handleCloseHelp}>✕</button>
              </div>
              <div className="modal-content">
                <HelpCenter />
              </div>
            </div>
          </div>
        )}
        
        {/* Contact Us Modal */}
        {showContact && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Contact Us</h2>
                <button className="close-btn" onClick={handleCloseContact}>✕</button>
              </div>
              <div className="modal-content">
                <ContactUs />
              </div>
            </div>
          </div>
        )}
        
        {/* Privacy Policy Modal */}
        {showPrivacy && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Privacy Policy</h2>
                <button className="close-btn" onClick={handleClosePrivacy}>✕</button>
              </div>
              <div className="modal-content">
                <div className="policy-content">
                  <h2>Privacy Policy for Bloom Community</h2>
                  <p>Last updated: December 15, 2025</p>
                  
                  <h3>1. Information We Collect</h3>
                  <p>When you use Bloom Community, we collect information to provide better services to all our users. The types of information we collect include:</p>
                  <ul>
                    <li>Account information: name, email address, and profile details you provide</li>
                    <li>Content you create: posts, comments, photos, and other content you share</li>
                    <li>Usage information: how you interact with our platform</li>
                    <li>Device information: IP address, browser type, and operating system</li>
                  </ul>
                  
                  <h3>2. How We Use Your Information</h3>
                  <p>We use the information we collect to:</p>
                  <ul>
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Communicate with you about products, services, and events</li>
                    <li>Monitor and analyze trends and usage</li>
                    <li>Detect, investigate, and prevent security incidents</li>
                  </ul>
                  
                  <h3>3. Information Sharing</h3>
                  <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:</p>
                  <ul>
                    <li>With service providers who assist in operating our platform</li>
                    <li>When required by law or to protect our rights</li>
                    <li>In connection with a merger, acquisition, or sale of assets</li>
                  </ul>
                  
                  <h3>4. Data Security</h3>
                  <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                  
                  <h3>5. Your Rights</h3>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access and update your personal information</li>
                    <li>Delete your account and associated data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Request a copy of your data</li>
                  </ul>
                  
                  <h3>6. Changes to This Policy</h3>
                  <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
                  
                  <p className="last-updated">This Privacy Policy was last updated on December 15, 2025.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Terms of Service Modal */}
        {showTerms && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Terms of Service</h2>
                <button className="close-btn" onClick={handleCloseTerms}>✕</button>
              </div>
              <div className="modal-content">
                <div className="policy-content">
                  <h2>Terms of Service for Bloom Community</h2>
                  <p>Last updated: December 15, 2025</p>
                  
                  <h3>1. Acceptance of Terms</h3>
                  <p>By accessing and using Bloom Community, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  
                  <h3>2. Use License</h3>
                  <p>Permission is granted to temporarily download one copy of the materials on Bloom Community for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                  <ul>
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose or for any public display</li>
                    <li>Attempt to reverse engineer any software contained on Bloom Community</li>
                    <li>Remove any copyright or other proprietary notations from the materials</li>
                  </ul>
                  
                  <h3>3. User Accounts</h3>
                  <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and all activities that occur under your account.</p>
                  
                  <h3>4. User Content</h3>
                  <p>As a user of Bloom Community, you may post content. By posting content, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, and display the content in connection with the service.</p>
                  
                  <h3>5. Prohibited Uses</h3>
                  <p>You may not use our service for any illegal or unauthorized purpose. You agree not to:</p>
                  <ul>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Post inappropriate, offensive, or illegal content</li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon the intellectual property rights of others</li>
                    <li>Upload viruses or malicious code</li>
                  </ul>
                  
                  <h3>6. Intellectual Property</h3>
                  <p>The service and its original content, features, and functionality are and will remain the exclusive property of Bloom Community and its licensors.</p>
                  
                  <h3>7. Termination</h3>
                  <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation.</p>
                  
                  <h3>8. Changes to Terms of Service</h3>
                  <p>We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.</p>
                  
                  <p className="last-updated">These Terms of Service were last updated on 2025.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </footer>
    </>
  );
};

export default Footer;
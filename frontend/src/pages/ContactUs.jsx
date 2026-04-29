// ContactUs.jsx
import React, { useState } from 'react';
import { FaLeaf, FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaPaperPlane, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <FaEnvelope />,
      title: 'Email Us',
      details: ['info@bloomcommunity.org', 'support@bloomcommunity.org'],
      color: '#F2C94C'
    },
    {
      icon: <FaPhone />,
      title: 'Call Us',
      details: ['1-800-BLOOM-42 (Main)', '1-800-BLOOM-HELP (Support)'],
      color: '#2E8B57'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Visit Us',
      details: ['123 Garden Street', 'Nature Valley, NV 12345'],
      color: '#6FCF97'
    },
    {
      icon: <FaClock />,
      title: 'Office Hours',
      details: ['Monday - Friday: 9AM - 6PM EST', 'Saturday: 10AM - 4PM EST'],
      color: '#4F6F52'
    }
  ];

  return (
    <div className="contact-us">
      <div className="contact-header">
        <h2 className="contact-title">
          <FaLeaf className="title-icon" />
          Contact Us
        </h2>
        <p className="contact-subtitle">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
      </div>

      <div className="contact-content">
        <div className="contact-info-section">
          <h3>Get in Touch</h3>
          <div className="contact-grid">
            {contactInfo.map((info, index) => (
              <div key={index} className="contact-card" style={{ borderTopColor: info.color }}>
                <div className="contact-icon" style={{ color: info.color }}>
                  {info.icon}
                </div>
                <div className="contact-details">
                  <h4>{info.title}</h4>
                  {info.details.map((detail, idx) => (
                    <p key={idx}>{detail}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="social-section">
            <h3>Follow Us</h3>
            <p>Stay connected with our community on social media</p>
            <div className="social-links">
              <a href="#" className="social-link">
                <FaFacebook />
              </a>
              <a href="#" className="social-link">
                <FaTwitter />
              </a>
              <a href="#" className="social-link">
                <FaInstagram />
              </a>
              <a href="#" className="social-link">
                <FaLinkedin />
              </a>
            </div>
          </div>
        </div>

        <div className="contact-form-section">
          <h3>Send Us a Message</h3>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="partnership">Partnership</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Your Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="6"
                value={formData.message}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <FaPaperPlane />
                  Send Message
                </>
              )}
            </button>

            {submitStatus === 'success' && (
              <div className="success-message">
                Thank you for your message! We'll get back to you within 24 hours.
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="error-message">
                Something went wrong. Please try again or contact us directly.
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="map-section">
        <h3>Find Us</h3>
        <div className="map-placeholder">
          <FaMapMarkerAlt className="map-icon" />
          <p>Interactive Map</p>
          <span>123 Garden Street, Nature Valley, NV 12345</span>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
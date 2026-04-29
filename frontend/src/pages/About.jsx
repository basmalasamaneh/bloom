// About.jsx
import React, { useState } from 'react';
import { FaLeaf, FaUsers, FaHeart, FaLightbulb, FaGlobe, FaAward, FaCalendarAlt, FaEnvelope, FaCheckCircle, FaArrowRight, FaQuoteLeft, FaStar, FaHandshake, FaSeedling, FaRocket } from 'react-icons/fa';

const About = () => {
  const [activeTab, setActiveTab] = useState('mission');
  const [hoveredMember, setHoveredMember] = useState(null);
  const [hoveredValue, setHoveredValue] = useState(null);

  const teamMembers = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      avatar: '🌸',
      bio: 'Passionate about connecting nature lovers worldwide',
      expertise: ['Community Building', 'Strategic Vision', 'Environmental Advocacy']
    },
    {
      name: 'Michael Chen',
      role: 'Community Manager',
      avatar: '🌿',
      bio: 'Dedicated to fostering inclusive community spaces',
      expertise: ['Member Engagement', 'Event Planning', 'Community Growth']
    },
    {
      name: 'Emma Williams',
      role: 'Events Coordinator',
      avatar: '🌺',
      bio: 'Creating memorable experiences for our members',
      expertise: ['Event Management', 'Logistics', 'Experience Design']
    },
    {
      name: 'David Martinez',
      role: 'Technical Lead',
      avatar: '🌻',
      bio: 'Building innovative tools for community engagement',
      expertise: ['Platform Development', 'User Experience', 'Technical Innovation']
    }
  ];

  const values = [
    {
      icon: <FaHeart />,
      title: 'Community First',
      description: 'We believe in the power of community to create positive change and foster meaningful connections.',
      color: '#E74C3C'
    },
    {
      icon: <FaLightbulb />,
      title: 'Innovation',
      description: 'Continuously exploring new ways to enhance the community experience and engagement.',
      color: '#F39C12'
    },
    {
      icon: <FaGlobe />,
      title: 'Sustainability',
      description: 'Committed to environmental stewardship and promoting sustainable practices.',
      color: '#2E8B57'
    },
    {
      icon: <FaAward />,
      title: 'Excellence',
      description: 'Striving for excellence in everything we do, from member support to event organization.',
      color: '#9B59B6'
    }
  ];

  const timeline = [
    {
      date: '2020',
      title: 'Bloom Community Founded',
      description: 'Started with a small group of nature enthusiasts sharing their passion online.',
      icon: <FaSeedling />,
      color: '#27AE60'
    },
    {
      date: '2021',
      title: 'First Community Event',
      description: 'Hosted our first virtual gathering with over 500 participants from around the world.',
      icon: <FaUsers />,
      color: '#3498DB'
    },
    {
      date: '2022',
      title: 'Mobile App Launch',
      description: 'Launched our mobile app to make community engagement more accessible.',
      icon: <FaRocket />,
      color: '#E74C3C'
    },
    {
      date: '2023',
      title: 'Global Expansion',
      description: 'Reached 50,000 members across 100 countries with local chapters.',
      icon: <FaGlobe />,
      color: '#9B59B6'
    },
    {
      date: '2024',
      title: 'Partnership Program',
      description: 'Established partnerships with environmental organizations worldwide.',
      icon: <FaHandshake />,
      color: '#F39C12'
    },
    {
      date: '2025',
      title: 'Innovation Hub',
      description: 'Launched our innovation hub for community-driven environmental projects.',
      icon: <FaLightbulb />,
      color: '#1ABC9C'
    }
  ];

  const stats = [
    { number: '50K+', label: 'Members', icon: <FaUsers /> },
    { number: '100+', label: 'Countries', icon: <FaGlobe /> },
    { number: '500+', label: 'Events', icon: <FaCalendarAlt /> },
    { number: '50+', label: 'Partners', icon: <FaHandshake /> }
  ];

  const testimonials = [
    {
      name: 'Alex Thompson',
      role: 'Community Member',
      content: 'Bloom Community has transformed how I connect with nature enthusiasts. The events are amazing!',
      rating: 5
    },
    {
      name: 'Maria Garcia',
      role: 'Event Organizer',
      content: 'The support and resources provided by Bloom Community have helped me organize successful events.',
      rating: 5
    },
    {
      name: 'James Wilson',
      role: 'Environmental Advocate',
      content: 'Being part of this community has amplified my impact on environmental causes.',
      rating: 5
    }
  ];

  return (
    <div className="about">
      <style>{`
        .about {
          color: #333;
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .about-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 40px 0;
          background: linear-gradient(135deg, #E8F3E8, #D4EED4);
          border-radius: 16px;
          position: relative;
          overflow: hidden;
        }

        .about-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(46, 139, 87, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .about-header::after {
          content: '';
          position: absolute;
          bottom: -50%;
          left: -10%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(242, 201, 76, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .about-title {
          font-size: 36px;
          font-weight: bold;
          color: #1B4332;
          margin: 0 0 15px 0;
          position: relative;
          display: inline-block;
        }

        .about-title::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          border-radius: 2px;
        }

        .about-subtitle {
          font-size: 18px;
          color: #4F6F52;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
          position: relative;
          z-index: 1;
        }

        .about-tabs {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 5px;
        }

        .about-tab {
          flex: 1;
          padding: 18px 25px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 500;
          color: #4F6F52;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          border-radius: 12px;
        }

        .about-tab::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .about-tab.active {
          color: #1B4332;
          background: linear-gradient(135deg, #E8F3E8, #D4EED4);
        }

        .about-tab.active::after {
          width: 50px;
        }

        .about-tab:hover:not(.active) {
          background-color: #F8FBF8;
        }

        .about-content {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 40px;
        }

        .mission-section {
          animation: slideInUp 0.6s ease;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mission-content {
          display: flex;
          gap: 30px;
          align-items: center;
          margin-bottom: 30px;
          padding: 30px;
          background: linear-gradient(135deg, #F8FBF8, #F0F7F0);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .mission-content:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
        }

        .mission-icon {
          font-size: 48px;
          color: #2E8B57;
          background: white;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.2);
          flex-shrink: 0;
        }

        .mission-text h3 {
          font-size: 24px;
          color: #1B4332;
          margin: 0 0 15px 0;
        }

        .mission-text p {
          font-size: 16px;
          line-height: 1.6;
          color: #4F6F52;
          margin: 0;
        }

        .team-section {
          animation: slideInUp 0.8s ease;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }

        .team-member {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .team-member::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .team-member:hover::before {
          transform: scaleX(1);
        }

        .team-member:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 35px rgba(46, 139, 87, 0.2);
        }

        .member-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E8F3E8, #D4EED4);
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          transition: all 0.3s ease;
        }

        .team-member:hover .member-avatar {
          transform: scale(1.1) rotate(5deg);
        }

        .member-name {
          font-size: 20px;
          font-weight: 600;
          color: #1B4332;
          margin: 0 0 5px 0;
        }

        .member-role {
          font-size: 14px;
          color: #2E8B57;
          margin: 0 0 15px 0;
          font-weight: 500;
        }

        .member-bio {
          font-size: 14px;
          color: #4F6F52;
          line-height: 1.5;
          margin-bottom: 15px;
        }

        .member-expertise {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .expertise-tag {
          background: #E8F3E8;
          color: #2E8B57;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .values-section {
          animation: slideInUp 1s ease;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 25px;
          margin-bottom: 30px;
        }

        .value-item {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .value-item::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, var(--value-color) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .value-item:hover::before {
          opacity: 0.05;
        }

        .value-item:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }

        .value-icon {
          font-size: 36px;
          margin-bottom: 20px;
          color: var(--value-color);
          transition: all 0.3s ease;
        }

        .value-item:hover .value-icon {
          transform: scale(1.2) rotate(5deg);
        }

        .value-title {
          font-size: 18px;
          font-weight: 600;
          color: #1B4332;
          margin: 0 0 15px 0;
        }

        .value-description {
          font-size: 14px;
          color: #4F6F52;
          line-height: 1.6;
        }

        .history-section {
          animation: slideInUp 1.2s ease;
        }

        .timeline {
          position: relative;
          padding: 20px 0;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #2E8B57, #6FCF97);
          transform: translateX(-50%);
        }

        .timeline-item {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
          position: relative;
        }

        .timeline-item:nth-child(odd) .timeline-content {
          margin-right: 50%;
          padding-right: 40px;
          text-align: right;
        }

        .timeline-item:nth-child(even) .timeline-content {
          margin-left: 50%;
          padding-left: 40px;
        }

        .timeline-content {
          background: white;
          border-radius: 16px;
          padding: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          max-width: 45%;
        }

        .timeline-content:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.2);
        }

        .timeline-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: var(--timeline-color);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          z-index: 1;
        }

        .timeline-date {
          font-size: 14px;
          font-weight: 600;
          color: var(--timeline-color);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .timeline-item:nth-child(odd) .timeline-date {
          justify-content: flex-end;
        }

        .timeline-title {
          font-size: 18px;
          font-weight: 600;
          color: #1B4332;
          margin: 0 0 10px 0;
        }

        .timeline-description {
          font-size: 14px;
          color: #4F6F52;
          line-height: 1.5;
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 40px 0;
        }

        .stat-card {
          background: linear-gradient(135deg, #2E8B57, #1B4332);
          color: white;
          padding: 30px;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(46, 139, 87, 0.3);
        }

        .stat-icon {
          font-size: 32px;
          margin-bottom: 15px;
          opacity: 0.9;
        }

        .stat-number {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .testimonials-section {
          margin: 40px 0;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }

        .testimonial-card {
          background: linear-gradient(135deg, #F8FBF8, #F0F7F0);
          padding: 30px;
          border-radius: 16px;
          position: relative;
          transition: all 0.3s ease;
        }

        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
        }

        .quote-icon {
          position: absolute;
          top: 20px;
          left: 20px;
          font-size: 24px;
          color: #2E8B57;
          opacity: 0.3;
        }

        .testimonial-content {
          font-style: italic;
          color: #4F6F52;
          line-height: 1.6;
          margin-bottom: 20px;
          padding-left: 20px;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .author-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #2E8B57;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .author-info h5 {
          margin: 0;
          color: #1B4332;
          font-size: 16px;
        }

        .author-info p {
          margin: 0;
          color: #4F6F52;
          font-size: 14px;
        }

        .rating {
          display: flex;
          gap: 3px;
          margin-top: 5px;
        }

        .rating .star {
          color: #F2C94C;
          font-size: 14px;
        }

        .contact-section {
          background: linear-gradient(135deg, #2E8B57, #1B4332);
          border-radius: 16px;
          padding: 50px;
          text-align: center;
          color: white;
          margin-top: 40px;
          position: relative;
          overflow: hidden;
        }

        .contact-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
          border-radius: 50%;
        }

        .contact-title {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 15px;
          position: relative;
          z-index: 1;
        }

        .contact-description {
          font-size: 16px;
          margin-bottom: 30px;
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 1;
        }

        .contact-buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .contact-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 15px 30px;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .contact-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .about-title {
            font-size: 28px;
          }

          .about-tabs {
            flex-direction: column;
          }

          .about-tab {
            margin-bottom: 5px;
          }

          .mission-content {
            flex-direction: column;
            text-align: center;
          }

          .timeline::before {
            left: 20px;
          }

          .timeline-item:nth-child(odd) .timeline-content,
          .timeline-item:nth-child(even) .timeline-content {
            margin-left: 60px;
            margin-right: 0;
            padding-left: 20px;
            padding-right: 20px;
            text-align: left;
            max-width: calc(100% - 60px);
          }

          .timeline-icon {
            left: 20px;
          }

          .contact-buttons {
            flex-direction: column;
            align-items: center;
          }

          .contact-btn {
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }
        }
      `}</style>

      <div className="about-header">
        <h2 className="about-title">About Bloom Community</h2>
        <p className="about-subtitle">
          We're a global family of nature enthusiasts dedicated to fostering connections, 
          sharing knowledge, and making a positive impact on our planet.
        </p>
      </div>

      <div className="about-tabs">
        <button 
          className={`about-tab ${activeTab === 'mission' ? 'active' : ''}`}
          onClick={() => setActiveTab('mission')}
        >
          Our Mission
        </button>
        <button 
          className={`about-tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Our Team
        </button>
        <button 
          className={`about-tab ${activeTab === 'values' ? 'active' : ''}`}
          onClick={() => setActiveTab('values')}
        >
          Our Values
        </button>
        <button 
          className={`about-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Our Journey
        </button>
      </div>

      <div className="about-content">
        {activeTab === 'mission' && (
          <div className="mission-section">
            <div className="mission-content">
              <div className="mission-icon">
                <FaLeaf />
              </div>
              <div className="mission-text">
                <h3>Our Mission</h3>
                <p>
                  To create a vibrant global community where nature enthusiasts can connect, 
                  share knowledge, and collaborate on environmental initiatives. We believe that 
                  by bringing people together, we can create meaningful change and foster a 
                  deeper appreciation for our natural world.
                </p>
              </div>
            </div>

            <div className="mission-content">
              <div className="mission-icon">
                <FaUsers />
              </div>
              <div className="mission-text">
                <h3>Our Vision</h3>
                <p>
                  A world where every person has the opportunity to connect with nature and 
                  contribute to environmental stewardship. We envision a future where communities 
                  work together to protect and preserve our planet for generations to come.
                </p>
              </div>
            </div>

            <div className="mission-content">
              <div className="mission-icon">
                <FaCheckCircle />
              </div>
              <div className="mission-text">
                <h3>What We Do</h3>
                <p>
                  • Organize community events and workshops<br/>
                  • Provide educational resources and guides<br/>
                  • Connect members with local environmental projects<br/>
                  • Foster partnerships with conservation organizations<br/>
                  • Create platforms for knowledge sharing and collaboration
                </p>
              </div>
            </div>

            <div className="stats-section">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="team-section">
            <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#1B4332' }}>
              Meet Our Team
            </h3>
            <div className="team-grid">
              {teamMembers.map((member, index) => (
                <div 
                  key={index} 
                  className="team-member"
                  onMouseEnter={() => setHoveredMember(index)}
                  onMouseLeave={() => setHoveredMember(null)}
                >
                  <div className="member-avatar">
                    {member.avatar}
                  </div>
                  <h4 className="member-name">{member.name}</h4>
                  <p className="member-role">{member.role}</p>
                  <p className="member-bio">{member.bio}</p>
                  <div className="member-expertise">
                    {member.expertise.map((skill, idx) => (
                      <span key={idx} className="expertise-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <h4 style={{ color: '#1B4332', marginBottom: '15px' }}>Join Our Team</h4>
              <p style={{ color: '#4F6F52', marginBottom: '20px' }}>
                We're always looking for passionate individuals to join our mission
              </p>
              <button style={{
                background: 'linear-gradient(135deg, #2E8B57, #1B4332)',
                color: 'white',
                border: 'none',
                padding: '15px 35px',
                borderRadius: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                View Open Positions
                <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'values' && (
          <div className="values-section">
            <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#1B4332' }}>
              Our Core Values
            </h3>
            <div className="values-grid">
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="value-item"
                  style={{ '--value-color': value.color }}
                  onMouseEnter={() => setHoveredValue(index)}
                  onMouseLeave={() => setHoveredValue(null)}
                >
                  <div className="value-icon">{value.icon}</div>
                  <h4 className="value-title">{value.title}</h4>
                  <p className="value-description">{value.description}</p>
                </div>
              ))}
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #E8F3E8, #D4EED4)', 
              padding: '30px', 
              borderRadius: '16px', 
              marginTop: '40px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#1B4332', marginBottom: '15px' }}>Our Commitment</h4>
              <p style={{ color: '#4F6F52', lineHeight: '1.6' }}>
                We are committed to creating an inclusive, diverse, and welcoming community 
                where everyone feels valued and respected. We believe that diversity of 
                thought, experience, and background strengthens our community and drives 
                innovation in our mission to protect and celebrate nature.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#1B4332' }}>
              Our Journey
            </h3>
            <div className="timeline">
              {timeline.map((item, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-content">
                    <div className="timeline-date" style={{ '--timeline-color': item.color }}>
                      {item.icon}
                      {item.date}
                    </div>
                    <h4 className="timeline-title">{item.title}</h4>
                    <p className="timeline-description">{item.description}</p>
                  </div>
                  <div className="timeline-icon" style={{ '--timeline-color': item.color }}>
                    {item.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="testimonials-section">
        <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#1B4332' }}>
          What Our Community Says
        </h3>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <FaQuoteLeft className="quote-icon" />
              <p className="testimonial-content">{testimonial.content}</p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="author-info">
                  <h5>{testimonial.name}</h5>
                  <p>{testimonial.role}</p>
                  <div className="rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} className="star" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="contact-section">
        <h3 className="contact-title">Get Involved</h3>
        <p className="contact-description">
          Ready to join our community? There are many ways to get involved and make a difference.
        </p>
        <div className="contact-buttons">
          <button className="contact-btn">
            <FaUsers />
            Join Community
          </button>
          <button className="contact-btn">
            <FaCalendarAlt />
            Attend Event
          </button>
          <button className="contact-btn">
            <FaEnvelope />
            Subscribe Newsletter
          </button>
        </div>
      </div>
    </div>
  );
};

export default About;
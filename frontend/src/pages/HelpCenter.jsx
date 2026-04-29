// HelpCenter.jsx
import React, { useState } from 'react';
import { FaLeaf, FaSearch, FaQuestionCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🌱',
      description: 'New to Bloom Community? Start here!',
      faqs: [
        {
          question: 'How do I create an account?',
          answer: 'Creating an account is easy! Click on the "Sign Up" button in the top right corner of our homepage. Fill in your details, verify your email, and you\'re ready to start exploring our community.'
        },
        {
          question: 'How do I join a community group?',
          answer: 'Navigate to the "Communities" section, browse through available groups, and click "Join" on any group that interests you. Some groups may require approval from the group admin.'
        },
        {
          question: 'What are community guidelines?',
          answer: 'Our community guidelines ensure a safe and respectful environment for all members. You can find them in the footer of our website or in your account settings.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account Management',
      icon: '👤',
      description: 'Manage your profile and settings',
      faqs: [
        {
          question: 'How do I reset my password?',
          answer: 'Click on "Forgot Password" on the login page. Enter your email address, and we\'ll send you instructions to reset your password. Check your spam folder if you don\'t receive the email.'
        },
        {
          question: 'Can I change my username?',
          answer: 'Yes, you can change your username once every 30 days. Go to Settings > Profile > Edit Username. Note that your old username will become available for others to use.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'We\'re sorry to see you go! To delete your account, go to Settings > Privacy > Delete Account. Please note this action is permanent and cannot be undone.'
        }
      ]
    },
    {
      id: 'community',
      title: 'Community Features',
      icon: '🌍',
      description: 'Learn about our community tools',
      faqs: [
        {
          question: 'How do I post in a community?',
          answer: 'Navigate to your chosen community, click on "Create Post" and choose your post type (text, image, link, or poll). Fill in the details, add relevant tags, and click "Post".'
        },
        {
          question: 'What are reputation points?',
          answer: 'Reputation points are earned by contributing valuable content, helping others, and participating in community activities. Higher reputation unlocks special privileges and features.'
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'Click the three dots (...) on any post or comment and select "Report". Choose the reason for reporting, and our moderation team will review it promptly.'
        }
      ]
    },
    {
      id: 'events',
      title: 'Events & Activities',
      icon: '📅',
      description: 'Participate in community events',
      faqs: [
        {
          question: 'How do I register for an event?',
          answer: 'Browse events in the "Events" section, click on an event you\'re interested in, and click "Register". You\'ll receive a confirmation email with event details.'
        },
        {
          question: 'Can I host my own event?',
          answer: 'Members with reputation above 500 can host events. Click "Create Event" in the Events section, fill in the details, and submit for approval.'
        },
        {
          question: 'What are virtual events?',
          answer: 'Virtual events are online gatherings that you can attend from anywhere. They include webinars, workshops, and online meetups hosted through our integrated video platform.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: '💻',
      description: 'Troubleshooting and technical help',
      faqs: [
        {
          question: 'Why can\'t I upload images?',
          answer: 'Ensure your images are in JPG, PNG, or GIF format and under 10MB. Clear your browser cache and try again. If issues persist, contact our support team.'
        },
        {
          question: 'The site is running slowly, what can I do?',
          answer: 'Try clearing your browser cache, disabling browser extensions, or using a different browser. Check your internet connection speed as well.'
        },
        {
          question: 'Is there a mobile app?',
          answer: 'Yes! Our mobile app is available for both iOS and Android. Download it from the App Store or Google Play Store for the best mobile experience.'
        }
      ]
    }
  ];

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => 
    category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.faqs.length > 0
  );

  return (
    <div className="help-center">
      <div className="help-header">
        <h2 className="help-title">
          <FaLeaf className="title-icon" />
          Help Center
        </h2>
        <p className="help-subtitle">Find answers to your questions or get in touch with our support team</p>
        
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="help-content">
        <div className="quick-links">
          <h3>Quick Links</h3>
          <div className="link-grid">
            <a href="#" className="quick-link">
              <FaQuestionCircle />
              <span>Getting Started Guide</span>
            </a>
            <a href="#" className="quick-link">
              <FaEnvelope />
              <span>Contact Support</span>
            </a>
            <a href="#" className="quick-link">
              <FaPhone />
              <span>Call Us</span>
            </a>
            <a href="#" className="quick-link">
              <FaMapMarkerAlt />
              <span>Find a Local Chapter</span>
            </a>
          </div>
        </div>

        <div className="faq-section">
          <h3>Frequently Asked Questions</h3>
          {filteredCategories.map(category => (
            <div key={category.id} className="category-section">
              <div 
                className="category-header"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="category-info">
                  <span className="category-icon">{category.icon}</span>
                  <div>
                    <h4>{category.title}</h4>
                    <p>{category.description}</p>
                  </div>
                </div>
                {expandedCategory === category.id ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              
              {expandedCategory === category.id && (
                <div className="faq-list">
                  {category.faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                      <div 
                        className="faq-question"
                        onClick={() => toggleFaq(`${category.id}-${index}`)}
                      >
                        <h5>{faq.question}</h5>
                        {expandedFaq === `${category.id}-${index}` ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {expandedFaq === `${category.id}-${index}` && (
                        <div className="faq-answer">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="contact-support">
          <h3>Still Need Help?</h3>
          <p>Our support team is here to assist you. Reach out through any of the following channels:</p>
          <div className="support-options">
            <div className="support-option">
              <FaEnvelope className="option-icon" />
              <div>
                <h4>Email Support</h4>
                <p>support@bloomcommunity.org</p>
                <span className="response-time">Response within 24 hours</span>
              </div>
            </div>
            <div className="support-option">
              <FaPhone className="option-icon" />
              <div>
                <h4>Phone Support</h4>
                <p>1-800-BLOOM-42</p>
                <span className="response-time">Mon-Fri, 9AM-6PM EST</span>
              </div>
            </div>
            <div className="support-option">
              <FaQuestionCircle className="option-icon" />
              <div>
                <h4>Live Chat</h4>
                <p>Available on website</p>
                <span className="response-time">Instant response</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
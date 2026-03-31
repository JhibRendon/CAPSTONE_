import React, { useState, useEffect } from 'react';
import authService from '../../../services/authService';

const HelpSupportModule = () => {
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    category: '',
    description: '',
    priority: 'medium'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authService.getProfile();
        if (response.success) {
          // Session is valid; profile data isn't needed for this screen.
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setMessage({ type: 'error', text: 'Failed to load user information' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const categories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: 'New to I-Serve? Start here!'
    },
    {
      id: 'grievance-process',
      name: 'Grievance Process',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      description: 'Understand how filing works'
    },
    {
      id: 'account-management',
      name: 'Account Management',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      description: 'Profile and security settings'
    },
    {
      id: 'technical-issues',
      name: 'Technical Issues',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Troubleshooting and support'
    }
  ];

  const faqData = {
    'getting-started': [
      {
        question: 'What is I-Serve Chatbot?',
        answer: 'I-Serve Chatbot is BUksu\'s intelligent grievance management system that helps students, faculty, and staff file and track complaints, concerns, and suggestions through an easy-to-use chat interface.'
      },
      {
        question: 'How do I create an account?',
        answer: 'To create an account, click on the registration link provided by the university, fill in your personal information, verify your email, and set up your password. Make sure to use your official BUksu email address.'
      },
      {
        question: 'What can I file a grievance about?',
        answer: 'You can file grievances about academic issues, administrative concerns, facility problems, financial matters, harassment, discrimination, and any other university-related issues that affect your experience at BUksu.'
      }
    ],
    'grievance-process': [
      {
        question: 'How long does it take to resolve a grievance?',
        answer: 'Resolution time varies depending on the complexity and nature of the grievance. Simple issues may be resolved within 3-5 working days, while complex cases may take 2-4 weeks. You\'ll receive regular updates on your grievance status.'
      },
      {
        question: 'Can I file a grievance anonymously?',
        answer: 'Yes, I-Serve allows you to file grievances anonymously. However, providing your identity may help in faster resolution and follow-up communication. Anonymous grievances are treated with the same seriousness as identified ones.'
      },
      {
        question: 'What happens after I file a grievance?',
        answer: 'After filing, your grievance is automatically routed to the appropriate office based on the category and academic college you select. The assigned office will review your case, investigate if necessary, and take appropriate action.'
      },
      {
        question: 'Can I attach evidence to my grievance?',
        answer: 'Yes, you can attach supporting documents, photos, videos, and other evidence to strengthen your grievance. Accepted file formats include PDF, JPEG, MP4, AVI, MOV with a maximum file size of 10MB per file.'
      }
    ],
    'account-management': [
      {
        question: 'How do I reset my password?',
        answer: 'Go to Account Settings in your profile dropdown, click "Change Password", enter your current password and new password, then click "Update Password". You can also use the "Forgot Password" link on the login page.'
      },
      {
        question: 'How can I update my profile information?',
        answer: 'Navigate to the Profile tab from your dashboard. Here you can view and update your personal information, contact details, and other profile settings. Some fields may require admin approval.'
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes, you can delete your account from Account Settings. However, this action is permanent and will delete all your data, including active grievances. Make sure to download any important information before deleting your account.'
      },
      {
        question: 'Is my data secure?',
        answer: 'Absolutely! I-Serve uses industry-standard encryption and security measures to protect your personal information. All data is stored securely and only authorized personnel can access your grievances.'
      }
    ],
    'technical-issues': [
      {
        question: 'The chatbot is not responding. What should I do?',
        answer: 'Try refreshing your browser, clearing your cache, or checking your internet connection. If the issue persists, try using a different browser or contact technical support through the help desk.'
      },
      {
        question: 'I can\'t upload files. What\'s wrong?',
        answer: 'Check if your file size is under 10MB and in an accepted format (PDF, JPEG, MP4, AVI, MOV). Also ensure your internet connection is stable. Try compressing large files before uploading.'
      },
      {
        question: 'The system is running slow. How can I fix it?',
        answer: 'Clear your browser cache, close unnecessary tabs, and ensure you have a stable internet connection. Using the latest version of Chrome, Firefox, or Safari is recommended for best performance.'
      },
      {
        question: 'I forgot my login credentials. What do I do?',
        answer: 'Click on "Forgot Password" on the login page and follow the instructions to reset your password. For username issues, contact the IT help desk at support@buksu.edu.ph or visit the IT office.'
      }
    ]
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    
    if (!supportTicket.subject || !supportTicket.category || !supportTicket.description) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      // Here you would call the actual API to submit support ticket
      // const response = await supportService.createTicket(supportTicket);
      
      // For now, simulate successful ticket submission
      setMessage({ 
        type: 'success', 
        text: `Support ticket #${Math.floor(Math.random() * 10000)} created successfully! We'll respond within 24 hours.` 
      });
      
      setSupportTicket({
        subject: '',
        category: '',
        description: '',
        priority: 'medium'
      });
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to create support ticket. Please try again.' });
    }
  };

  const contactInfo = [
    {
      title: 'IT Help Desk',
      email: 'support@buksu.edu.ph',
      phone: '(088) 123-4567',
      hours: 'Monday-Friday, 8:00 AM - 5:00 PM',
      location: 'IT Building, Room 101'
    },
    {
      title: 'Student Affairs',
      email: 'student.affairs@buksu.edu.ph',
      phone: '(088) 234-5678',
      hours: 'Monday-Friday, 8:00 AM - 6:00 PM',
      location: 'Student Center, 2nd Floor'
    },
    {
      title: 'Academic Affairs',
      email: 'academic.affairs@buksu.edu.ph',
      phone: '(088) 345-6789',
      hours: 'Monday-Friday, 8:00 AM - 5:00 PM',
      location: 'Administration Building'
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-white font-heading-md">Help & Support</h2>
            <p className="text-white/80 font-body-sm">Get assistance and find answers to your questions</p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`mx-6 mt-4 p-4 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={message.type === 'success' 
                  ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                } 
              />
            </svg>
            <p className="font-medium text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">User Guide</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">Complete guide to using I-Serve effectively</p>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Read Guide →
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Video Tutorials</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">Watch step-by-step video guides</p>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Watch Videos →
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Live Support</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">Chat with our support team</p>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Start Chat →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Help Categories</h3>
                </div>
                <div className="p-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center gap-3 ${
                        activeCategory === category.id
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{category.name}</p>
                        <p className="text-xs opacity-75">{category.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {categories.find(c => c.id === activeCategory)?.name}
                  </p>
                </div>
                <div className="p-4">
                  {faqData[activeCategory].map((faq, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                        className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-between gap-4"
                      >
                        <span className="font-medium text-gray-900 flex-1">{faq.question}</span>
                        <svg 
                          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                            expandedFaq === index ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedFaq === index && (
                        <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-gray-700 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Ticket Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Create Support Ticket</h3>
                  <p className="text-sm text-gray-600 mt-1">Can't find what you're looking for? Submit a ticket</p>
                </div>
                <form onSubmit={handleTicketSubmit} className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <input
                        type="text"
                        value={supportTicket.subject}
                        onChange={(e) => setSupportTicket({...supportTicket, subject: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Brief description of your issue"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={supportTicket.category}
                        onChange={(e) => setSupportTicket({...supportTicket, category: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select a category</option>
                        <option value="technical">Technical Issue</option>
                        <option value="account">Account Problem</option>
                        <option value="grievance">Grievance Help</option>
                        <option value="general">General Inquiry</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <div className="flex gap-4">
                      {['low', 'medium', 'high'].map((priority) => (
                        <label key={priority} className="flex items-center gap-2">
                          <input
                            type="radio"
                            value={priority}
                            checked={supportTicket.priority === priority}
                            onChange={(e) => setSupportTicket({...supportTicket, priority: e.target.value})}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm capitalize">{priority}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={supportTicket.description}
                      onChange={(e) => setSupportTicket({...supportTicket, description: e.target.value})}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Please describe your issue in detail..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Submit Support Ticket
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Contact Information</h3>
                <p className="text-sm text-gray-600 mt-1">Get in touch with our support teams</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {contactInfo.map((contact, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{contact.title}</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{contact.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{contact.hours}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{contact.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportModule;

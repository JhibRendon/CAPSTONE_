import React, { useState, useEffect, useRef } from 'react';
import authService, { axiosInstance } from '../../../services/authService';
import cloudinaryService from '../../../services/cloudinaryService';
import { BACKEND_URL } from '../../../config/api';

const DashboardModule = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(null); // null, 'anonymous', or 'regular'
  const _fileInputRef = useRef(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [, setReferenceNumber] = useState('');
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionPhase, setSubmissionPhase] = useState('idle');
  const [submissionStatusText, setSubmissionStatusText] = useState('');
  const [submittedReferenceNumber, setSubmittedReferenceNumber] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your grievance assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      options: ["File a new grievance", "Get help with filing"],
      disabledOptions: []
    }
  ]);
  const [confirmationPending, setConfirmationPending] = useState(false);  // true when waiting for user to confirm summary
  const [awaitingDescription, setAwaitingDescription] = useState(false); // true after Dialogflow asks for description
  const [awaitingDate, setAwaitingDate] = useState(false); // true when Dialogflow is asking for incident date
  const [awaitingPersonInvolved, setAwaitingPersonInvolved] = useState(false); // true when collecting person involved
  const [awaitingOffice, setAwaitingOffice] = useState(false); // true when collecting office selection
  const [awaitingDepartment, setAwaitingDepartment] = useState(false); // true when collecting department selection
  const [incidentDate] = useState(''); // retained for existing submission payload shape
  const [showEditModal, setShowEditModal] = useState(false); // show modal for editing title/description
  const [conversationContext, setConversationContext] = useState({
    lastEnglishIntent: '',
    descriptionAttempts: 0
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inFilingFlow, setInFilingFlow] = useState(false); // track if user is in the filing flow
  const [detectedLanguage, setDetectedLanguage] = useState('en'); // 'en' for English, 'ceb' for Cebuano
  const [grievanceData, setGrievanceData] = useState({
    category: '',
    office: '',
    department: '',
    subject: '',
    description: '',
    incidentDate: '',
    involvedPerson: '',
    documents: [],
    attachments: []
  });
  const messagesEndRef = useRef(null);

  // Keywords that should be treated as grievance titles
  const grievanceTitleKeywords = [

// 🎓 Academic Issues (EXPANDED)
  "failed", "failed me", "failing grade", "low grade", "low grades",
  "very low grade", "grade too low", "grades are low",
  "unfairly graded", "unfair grading", "grading issue",
  "grade manipulation", "wrong grade", "incorrect grade",
  "grade not updated", "grade not encoded", "missing grade",
  "no grade", "delayed grade", "late grading",


  // Harassment / Abuse (general)
  "harassed", "harass", "harassment", "bullied", "bully", "bullying",
  "abused", "abuse", "mistreated", "mistreated me", "ill-treated",

  // Sexual Misconduct (important)
  "sexual harassment", "sexually harassed", "molested", "molestation",
  "groped", "inappropriately touched", "touched me", "assaulted",
  "sexual assault", "rape", "raped", "coerced", "sexual coercion",
  "forced", "forced me", "taken advantage of", "exploited", "sexual exploitation",

  // Threat / Coercion / Power Abuse
  "threatened", "threat", "intimidated", "intimidation", "coerced",
  "pressured", "pressured me", "blackmailed", "blackmail", "extorted", "extortion",

  // Discrimination / Unfair Treatment
  "treated unfairly", "unfair treatment", "discriminated", "discrimination",
  "biased", "bias", "favoritism", "prejudice", "unjust", "injustice",

  // Academic Issues
  "failed", "failed me", "unfairly graded", "grade manipulation",
  "wrong grade", "incorrect grade", "grading issue",

  // Disciplinary Actions
  "suspended", "expelled", "penalized unfairly", "wrongfully suspended",

  // Neglect / Dismissal
  "neglected", "neglect", "ignored", "dismissed", "not taken seriously",

  // Verbal / Emotional Harm
  "verbal abuse", "emotionally abused", "emotional abuse",
  "insulted", "humiliated", "demeaned", "shamed", "mocked",
  "yelled at", "shouted at", "verbally attacked",

  // 🔥 Physical Harm 

  "physical abuse", "hurt", "injured", "attacked", "attack",
  "hit", "punched", "slapped", "kicked", "beaten", "beat me",
  "assaulted physically", "physically assaulted", "struck",
  "pushed", "pushed me", "shoved", "shoved me",
  "grabbed", "grabbed me", "dragged", "dragged me",
  "choked", "strangled", "elbowed", "headbutted",
  "threw something at me", "hit with an object",
  "violence", "violent behavior", "physically harmed",
  "injured me", "caused injury",

  // Misconduct / Ethics
  "misconduct", "unprofessional", "inappropriate behavior",
  "corruption", "bribery", "cheating", "fraud",

  // Privacy / Digital Issues
  "privacy violation", "data breach", "leaked", "leak", "doxxed", "doxxing",
  "cyberbullying", "online harassment", "hacked",

  // Authority Abuse
  "abuse of power", "power trip", "authority abuse", "misuse of authority",

    // 🏫 Facilities / Campus Environment (EXPANDED)

  // General Facility Issues
  "facility issue", "facility problem", "poor facilities",
  "broken facility", "damaged facility", "not maintained",
  "lack of facilities", "insufficient facilities",

  // Classrooms
  "classroom issue", "dirty classroom", "hot classroom",
  "no ventilation", "poor ventilation", "crowded classroom",
  "broken chairs", "broken tables", "damaged chairs",
  "not enough chairs", "no seats available",
  "broken projector", "projector not working",
  "no electric fan", "fan not working",
  "aircon not working", "no air conditioning",
  "lights not working", "no lights",

  // Buildings / Infrastructure
  "building issue", "building problem", "unsafe building",
  "poor maintenance", "damaged walls", "ceiling leak",
  "leaking roof", "flooding", "slippery floor",
  "broken windows", "unsafe stairs",
  "no emergency exit", "fire hazard",

  // Computer Laboratory
  "computer lab issue", "computer laboratory issue",
  "computer not working", "pc not working",
  "slow computers", "lagging computers",
  "no internet in lab", "internet not working",
  "broken keyboard", "broken mouse",
  "outdated computers", "insufficient computers",
  "cannot use computer", "system not working",

  // Laboratories (Science / Tech Labs)
  "laboratory issue", "lab equipment broken",
  "insufficient equipment", "lack of equipment",
  "unsafe laboratory", "hazardous lab",
  "no lab materials", "damaged equipment",
  "lab not accessible",

  // Library
  "library issue", "library problem",
  "no available books", "lack of books",
  "outdated books", "no space in library",
  "crowded library", "no seating in library",
  "library too noisy", "not conducive for studying",
  "library wifi not working", "library closed",

  // Comfort Rooms (CR)
  "comfort room issue", "cr issue", "restroom issue",
  "dirty cr", "dirty restroom", "unsanitary",
  "bad smell", "foul smell",
  "no water", "no running water",
  "no tissue", "no soap",
  "broken toilet", "clogged toilet",
  "not flushing", "flooded restroom",

  // Cafeteria / Food Services
  "cafeteria issue", "canteen issue",
  "expensive food", "overpriced food",
  "bad food quality", "spoiled food",
  "unhygienic food", "dirty cafeteria",
  "long lines", "slow service",
  "not enough food", "limited food options",

  // Internet / WiFi
  "wifi issue", "no wifi", "slow wifi",
  "internet issue", "no internet connection",
  "unstable connection", "connection is slow",

  // Utilities
  "no electricity", "power outage",
  "water interruption", "no water supply",

  // Safety / Security
  "security issue", "not safe", "unsafe environment",
  "no security guard", "lack of security",
  "theft", "stolen", "robbery",
  "no cctv", "cctv not working",

  // Accessibility
  "not accessible", "no wheelchair access",
  "no ramp", "poor accessibility",
  "elevator not working", "no elevator"
];

  const vagueDetailPhrases = [
  // Very generic
  "problem", "issue", "complaint", "something happened",
  "it happened", "someone did this", "bad experience",
  "not good", "unfair", "help me", "i need help",

  // Incomplete descriptions
  "it is about", "that is all", "nothing else",
  "you know", "just that", "etc", "and so on",

  // Weak context
  "they did something", "someone hurt me",
  "it was bad", "it was wrong", "i dont know how to explain",

  // Minimal responses
  "yes", "no", "maybe", "idk", "not sure",
  "just that", "that's it", "end",

  // Emotional but unclear
  "i feel bad", "i feel uncomfortable", "i feel weird",
  "it made me sad", "it made me upset",

  // Time vague
  "recently", "before", "earlier", "a while ago"
];

  const officeOptions = [
    "College of Technology (COT)",
    "College of Education (COE)",
    "College of Nursing (CON)",
    "College of Business (COB)",
    "College of Public Administration and Governance (CPAG)",
    "College of Arts and Sciences (CAS)",
    "College of Law (COL)"
  ];

  const departmentOptionsByOffice = {
    "College of Public Administration and Governance (CPAG)": [
      "Public Administration"
    ],
    "College of Arts and Sciences (CAS)": [
      "Community Development",
      "Development Communication",
      "Economics",
      "General Education",
      "Language and Letters",
      "Mathematics",
      "Natural Sciences",
      "Philosophy",
      "Sociology & Social Sciences"
    ],
    "College of Business (COB)": [
      "Accountancy",
      "Business Administration",
      "Hospitality Management"
    ],
    "College of Education (COE)": [
      "Elementary School Laboratory (ESL)",
      "Secondary School Laboratory (SSL)",
      "Early Childhood Education",
      "Elementary Education",
      "Physical Education",
      "Secondary Education"
    ],
    "College of Nursing (CON)": [
      "Nursing"
    ],
    "College of Technology (COT)": [
      "Automotive Technology",
      "Electronics Technology",
      "Food Technology",
      "Information Technology"
    ],
    "College of Law (COL)": []
  };

  const departmentFallbackMessage = "Please specify your concern, and we will route it accordingly.";

  // Function to extract grievance title from user input
  const extractGrievanceTitle = (userInput) => {
    const lowerInput = userInput.toLowerCase();

    const patternMatches = [
      /(?:about|regarding|concerning)\s+(.+)/i,
      /(?:i want to report|i want to complain about|i need to report)\s+(.+)/i,
      /(?:this is about|my complaint is about)\s+(.+)/i
    ];

    for (const pattern of patternMatches) {
      const match = userInput.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].trim().replace(/[.?!]+$/, '');
        if (candidate.length > 4) {
          return candidate
            .split(' ')
            .slice(0, 8)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
    }
    
    // Check for exact keyword matches
    for (const keyword of grievanceTitleKeywords) {
      if (lowerInput.includes(keyword)) {
        // Return the keyword as the title, properly capitalized
        return keyword.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }
    
    // If no keyword match, return null to use full input as title
    return null;
  };

  const isEnglishIntent = (intentName) => typeof intentName === 'string' && intentName.includes('(Eng)');

  const addBotMessage = (text, extra = {}) => {
    const botReply = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      sender: 'bot',
      timestamp: new Date(),
      ...extra
    };
    setMessages(prev => [...prev, botReply]);
    return botReply;
  };

  const normalizeText = (text = '') => text.toLowerCase().replace(/\s+/g, ' ').trim();

  const isVagueComplaintInput = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return true;
    if (normalized.length < 20 || normalized.split(' ').length < 5) return true;
    return vagueDetailPhrases.some(phrase => normalized === phrase || normalized.includes(phrase));
  };

  const isDetailedComplaintInput = (text) => {
    const normalized = normalizeText(text);
    const wordCount = normalized.split(' ').filter(Boolean).length;
    const detailSignals = ['because', 'when', 'where', 'who', 'after', 'during', 'happened', 'said', 'message', 'office', 'teacher', 'staff'];
    return normalized.length >= 70 || wordCount >= 14 || detailSignals.some(signal => normalized.includes(signal));
  };

  const getDetailNudge = (subject) => {
    const normalized = normalizeText(subject);
    if (normalized.includes('grade') || normalized.includes('failed') || normalized.includes('graded')) {
      return 'If you can, include the subject, assessment, and why you believe the grading or outcome was unfair.';
    }
    if (normalized.includes('harass') || normalized.includes('bully') || normalized.includes('threat') || normalized.includes('abuse')) {
      return 'If you can, include what was said or done, who was involved, and whether there were witnesses or messages.';
    }
    return 'If you can, include what happened, who was involved, and the office or location connected to the concern.';
  };

  const hasDirectComplaintKeyword = (text = '') => {
    const normalized = normalizeText(text);
    return grievanceTitleKeywords.some(keyword => normalized.includes(keyword));
  };

  const isLocalCancelMessage = (text = '') => {
    const normalized = normalizeText(text);
    return ['cancel', 'stop', 'start over', 'never mind', 'nevermind', 'quit'].some(keyword => normalized.includes(keyword));
  };

  const isValidPersonInvolvedInput = (text = '') => {
    const normalized = normalizeText(text);
    if (normalized.length < 3) return false;
    const unclearValues = ['someone', 'somebody', 'person', 'people', 'staff', 'office', 'idk', 'not sure', 'unknown'];
    return !unclearValues.includes(normalized);
  };

  const resolveOfficeSelection = (text = '') => {
    const normalized = normalizeText(text);
    const officeAliases = {
      "College of Technology (COT)": ['technology', 'cot', 'college of technology', 'tech', 'engineering'],
      "College of Education (COE)": ['education', 'coe', 'college of education', 'teaching', 'education college'],
      "College of Nursing (CON)": ['nursing', 'con', 'college of nursing', 'nurse', 'nursing college'],
      "College of Business (COB)": ['business', 'cob', 'college of business', 'business college', 'commerce'],
      "College of Public Administration and Governance (CPAG)": ['public administration', 'cpag', 'governance', 'admin', 'public admin'],
      "College of Arts and Sciences (CAS)": ['arts and sciences', 'cas', 'college of arts and sciences', 'arts', 'sciences'],
      "College of Law (COL)": ['law', 'col', 'college of law', 'legal', 'law college']
    };

    for (const [office, aliases] of Object.entries(officeAliases)) {
      if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
        return office;
      }
    }

    if (officeOptions.includes(text)) {
      return text;
    }

    return null;
  };

  const resolveDepartmentSelection = (office, text = '') => {
    const normalized = normalizeText(text);
    const departmentOptions = departmentOptionsByOffice[office] || [];

    return departmentOptions.find((department) => normalizeText(department) === normalized) || null;
  };

  // Function to detect if user is speaking Cebuano
  const detectCebuanoLanguage = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    // Common Cebuano words/phrases that indicate Cebuano language
    const cebuanoIndicators = [
      'ako', 'ikaw', 'siya', 'kita', 'kamo', 'sila', // pronouns
      'gusto', 'buot', 'kinahanglan', 'kinahanglan', // want/need
      'unsa', 'what', 'ngano', 'why', 'asa', 'diin', // question words
      'mao', 'man', 'ba', 'ra', 'lang', 'sad', // particles
      'salamat', 'daghan', 'sige', 'huwag', 'ayaw', // common expressions
      'gikan', 'padulong', 'sa', 'ug', 'nga', // prepositions
      'karon', 'ugma', 'kahapon', 'karong', // time words
      'balaan', 'ginoo', 'diyos', 'panginoon', // religious terms
      'pabor', 'tabang', 'sakit', 'luoy', 'kalipay', // emotions/actions
      'eskwela', 'klase', 'magtutudlo', 'estudyante', // school terms
      'reklamo', 'sumbong', 'pakisuyo', 'pangutana', // complaint terms
      'diin', 'kinsa', 'kanus-a', 'pila', // question patterns
      'dili', 'wala', 'naa', 'moo', // negations/affirmations
      'mahal', 'barato', 'butang', 'palit', 'baligya', // transaction terms
    ];
    
    // Count Cebuano indicators found
    let cebuanoCount = 0;
    for (const indicator of cebuanoIndicators) {
      if (lowerInput.includes(indicator)) {
        cebuanoCount++;
      }
    }
    
    // If we find 2 or more Cebuano indicators, assume Cebuano
    return cebuanoCount >= 2;
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authService.getProfile();
        if (response.success) {
          setUserInfo(response.user);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showSubmissionModal, submissionProgress, submissionPhase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const resetConversationState = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your grievance assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
        options: ["File a new grievance", "Get help with filing"]
      }
    ]);
    setActiveMode(null);
    setCurrentStep(0);
    setInFilingFlow(false);
    setAwaitingDescription(false);
    setAwaitingDate(false);
    setAwaitingPersonInvolved(false);
    setAwaitingOffice(false);
    setAwaitingDepartment(false);
    setConfirmationPending(false);
    setDetectedLanguage('en');
    setGrievanceData({
      category: '',
      office: '',
      department: '',
      subject: '',
      description: '',
      incidentDate: '',
      involvedPerson: '',
      documents: [],
      attachments: []
    });
    setReferenceNumber('');
    setSubmittedReferenceNumber('');
    setSubmissionProgress(0);
    setSubmissionPhase('idle');
    setSubmissionStatusText('');
    setInputValue('');
  };

  const cleanupAttachments = () => {
    grievanceData.attachments.forEach((attachment) => {
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
    });
  };

  const queueConversationReset = (delay = 5000) => {
    window.setTimeout(() => {
      resetConversationState();
    }, delay);
  };
  
  // --- Dialogflow helper ---------------------------------------------------
  const sendToDialogflow = async (text) => {
    console.debug("sending to Dialogflow:", text);
    try {
      const res = await fetch(`${BACKEND_URL}/api/dialogflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          sessionId: "grievance-session",
        }),
      });

      if (!res.ok) {
        console.error("Dialogflow server returned status", res.status);
        return null;
      }

      const data = await res.json();
      console.debug("Dialogflow response:", data);
      if (data?.intent && isEnglishIntent(data.intent)) {
        setConversationContext(prev => ({
          ...prev,
          lastEnglishIntent: data.intent
        }));
      }
      return data;
    } catch (error) {
      console.error("Dialogflow fetch error:", error);
      return null;
    }
  };

  // Edit Modal Component
  const EditModal = () => {
    const [tempSubject, setTempSubject] = useState(grievanceData.subject);
    const [tempDescription, setTempDescription] = useState(grievanceData.description);

    const handleSave = () => {
      setGrievanceData(prev => ({
        ...prev,
        subject: tempSubject,
        description: tempDescription
      }));
      setShowEditModal(false);
      // re-show confirmation with updated values
      handleSendConfirmation();
    };

    const handleSubmitEdit = () => {
      setGrievanceData(prev => ({
        ...prev,
        subject: tempSubject,
        description: tempDescription
      }));
      setShowEditModal(false);
      setShowSubmissionModal(true);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Grievance</h3>
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={tempSubject}
                onChange={e => setTempSubject(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={tempDescription}
                onChange={e => setTempDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 resize-none"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl font-semibold"
            >
              Save
            </button>
            <button
              onClick={handleSubmitEdit}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white py-2 px-4 rounded-xl font-semibold"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  };


  // Submission Modal Component
  const SubmissionModal = () => {
    const [wantToAttach, setWantToAttach] = useState(null); // null, true, false
    const [showFileUpload, setShowFileUpload] = useState(false);

    const closeSubmissionModal = () => {
      if (submissionPhase === 'uploading' || submissionPhase === 'submitting') {
        return;
      }

      setShowSubmissionModal(false);
      setWantToAttach(null);
      setShowFileUpload(false);
      setSubmissionProgress(0);
      setSubmissionPhase('idle');
      setSubmissionStatusText('');
      setSubmittedReferenceNumber('');
    };

    const handleFinalSubmit = async () => {
      let cloudinaryUrls = [];

      try {
        setSubmissionPhase('uploading');
        setSubmissionProgress(8);
        setSubmissionStatusText(
          grievanceData.attachments.length > 0
            ? 'Preparing your files for upload...'
            : 'Preparing your grievance for submission...'
        );

        if (grievanceData.attachments.length > 0) {
          setSubmissionProgress(24);
          setSubmissionStatusText('Uploading supporting files...');

          const filesToUpload = grievanceData.attachments.map((attachment) => attachment.file);
          const uploadResults = await cloudinaryService.uploadMultipleFilesToCloudinary(filesToUpload);

          cloudinaryUrls = uploadResults
            .filter((result) => result?.success || result?.url)
            .map((result) => ({
              url: result.url,
              publicId: result.publicId,
              originalName: result.originalName,
              format: result.format,
              size: result.size
            }));

          const failedUploads = uploadResults.filter((result) => !(result?.success || result?.url));
          if (failedUploads.length > 0) {
            console.error('Some uploads failed:', failedUploads);
          }
        }

        setSubmissionPhase('submitting');
        setSubmissionProgress(74);
        setSubmissionStatusText('Sending your grievance to the Admin... Please wait, this may take a moment.');

        const grievanceResponse = await axiosInstance.post('/grievances', {
          subject: grievanceData.subject,
          description: grievanceData.description,
          category: grievanceData.category || undefined,
          office: grievanceData.office || undefined,
          department: grievanceData.department || undefined,
          personInvolved: grievanceData.involvedPerson || undefined,
          incidentDate: grievanceData.incidentDate || incidentDate || '',
          isAnonymous: activeMode === 'anonymous',
          attachments: cloudinaryUrls
        });

        const savedGrievance = grievanceResponse.data?.data;
        const aiAnalysis = grievanceResponse.data?.aiAnalysis || savedGrievance?.aiAnalysis || null;
        const refNum = savedGrievance?.referenceNumber || '';

        setReferenceNumber(refNum);
        setSubmittedReferenceNumber(refNum);
        setSubmissionPhase('success');
        setSubmissionProgress(100);
        setSubmissionStatusText('Your grievance is now recorded and visible to the admin dashboard.');

        const fileList = grievanceData.attachments.map((file) => file.name).join(', ');
        const cloudinaryInfo = cloudinaryUrls.length > 0
          ? `\nFiles uploaded:\n${cloudinaryUrls.map((file) => `- ${file.originalName}`).join('\n')}`
          : '';
        const aiInfo = aiAnalysis
          ? `\n\nAI analysis:\nCategory: ${aiAnalysis.category?.label || 'N/A'}\nPriority: ${aiAnalysis.urgency?.label || 'N/A'}\nSentiment: ${aiAnalysis.sentiment?.label || 'N/A'}`
          : '';

        const finalResponse = {
          id: messages.length + 1,
          text: activeMode === 'anonymous'
            ? `Grievance Submitted\n\nReference Number: ${refNum}${grievanceData.attachments.length > 0 ? `\n\nAttached files: ${fileList}${cloudinaryInfo}` : ''}${aiInfo}\n\nNo personal information was shared with the grievance record.`
            : `Grievance Submitted\n\nReference Number: ${refNum}\n\nName: ${userInfo?.name || 'N/A'}\nEmail: ${userInfo?.email || 'N/A'}${grievanceData.attachments.length > 0 ? `\n\nAttached files: ${fileList}${cloudinaryInfo}` : ''}${aiInfo}\n\nYou can now track this grievance from your account.`,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages((prev) => [...prev, finalResponse]);
        cleanupAttachments();

        window.setTimeout(() => {
          setShowSubmissionModal(false);
          setWantToAttach(null);
          setShowFileUpload(false);
          queueConversationReset();
        }, 1400);
      } catch (error) {
        console.error('Failed to submit grievance:', error);
        const backendMessage = error.response?.data?.message || error.response?.data?.error || 'I could not submit your grievance right now. Please try again.';
        setSubmissionPhase('error');
        setSubmissionStatusText(backendMessage);
        const failureMessage = {
          id: messages.length + 1,
          text: backendMessage,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, failureMessage]);
      }
    };

    if (submissionPhase === 'uploading' || submissionPhase === 'submitting' || submissionPhase === 'success' || submissionPhase === 'error') {
      const progressSteps = [
        { key: 'uploading', label: grievanceData.attachments.length > 0 ? 'Uploading files' : 'Preparing submission', icon: '1' },
        { key: 'submitting', label: 'Submitting grievance', icon: '2' },
        { key: 'success', label: 'Completed', icon: '3' }
      ];
      const displayPhase = submissionPhase === 'error' ? 'submitting' : submissionPhase;
      const phaseOrder = ['uploading', 'submitting', 'success'];
      const currentIndex = phaseOrder.indexOf(displayPhase);

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                submissionPhase === 'success'
                  ? 'bg-green-100 text-green-600'
                  : submissionPhase === 'error'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600'
              }`}>
                {submissionPhase === 'success' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : submissionPhase === 'error' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {submissionPhase === 'success' ? 'Grievance Submitted' : submissionPhase === 'error' ? 'Submission Failed' : 'Submitting Grievance'}
              </h3>
              <p className="text-gray-600 mb-6">{submissionStatusText}</p>

              <div className="space-y-3 mb-6 text-left">
                {progressSteps.map((step, index) => {
                  const isComplete = submissionPhase === 'success' ? true : index < currentIndex;
                  const isCurrent = submissionPhase !== 'success' && submissionPhase !== 'error' && step.key === submissionPhase;

                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                        isComplete
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : isCurrent
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isComplete
                          ? 'bg-green-100'
                          : isCurrent
                            ? 'bg-blue-100 animate-pulse'
                            : 'bg-gray-100'
                      }`}>
                        {step.icon}
                      </div>
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                <span>Progress</span>
                <span>{submissionProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    submissionPhase === 'error'
                      ? 'bg-red-500'
                      : submissionPhase === 'success'
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`}
                  style={{ width: `${submissionProgress}%` }}
                />
              </div>

              {submittedReferenceNumber && (
                <p className="text-sm text-gray-700">
                  <strong>Reference Number:</strong> {submittedReferenceNumber}
                </p>
              )}

              {submissionPhase === 'error' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setSubmissionPhase('idle');
                      setSubmissionProgress(0);
                      setSubmissionStatusText('');
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={closeSubmissionModal}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (wantToAttach === null) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Attach Supporting Files?</h3>
              <p className="text-gray-600 mb-6">You can add supporting documents, screenshots, images, or videos if they will help explain your concern. This step is optional.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setWantToAttach(true)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                >
                  Yes, Attach Files
                </button>
                <button
                  onClick={() => setWantToAttach(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                >
                  No, Skip Attachment
                </button>
              </div>
              <button
                onClick={closeSubmissionModal}
                className="mt-4 text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (wantToAttach && !showFileUpload) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">File Attachment</h3>
              <p className="text-gray-600 mb-6">Please select any files that support your grievance. You can continue without attachments if you do not have any right now.</p>

              <FileUploadComponent
                onFilesSelected={handleFilesSelected}
                currentAttachments={grievanceData.attachments}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFileUpload(true)}
                  disabled={grievanceData.attachments.length === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                >
                  Continue with {grievanceData.attachments.length} File(s)
                </button>
                <button
                  onClick={() => {
                    setWantToAttach(false);
                    setShowFileUpload(false);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-all duration-200"
                >
                  Skip Attachment
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Final Confirmation</h3>
            <p className="text-gray-600 mb-4">
              {grievanceData.attachments.length > 0
                ? `You're submitting with ${grievanceData.attachments.length} attached file(s). Please review the summary below before you send it.`
                : "You're submitting without any attachments. That's okay, and you can still continue."
              }
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700"><strong>Category:</strong> {grievanceData.category}</p>
              <p className="text-sm text-gray-700"><strong>Office:</strong> {grievanceData.office}</p>
              {grievanceData.department && (
                <p className="text-sm text-gray-700"><strong>Department:</strong> {grievanceData.department}</p>
              )}
              <p className="text-sm text-gray-700"><strong>Subject:</strong> {grievanceData.subject}</p>
              <p className="text-sm text-gray-700"><strong>Description:</strong> {grievanceData.description.length > 120 ? `${grievanceData.description.substring(0, 120)}...` : grievanceData.description}</p>
              {grievanceData.incidentDate && (
                <p className="text-sm text-gray-700"><strong>Date of Incident:</strong> {grievanceData.incidentDate}</p>
              )}
              {grievanceData.attachments.length > 0 && (
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Files:</strong> {grievanceData.attachments.map((file) => file.name).join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleFinalSubmit}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
              >
                Submit Grievance
              </button>
              <button
                onClick={closeSubmissionModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // File Upload Component

  const FileUploadComponent = ({ onFilesSelected, currentAttachments }) => {
    const fileInputRef = useRef(null);
    
    const handleFileSelect = (e) => {
      const files = Array.from(e.target.files);
      const validFiles = [];
      
      files.forEach(file => {
        // Validate file type
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/avi', 'video/mov'];
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        
        if (!validTypes.includes(file.type)) {
          alert(`Invalid file type: ${file.name}. Please upload PDF, JPEG, PNG, or video files only.`);
          return;
        }
        
        if (file.size > maxSize) {
          alert(`File too large: ${file.name}. Maximum size is 10MB.`);
          return;
        }
        
        validFiles.push({
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        });
      });
      
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    };
    
    const removeFile = (index) => {
      const newAttachments = [...currentAttachments];
      const removedFile = newAttachments.splice(index, 1)[0];
      
      // Clean up preview URL if it's an image
      if (removedFile.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      
      setGrievanceData(prev => ({
        ...prev,
        attachments: newAttachments
      }));
    };
    
    return (
      <div className="mt-4">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors duration-200">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600 mb-2 font-medium">Drag & drop files here</p>
            <p className="text-gray-500 text-sm mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Browse Files
            </button>
            <p className="text-gray-400 text-xs mt-3">
              Supports: PDF, JPEG, PNG, MP4, AVI, MOV (Max 10MB each)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpeg,.jpg,.mp4,.avi,.mov"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        
        {/* File Previews */}
        {currentAttachments.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Attached Files:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentAttachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    {attachment.preview ? (
                      <img src={attachment.preview} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{attachment.name}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const grievanceSteps = [
    { question: "What category does your grievance fall under?", options: ["Academic Issues", "Administrative Concerns", "Facility Problems", "Financial Matters", "Other"] },
    { question: "Which office should handle this matter?", options: ["College of Technology (COT)", "College of Education (COE)", "College of Nursing (CON)", "College of Business (COB)", "College of Public Administration and Governance (CPAG)", "College of Arts and Sciences (CAS)", "College of Law (COL)"] },
    { question: "Please provide a brief subject for your grievance:", type: 'text' },
    { question: "Please describe your grievance in detail:", type: 'textarea' }
  ];

  const handleFilesSelected = (files) => {
    setGrievanceData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  // when user clicks the submit-grievance button, open the submission modal directly
  const handleOpenSubmissionModal = () => {
    const isCebuano = detectedLanguage === 'ceb';
    setSubmissionProgress(0);
    setSubmissionPhase('idle');
    setSubmissionStatusText('');
    setSubmittedReferenceNumber('');
    addBotMessage(
      isCebuano
        ? "Sige, hapit na ta mahuman. Ipakita ko karon ang kataposang mga kapilian sa pagsumite, apil na ang optional nga pag-attach sa mga file."
        : "You're almost done. I'll show the final submission options now, including the optional file attachment step."
    );
    setTimeout(() => {
      setShowSubmissionModal(true);
      scrollToBottom();
    }, 450);
  };

  // when bot needs to show confirmation message with options (used by Dialogflow flow)
  const handleSendConfirmation = (dataOverride = {}) => {
    const isCebuano = detectedLanguage === 'ceb';
    const summaryData = { ...grievanceData, ...dataOverride };
    let summaryText = isCebuano 
      ? `Salamat. Mao ni ang akong nasabtan sa imong reklamo.\n\nPalihug kumpirma:\n\nTitulo: '${summaryData.subject}'\nDeskripsyon: '${summaryData.description}'`
      : `Here's a summary of your complaint. Please review everything before submitting.\n\nTitle: '${summaryData.subject}'\nDescription: '${summaryData.description}'`;
    
    if (summaryData.incidentDate) {
      summaryText += isCebuano 
        ? `\nPetsa sa Insidente: ${summaryData.incidentDate}`
        : `\nDate of Incident: ${summaryData.incidentDate}`;
    }

    if (summaryData.involvedPerson) {
      summaryText += isCebuano
        ? `\nTawo nga Nalambigit: ${summaryData.involvedPerson}`
        : `\nPerson Involved: ${summaryData.involvedPerson}`;
    }

    summaryText += isCebuano
      ? `\nOpisina: ${summaryData.office || 'Wala pa matino'}`
      : `\nOffice: ${summaryData.office || 'Not provided yet'}`;

    if (summaryData.department) {
      summaryText += isCebuano
        ? `\nDepartamento: ${summaryData.department}`
        : `\nDepartment: ${summaryData.department}`;
    }
    
    const summaryMsg = {
      id: messages.length + 1,
      text: summaryText,
      sender: 'bot',
      timestamp: new Date(),
      options: isCebuano ? ['Kumpirma & Isumite', 'Usba'] : ['Confirm & Submit', 'Edit'],
      disabledOptions: []
    };
    setMessages(prev => [...prev, summaryMsg]);
    setConfirmationPending(true);
  };

  const handleSend = async (directMessage) => {
    const messageText = directMessage || inputValue;
    if (!messageText.trim()) return;
    
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    console.debug('user message sent, currentStep', currentStep, 'inFilingFlow', inFilingFlow);
    
    // ========== DYNAMIC DIALOGFLOW-FIRST APPROACH ==========
    // For most conversational messages, query Dialogflow first to get dynamic responses
    
    // If NOT in filing flow, always check Dialogflow first for dynamic responses
    if (!inFilingFlow && currentStep === 0) {
      setIsTyping(true);
      
      // Send to Dialogflow to get dynamic response based on intents
      const dfResponse = await sendToDialogflow(messageText);
      setIsTyping(false);
      
      console.log('Dialogflow response for conversational message:', dfResponse);
      
      // Check if Dialogflow detected the Cancel intent
      if (dfResponse && dfResponse.intent === 'iServe-BukSU-Complaints-Cancel_Complaint(Eng)') {
        // User wants to cancel - reset everything immediately
        console.log('Cancel intent detected, resetting conversation...');
        
        // Show Dialogflow's cancellation response first
        if (dfResponse && dfResponse.text) {
          const cancelReply = {
            id: messages.length + 2,
            text: dfResponse.text,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, cancelReply]);
        }
        
        // Then reset the conversation after a delay
        setTimeout(() => {
          // Reset all states
          setMessages([
            {
              id: 1,
              text: "Hello! I'm your grievance assistant. How can I help you today?",
              sender: 'bot',
              timestamp: new Date(),
              options: ["File a new grievance", "Get help with filing"]
            }
          ]);
          setActiveMode(null);
          setCurrentStep(0);
          setInFilingFlow(false);
          setAwaitingDescription(false);
          setAwaitingDate(false);
          setAwaitingPersonInvolved(false);
          setAwaitingOffice(false);
          setAwaitingDepartment(false);
          setGrievanceData({
            category: '',
            office: '',
            department: '',
            subject: '',
            description: '',
            incidentDate: '',
            involvedPerson: '',
            documents: [],
            attachments: []
          });
          setReferenceNumber('');
          setInputValue('');
          setIsTyping(false);
        }, 1500);
        
        scrollToBottom();
        return;
      }
      
      // Check if Dialogflow detected the File_Complaint intent (English or Cebuano) or if user message suggests filing
      const isFilingIntent = dfResponse?.intent === 'iServe-BukSU-Complaints-File_Complaint(Eng)' || 
                            dfResponse?.intent === 'iServe-BukSU-Complaints-File_Complaint(Ceb)' ||
                            messageText.toLowerCase().includes('file') || 
                            messageText.toLowerCase().includes('report') || 
                            messageText.toLowerCase().includes('grievance') ||
                            messageText.toLowerCase().includes('submit') ||
                            messageText.toLowerCase().includes('complaint');
      
      if (dfResponse && isFilingIntent) {
        const isCebuanoIntent = dfResponse?.intent === 'iServe-BukSU-Complaints-File_Complaint(Ceb)' || detectCebuanoLanguage(messageText);
        setDetectedLanguage(isCebuanoIntent ? 'ceb' : 'en');

        // User wants to file a complaint - trigger the filing flow
        
        // First, show Dialogflow's response if available
        if (dfResponse && dfResponse.text) {
          const dfReply = {
            id: messages.length + 2,
            text: dfResponse.text,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, dfReply]);
        }
        
        // Then, after a brief delay, show the submission type selection
        setTimeout(() => {
          setInFilingFlow(true);
          setActiveMode('selecting');
          
          const modeSelectionMsg = {
            id: messages.length + 3,
            text: isCebuanoIntent
              ? "Andam ko motabang. Palihug pili ang imong tipo sa pagsumite:\n\nSubmit Anonymously - dili maapil ang imong identity sa complaint record.\nSubmit with Identity - maapil ang imong account details aron dali ka ma-update."
              : "You're in the right place. Please choose your submission type:\n\nSubmit Anonymously - your identity will not be attached to the grievance record.\nSubmit with Identity - your account details will stay with the grievance so updates are easier to track.",
            sender: 'bot',
            timestamp: new Date(),
            options: ["Submit Anonymously", "Submit with Identity"],
            disabledOptions: []
          };
          
          setMessages(prev => [...prev, modeSelectionMsg]);
          setIsTyping(false);
          scrollToBottom();
        }, dfResponse && dfResponse.text ? 800 : 0);
        
        if (!dfResponse || !dfResponse.text) {
          setIsTyping(false);
        }
        scrollToBottom();
        return;
      }

      const directComplaintTitle = extractGrievanceTitle(messageText);
      if (!detectCebuanoLanguage(messageText) && hasDirectComplaintKeyword(messageText) && directComplaintTitle) {
        setDetectedLanguage('en');
        setInFilingFlow(true);
        setActiveMode('regular');
        setCurrentStep(3);
        setAwaitingDescription(true);
        setGrievanceData(prev => ({
          ...prev,
          subject: directComplaintTitle,
          description: directComplaintTitle,
          incidentDate: '',
          involvedPerson: '',
          office: '',
          department: ''
        }));

        const directComplaintPrompt = dfResponse?.text
          ? `Thanks for sharing that. ${dfResponse.text}\n\nI picked up the main concern as "${directComplaintTitle}". Please describe what happened in enough detail so I can prepare your complaint properly.`
          : `Thanks for sharing that. I picked up the main concern as "${directComplaintTitle}". Please describe what happened in enough detail so I can prepare your complaint properly.`;

        addBotMessage(directComplaintPrompt);
        scrollToBottom();
        return;
      }
      
      // If Dialogflow returned a response, use it
      if (dfResponse && dfResponse.text) {
        const botReply = {
          id: messages.length + 2,
          text: dfResponse.text,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botReply]);
        scrollToBottom();
        return;
      }
    }
    
    // ========== FILING FLOW LOGIC ==========
    // Handle initial filing request - show submission type selection
    if (currentStep === 0 && !activeMode && !inFilingFlow && (messageText.toLowerCase().includes('file') || messageText.toLowerCase().includes('new') || messageText.toLowerCase().includes('grievance'))) {
      // Detect language from user's initial message
      const isCebuano = detectCebuanoLanguage(messageText);
      setDetectedLanguage(isCebuano ? 'ceb' : 'en');
      
      setInFilingFlow(true);
      setActiveMode('selecting'); // Temporary state to show mode selector
      
      const modeSelectionMsg = {
        id: messages.length + 2,
        text: isCebuano
          ? "Andam ko motabang. Palihug pili ang imong tipo sa pagsumite:\n\nSubmit Anonymously - dili maapil ang imong identity sa complaint record.\nSubmit with Identity - maapil ang imong account details aron dali ka ma-update."
          : "You're in the right place. Please choose your submission type:\n\nSubmit Anonymously - your identity will not be attached to the grievance record.\nSubmit with Identity - your account details will stay with the grievance so updates are easier to track.",
        sender: 'bot',
        timestamp: new Date(),
        options: ["Submit Anonymously", "Submit with Identity"],
        disabledOptions: []
      };
      
      setMessages(prev => [...prev, modeSelectionMsg]);
      setIsTyping(false);
      scrollToBottom();
      return;
    }
    
    // Handle submission type selection
    if (activeMode === 'selecting' && (messageText.includes('Anonymously') || messageText.includes('Identity'))) {
      const selectedMode = messageText.includes('Anonymously') ? 'anonymous' : 'regular';
      setActiveMode(selectedMode);
      setCurrentStep(1);
      
      setTimeout(() => {
        const isCebuano = detectedLanguage === 'ceb';
        const confirmationMsg = {
          id: messages.length + 3,
          text: isCebuano 
            ? `Napili mo: ${messageText}\n\n✅ Kumpirmado!\n\nSunod, kinahanglan mo hatag:\n• Titulo sa reklamo\n• Deskripsyon sa isyu\n• Petsa sa insidente\n• Lokasyon o opisina nga apil\n• Opsyonal nga mga dokumento sa suporta\n\nAndam na ba mo magpadayon?`
            : `You've chosen to: ${messageText}\n\n✅ Choice confirmed!\n\nNext, you'll need to provide:\n• Title of the grievance\n• Description of the issue\n• Date of the incident\n• Location or office involved\n• Optional supporting documents\n\nReady to proceed?`,
          sender: 'bot',
          timestamp: new Date(),
          options: isCebuano ? ["Magpadayon", "Walaon ug Sugod Muli"] : ["Continue", "Cancel and Start Over"]
        };
        
        setMessages(prev => [...prev, confirmationMsg]);
        setIsTyping(false);
        scrollToBottom();
      }, 1000);
      return;
    }
    
    // Handle confirmation or cancellation
    if (currentStep === 1) {
      const isCebuano = detectedLanguage === 'ceb';
      const isContinue = messageText.includes('Continue') || messageText.includes('Magpadayon');
      const isCancel = messageText.includes('Cancel') || messageText.includes('Walaon');
      
      if (isContinue) {
        // Proceed to actual grievance filing (chatbot takes over)
        setTimeout(() => {
          const handoffMsg = {
            id: messages.length + 2,
            text: isCebuano 
              ? "Perfect! Gi-giya na kita sa pag-file sa imong reklamo sunod sa sunod. Unsa man ang isyu nga atong atubangan karon?"
              : "Perfect! I'll now guide you through filing your grievance step by step. Now what's the issue we are dealing here?",
            sender: 'bot',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, handoffMsg]);
          setCurrentStep(2);
          setIsTyping(false);
          scrollToBottom();
        }, 1000);
      } else if (isCancel) {
        // Reset process
        setTimeout(() => {
          const resetMsg = {
            id: messages.length + 2,
            text: isCebuano
              ? "Nakansela ang proseso. Mag-ugli kita!\n\nHello! Ako ang imong assistant sa reklamo. Unsa man ang akong mahimo sa pagtabang nimo karon?"
              : "Process cancelled. Let's start over!\n\nHello! I'm your grievance assistant. How can I help you today?",
            sender: 'bot',
            timestamp: new Date(),
            options: isCebuano ? ["File usa ka bag-ong reklamo", "Pangita ug tabang sa pag-file"] : ["File a new grievance", "Get help with filing"]
          };
          
          setMessages(prev => [...prev, resetMsg]);
          setActiveMode(null);
          setCurrentStep(0);
          setInFilingFlow(false);
          setAwaitingDescription(false);
          setAwaitingDate(false);
          setAwaitingPersonInvolved(false);
          setAwaitingOffice(false);
          setAwaitingDepartment(false);
          setGrievanceData({
            category: '',
            office: '',
            department: '',
            subject: '',
            description: '',
            incidentDate: '',
            involvedPerson: '',
            documents: [],
            attachments: []
          });
          setIsTyping(false);
          scrollToBottom();
        }, 1000);
      }
      return;
    }
    
    // STEP: User provides grievance title
    if (currentStep === 2) {
      setIsTyping(true);
      const dfResponse = await sendToDialogflow(messageText);
      setIsTyping(false);

      if (dfResponse && dfResponse.intent === 'iServe-BukSU-Complaints-Cancel_Complaint(Eng)') {
        if (dfResponse.text) {
          const cancelReply = {
            id: messages.length + 2,
            text: dfResponse.text,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, cancelReply]);
        }
        
        // Reset after delay
        setTimeout(() => {
          setMessages([
            {
              id: 1,
              text: "Hello! I'm your grievance assistant. How can I help you today?",
              sender: 'bot',
              timestamp: new Date(),
              options: ["File a new grievance", "Get help with filing"]
            }
          ]);
          setActiveMode(null);
          setCurrentStep(0);
          setInFilingFlow(false);
          setAwaitingDescription(false);
          setAwaitingDate(false);
          setAwaitingPersonInvolved(false);
          setAwaitingOffice(false);
          setAwaitingDepartment(false);
          setGrievanceData({
            category: '',
            office: '',
            department: '',
            subject: '',
            description: '',
            incidentDate: '',
            involvedPerson: '',
            documents: [],
            attachments: []
          });
          setInputValue('');
        }, 1500);
        
        scrollToBottom();
        return;
      }
      
      // Extract grievance title from keywords
      const extractedTitle = extractGrievanceTitle(messageText);
      const grievanceTitle = extractedTitle || messageText;
      const isCebuano = detectedLanguage === 'ceb';
      
      setGrievanceData(prev => ({
        ...prev,
        subject: grievanceTitle,
        description: grievanceTitle
      }));

      setCurrentStep(3);
      let replyText;

      if (dfResponse == null) {
        replyText = isCebuano 
          ? "⚠️ Naglisod ako sa pag-abot sa Dialogflow service. Palihug sulogi ug balik."
          : "⚠️ I'm having trouble reaching the Dialogflow service. Please try again later.";
      } else if (dfResponse.text) {
        replyText = isCebuano
          ? dfResponse.text
          : `I'm sorry you're dealing with this. ${dfResponse.text}\n\nI picked up the main concern as "${grievanceTitle}". ${getDetailNudge(grievanceTitle)}`;
        // assume agent is now asking for description
        setAwaitingDescription(true);
      } else {
        // If we found a keyword title, use a specific response to ask for details
        if (extractedTitle) {
          replyText = isCebuano 
            ? `Nasabtan ko nga nagreklamo ka sa: **${grievanceTitle}**. Palihug hatag ug daghang detalye mahitungod niini. I-describe kini sa hingpit aron makatabang kita nimo maayo.`
            : `I'm sorry you're dealing with this. I understand you're reporting: **${grievanceTitle}**. Please tell me more so I can document it properly. ${getDetailNudge(grievanceTitle)}`;
        } else {
          replyText = isCebuano 
            ? "Palihug ipasaylo pa kini?" 
            : `I want to make sure I capture this correctly. Could you please explain what happened in a bit more detail? ${getDetailNudge(grievanceTitle)}`;
        }
        setAwaitingDescription(true);
      }

      const botReply = {
        id: messages.length + 2,
        text: replyText,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botReply]);
      scrollToBottom();
      return;
    }

    // STEP: System-guided complaint completion phase
    if (currentStep === 3) {
      if (isLocalCancelMessage(messageText)) {
        // Reset after delay
        setTimeout(() => {
          setMessages([
            {
              id: 1,
              text: "Hello! I'm your grievance assistant. How can I help you today?",
              sender: 'bot',
              timestamp: new Date(),
              options: ["File a new grievance", "Get help with filing"]
            }
          ]);
          setActiveMode(null);
          setCurrentStep(0);
          setInFilingFlow(false);
          setAwaitingDescription(false);
          setAwaitingDate(false);
          setAwaitingPersonInvolved(false);
          setAwaitingOffice(false);
          setAwaitingDepartment(false);
          setGrievanceData({
            category: '',
            office: '',
            department: '',
            subject: '',
            description: '',
            incidentDate: '',
            involvedPerson: '',
            documents: [],
            attachments: []
          });
          setInputValue('');
        }, 1500);
        
        scrollToBottom();
        return;
      }
      
      // if we were waiting for the description response, capture it and proceed to person involved
      if (awaitingDescription) {
        const isCebuano = detectedLanguage === 'ceb';
        const isVague = isVagueComplaintInput(messageText);
        const isDetailed = isDetailedComplaintInput(messageText);

        if (isVague && !isDetailed) {
          setConversationContext(prev => ({
            ...prev,
            descriptionAttempts: prev.descriptionAttempts + 1
          }));
          setAwaitingDescription(true);

          let clarificationText;
          if (isCebuano) {
            clarificationText = `${conversationContext.descriptionAttempts > 0 ? "Gamaya na lang. " : ""}Salamat. Pwede pa nimo kini dugangan ug detalye? Makatabang kung maapil kung unsa gyud ang nahitabo, kinsa ang apil, ug asa o unsang opisina kini nalambigit.`;
          } else {
            clarificationText = `${conversationContext.descriptionAttempts > 0 ? "We're almost there. " : ""}I want to make sure I clearly understand your concern. Could you provide more details about what happened?`;
          }

          addBotMessage(clarificationText);
          scrollToBottom();
          return;
        }

        setGrievanceData(prev => ({
          ...prev,
          description: prev.description + (prev.description ? "\n" : "") + messageText
        }));
        setAwaitingDescription(false);
        setConversationContext(prev => ({
          ...prev,
          descriptionAttempts: 0
        }));

        setAwaitingDate(false);
        setAwaitingPersonInvolved(true);
        addBotMessage(
          isCebuano
            ? "Salamat sa imong pagpasabot. Mangutana pa ko ug pipila ka detalye aron makompleto ang imong report.\n\nKinsa ang nalambigit niini nga insidente?"
            : "Thank you for explaining that. I just need a few more details.\n\nWho was involved in this incident? (e.g., instructor, staff, office)"
        );
        scrollToBottom();
        return;
      }

      // legacy date state is skipped in the current filing flow
      if (awaitingDate) {
        setAwaitingDate(false);
        setAwaitingPersonInvolved(true);
        addBotMessage(
          detectedLanguage === 'ceb'
            ? "Mangutana pa ko ug pipila ka detalye aron makompleto ang imong report.\n\nKinsa ang nalambigit niini nga insidente?"
            : "Got it. Let me ask a couple more things to complete your report.\n\nWho was involved in this incident? (e.g., instructor, staff, office)"
        );
        scrollToBottom();
        return;
      }

      if (awaitingPersonInvolved) {
        const isCebuano = detectedLanguage === 'ceb';
        if (!isCebuano && !isValidPersonInvolvedInput(messageText)) {
          addBotMessage("Who was involved in this incident? Please provide the person, staff member, or office involved.");
          scrollToBottom();
          return;
        }

        setGrievanceData(prev => ({
          ...prev,
          involvedPerson: messageText.trim(),
          department: ''
        }));
        setAwaitingPersonInvolved(false);
        setAwaitingOffice(true);

        addBotMessage(
          isCebuano
            ? "Salamat. Karon, ato siguraduhon nga maadto kini sa hustong opisina.\n\nAsang opisina dapat mo-handle niini?"
            : "Now, let's make sure this goes to the right office.\n\nWhich office should handle this complaint?",
          isCebuano
            ? {}
            : { options: officeOptions, disabledOptions: [] }
        );
        scrollToBottom();
        return;
      }

      if (awaitingOffice) {
        const isCebuano = detectedLanguage === 'ceb';
        const resolvedOffice = resolveOfficeSelection(messageText);

        if (!resolvedOffice) {
          if (isCebuano) {
            addBotMessage("Palihug isulti kung unsang opisina ang dapat mo-handle niini.");
          } else {
            addBotMessage(
              "Which office should handle this complaint? Please choose the most appropriate office.",
              { options: officeOptions, disabledOptions: [] }
            );
          }
          scrollToBottom();
          return;
        }

        setGrievanceData(prev => ({
          ...prev,
          office: resolvedOffice,
          department: ''
        }));
        setAwaitingOffice(false);
        const departmentOptions = departmentOptionsByOffice[resolvedOffice] || [];

        if (departmentOptions.length > 0) {
          setAwaitingDepartment(true);
          addBotMessage(
            isCebuano
              ? `Salamat. Pilia ang department ubos sa ${resolvedOffice}.`
              : `Thanks. Please choose the department under ${resolvedOffice}.`,
            { options: departmentOptions, disabledOptions: [] }
          );
          scrollToBottom();
          return;
        }

        addBotMessage(
          isCebuano
            ? `${departmentFallbackMessage}\n\nKompleto na ang mga detalye. Ato nang ipakita ang summary sa imong reklamo.`
            : `${departmentFallbackMessage}\n\nThank you. I now have the complete details I need. I'll show you the summary before submission.`
        );

        handleSendConfirmation({ office: resolvedOffice, department: '' });
        return;
      }

      if (awaitingDepartment) {
        const isCebuano = detectedLanguage === 'ceb';
        const resolvedDepartment = resolveDepartmentSelection(grievanceData.office, messageText);

        if (!resolvedDepartment) {
          addBotMessage(
            isCebuano
              ? "Palihug pilia ang hustong department gikan sa mga kapilian."
              : "Please choose the appropriate department from the available options.",
            { options: departmentOptionsByOffice[grievanceData.office] || [], disabledOptions: [] }
          );
          scrollToBottom();
          return;
        }

        setGrievanceData(prev => ({
          ...prev,
          department: resolvedDepartment
        }));
        setAwaitingDepartment(false);

        addBotMessage(
          isCebuano
            ? "Kompleto na ang mga detalye. Ato nang ipakita ang summary sa imong reklamo."
            : "Thank you. I now have the complete details I need. I'll show you the summary before submission."
        );
        handleSendConfirmation({ department: resolvedDepartment });
        return;
      }

      addBotMessage("Please continue with the complaint details so I can complete your report.");
      scrollToBottom();
      return;
      /*


        replyText = "⚠️ I'm having trouble reaching the Dialogflow service. Please try again later.";
      */
    }
    
    // Handle specific help options FIRST (before general help) - these are button clicks
    if (messageText.includes('Filing Process Guide') || messageText.includes('Required Documents') || messageText.includes('Office Selection Help')) {
      setTimeout(() => {
        let responseText = '';
        
        if (messageText.includes('Filing Process Guide')) {
          responseText = "Here is the general process for filing a grievance:\n\n1. Identify the academic concern or issue.\n2. Prepare the required information such as the title of the grievance, description of the issue, date of the incident, and the academic college involved.\n3. Gather supporting evidence if available.\n4. Submit the grievance through the grievance filing system.\n5. The selected academic office will review the complaint.\n6. You will receive updates regarding the status of your grievance.";
        } else if (messageText.includes('Required Documents')) {
          responseText = "The following supporting documents may be submitted to support your grievance:\n\n• Photos showing the issue\n• Video recordings if available\n• Screenshots of messages or transactions\n• Relevant academic documents or files\n\nThese documents help the Academic Office review your concern more effectively.";
        } else if (messageText.includes('Office Selection Help')) {
          responseText = "Please select the academic college related to your concern.\n\nExamples of academic colleges:\n\n• COT – College of Technology\n• CON – College of Nursing\n• COE – College of Education\n• CAS – College of Arts and Sciences\n\nChoosing the correct college helps route your grievance to the appropriate academic office.";
        }
        
        const helpResponseMsg = {
          id: messages.length + 2,
          text: responseText,
          sender: 'bot',
          timestamp: new Date(),
          options: ["Back to Help Menu"]
        };
        
        setMessages(prev => [...prev, helpResponseMsg]);
        setIsTyping(false);
        scrollToBottom();
      }, 1000);
      return;
    }
    
    // Handle "Back to Help Menu"
    if (messageText.includes('Back to Help Menu')) {
      setTimeout(() => {
        const helpMsg = {
          id: messages.length + 2,
          text: "I'd be happy to help! Here are the main things I can assist you with:",
          sender: 'bot',
          timestamp: new Date(),
          options: ["Filing Process Guide", "Required Documents", "Office Selection Help", "Back"],
          disabledOptions: []
        };
        
        setMessages(prev => [...prev, helpMsg]);
        setIsTyping(false);
        scrollToBottom();
      }, 1000);
      return;
    }

    // Handle help requests (but exclude specific help options) - query Dialogflow for dynamic help
    if (messageText.toLowerCase().includes('help') || messageText.toLowerCase().includes('assistance')) {
      setIsTyping(true);
      sendToDialogflow(messageText).then((dfResponse) => {
        setIsTyping(false);

        if (dfResponse && dfResponse.text && !dfResponse.intent?.includes('File_Complaint')) {
          const helpResponseMsg = {
            id: messages.length + 2,
            text: dfResponse.text,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, helpResponseMsg]);
          scrollToBottom();
          return;
        }

        setTimeout(() => {
          const helpMsg = {
            id: messages.length + 2,
            text: "I'd be happy to help! Here are the main things I can assist you with:",
            sender: 'bot',
            timestamp: new Date(),
            options: ["Filing Process Guide", "Required Documents", "Office Selection Help", "Back"]
          };

          setMessages(prev => [...prev, helpMsg]);
          setIsTyping(false);
          scrollToBottom();
        }, 1000);
      });
      return;
    }
    
    // Default: Query Dialogflow for any other conversational input
    setIsTyping(true);
    sendToDialogflow(messageText).then((dfResponse) => {
      setIsTyping(false);

      if (dfResponse && dfResponse.text) {
        const botReply = {
          id: messages.length + 2,
          text: dfResponse.text,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botReply]);
      } else {
        const fallbackMsg = {
          id: messages.length + 2,
          text: "I want to keep us on track. If you're filing a grievance, you can tell me what happened, ask for help with filing, or choose one of the options below.",
          sender: 'bot',
          timestamp: new Date(),
          options: ["File a new grievance", "Get help with filing"]
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }

      scrollToBottom();
    });
  };

  const handleOptionSelect = (option, messageId) => {
    // Disable ALL options in the specific message when any option is clicked
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, disabledOptions: [...(msg.options || [])] }
        : msg
    ));

    // if we're in the confirmation flow, intercept the choice
    if (confirmationPending) {
      const isConfirm = option === 'Confirm & Submit' || option === 'Kumpirma & Isumite';
      const isEdit = option === 'Edit' || option === 'Usba';

      if (isConfirm) {
        const isCebuano = detectedLanguage === 'ceb';
        setSubmissionProgress(0);
        setSubmissionPhase('idle');
        setSubmissionStatusText('');
        setSubmittedReferenceNumber('');
        addBotMessage(
          isCebuano
            ? "Salamat sa pagkumpirma. Sunod, pilion nato kung gusto ba nimo mu-attach ug file, dayon ipakita ko ang final confirmation."
            : "Thank you for confirming. Next is the optional file attachment step, then I'll show the final confirmation."
        );
        setTimeout(() => {
          setShowSubmissionModal(true);
          scrollToBottom();
        }, 450);
      } else if (isEdit) {
        // open edit modal with current values
        addBotMessage(
          detectedLanguage === 'ceb'
            ? "Sige, ato usbon ang detalye una sa pagsumite."
            : "No problem. Let's update the details before submitting."
        );
        setShowEditModal(true);
      }
      setConfirmationPending(false);
      return;
    }

    handleSend(option);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-white/30 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-white/20 rounded w-24"></div>
                </div>
              ) : (
                <>
                  <h2 className="text-white text-lg font-semibold">Welcome, {userInfo?.name || 'User'}!</h2>
                  <p className="text-white/80 text-sm">How can I help you today?</p>
                </>
              )}
            </div>
          </div>
          {(activeMode === 'selecting' || activeMode === 'anonymous' || activeMode === 'regular') && (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeMode === 'selecting' 
                  ? 'bg-white/15 text-white animate-pulse' 
                  : activeMode === 'anonymous'
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white shadow-lg' 
                    : 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-white shadow-lg'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  activeMode === 'selecting' 
                    ? 'bg-white animate-ping' 
                    : activeMode === 'anonymous'
                      ? 'bg-purple-300' 
                      : 'bg-blue-300'
                }`}></div>
                <span>
                  {activeMode === 'selecting' ? 'Selecting Mode...' : 
                   activeMode === 'anonymous' ? 'Anonymous Mode' : 'Regular Mode'}
                </span>
              </div>
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: 1,
                      text: "Hello! I'm your grievance assistant. How can I help you today?",
                      sender: 'bot',
                      timestamp: new Date(),
                      options: ["File a new grievance", "Get help with filing"]
                    }
                  ]);
                  setActiveMode(null);
                  setCurrentStep(0);
                  setInFilingFlow(false);
                  setAwaitingDescription(false);
                  setAwaitingDate(false);
                  setAwaitingPersonInvolved(false);
                  setAwaitingOffice(false);
                  setAwaitingDepartment(false);
                  setGrievanceData({
                    category: '',
                    office: '',
                    department: '',
                    subject: '',
                    description: '',
                    incidentDate: '',
                    involvedPerson: '',
                    documents: [],
                    attachments: []
                  });
                  setInputValue('');
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:scale-105"
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              )}
              
              <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-3 rounded-2xl ${
                message.sender === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none ml-3' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm mr-3'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-line text-left">{message.text}</p>
                
                {message.options && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.options.map((option, index) => {
                      const isDisabled = message.disabledOptions?.includes(option);
                      const isConfirmAction = option === 'Confirm & Submit';
                      let btnClass = '';

                      if (message.sender === 'user') {
                        btnClass = 'bg-white/20 text-white hover:bg-white/30';
                      } else if (isDisabled) {
                        btnClass = 'bg-gray-100 text-gray-400 cursor-not-allowed';
                      } else if (isConfirmAction) {
                        // make confirm button match submit grievance styling
                        btnClass = 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white';
                      } else {
                        btnClass = 'bg-blue-100 hover:bg-blue-200 text-blue-800';
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => !isDisabled && handleOptionSelect(option, message.id)}
                          disabled={isDisabled}
                          className={`text-xs px-3 py-1.5 rounded-full transition-colors duration-200 ${btnClass}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                <p className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              {message.sender === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0 ml-3 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="bg-white text-gray-800 border border-gray-200 rounded-bl-none rounded-2xl rounded-tr-2xl px-4 py-3 shadow-sm mr-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {grievanceSteps[(activeMode === 'regular' ? currentStep - 1 : currentStep - 2)]?.type === 'file' ? (
            <div className="space-y-4">
              <FileUploadComponent 
                onFilesSelected={handleFilesSelected}
                currentAttachments={grievanceData.attachments}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isTyping}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit with Files
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              {/* Main Input Field */}
              {(currentStep === 3) || grievanceSteps[(activeMode === 'regular' ? currentStep - 1 : currentStep - 2)]?.type === 'textarea' ? (
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your response..."
                    rows="2"
                    className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isTyping}
                  />
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                    className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isTyping}
                  />
                </div>
              )}
              
              {/* Send Button (for chatbot conversation) */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Send</span>
              </button>
              
              {/* Submit Grievance Button (always visible during filing mode) */}
              {activeMode && (
                <button
                  type="button"
                  onClick={handleOpenSubmissionModal}
                  className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Submit Grievance</span>
                </button>
              )}
            </div>
          )}
        </form>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && <EditModal />}
      {/* Submission Modal */}
      {showSubmissionModal && <SubmissionModal />}
    </div>
  );
};

export default DashboardModule;

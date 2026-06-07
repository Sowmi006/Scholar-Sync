import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import "../styles/Chatbot.css";

const API_BASE_URL = "http://localhost:8000";

const QUESTION_FLOW = [
  {
    id: "gender",
    label: "gender",
    type: "choice",
    options: ["Male", "Female", "Other", "Prefer not to say"],
    prompt: "What is your gender?",
  },
  {
    id: "caste",
    label: "caste",
    type: "choice",
    options: ["General", "OBC", "SC", "ST", "Other"],
    prompt: "Which caste category do you belong to?",
  },
  {
    id: "religion",
    label: "religion",
    type: "choice",
    options: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"],
    prompt: "What is your religion?",
  },
  {
    id: "educationLevel",
    label: "education level",
    type: "choice",
    options: [
      { label: "High School", value: "high_school" },
      { label: "Higher Secondary", value: "higher_secondary" },
      { label: "Under Graduate", value: "under_grad" },
    ],
    prompt: "What is your current education level?",
  },
  {
    id: "familyIncome",
    label: "annual family income",
    type: "number",
    prompt: "What is your annual family income in rupees?",
  },
  {
    id: "percentage",
    label: "best academic percentage",
    type: "number",
    prompt: "What is your best academic percentage so far?",
  },
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatEducationLevel(value) {
  const levelMap = {
    high_school: "High School",
    higher_secondary: "Higher Secondary",
    under_grad: "Under Graduate",
  };

  return levelMap[value] || value || "Not specified";
}

function getProfileAnswers(profile) {
  const fatherIncome = toNumber(profile?.fatherIncome, 0);
  const motherIncome = toNumber(profile?.motherIncome, 0);

  return {
    gender: profile?.gender || "",
    caste: profile?.caste || "",
    religion: profile?.religion || "",
    educationLevel: profile?.educationLevel || "",
    familyIncome: fatherIncome + motherIncome,
    percentage: Math.max(
      toNumber(profile?.tenthPercentage, 0),
      toNumber(profile?.twelfthPercentage, 0),
      toNumber(profile?.collegeCgpa, 0) * 10
    ),
  };
}

function hasCompleteProfileAnswers(profileAnswers) {
  return Boolean(
    profileAnswers.gender &&
    profileAnswers.caste &&
    profileAnswers.religion &&
    profileAnswers.educationLevel &&
    toNumber(profileAnswers.familyIncome, 0) > 0 &&
    toNumber(profileAnswers.percentage, 0) > 0
  );
}

function getMissingProfileFields(profileAnswers) {
  const missingFields = [];

  if (!profileAnswers.gender) missingFields.push("gender");
  if (!profileAnswers.caste) missingFields.push("caste");
  if (!profileAnswers.religion) missingFields.push("religion");
  if (!profileAnswers.educationLevel) missingFields.push("education level");
  if (toNumber(profileAnswers.familyIncome, 0) <= 0) missingFields.push("family income");
  if (toNumber(profileAnswers.percentage, 0) <= 0) missingFields.push("academic percentage");

  return missingFields;
}

function scoreScholarship(scholarship, answers) {
  let score = 0;
  const reasons = [];
  let matchedCriteria = 0;

  const eligibleEducationLevels = Array.isArray(scholarship.eligibleEducationLevels)
    ? scholarship.eligibleEducationLevels.map(normalizeText)
    : [];
  const targetLevel = normalizeText(scholarship.targetLevel);
  const educationLevel = normalizeText(answers.educationLevel);

  if (educationLevel) {
    if (educationLevel === targetLevel || eligibleEducationLevels.includes(educationLevel)) {
      score += 4;
      matchedCriteria += 1;
      reasons.push(`Matches your education level: ${formatEducationLevel(answers.educationLevel)}`);
    } else if (eligibleEducationLevels.length > 0 || targetLevel) {
      return null;
    }
  }

  const eligibleCastes = Array.isArray(scholarship.eligibleCastes)
    ? scholarship.eligibleCastes.map(normalizeText)
    : [];
  const caste = normalizeText(answers.caste);
  if (eligibleCastes.length > 0) {
    if (caste && eligibleCastes.includes(caste)) {
      score += 3;
      matchedCriteria += 1;
      reasons.push(`Eligible for ${answers.caste} category students`);
    } else {
      return null;
    }
  }

  const eligibleGenders = Array.isArray(scholarship.eligibleGenders)
    ? scholarship.eligibleGenders.map(normalizeText)
    : [];
  const gender = normalizeText(answers.gender);
  if (eligibleGenders.length > 0) {
    if (gender && eligibleGenders.includes(gender)) {
      score += 2;
      matchedCriteria += 1;
      reasons.push(`Open to ${answers.gender} applicants`);
    } else {
      return null;
    }
  }

  const eligibleReligions = Array.isArray(scholarship.eligibleReligions)
    ? scholarship.eligibleReligions.map(normalizeText)
    : [];
  const religion = normalizeText(answers.religion);
  if (eligibleReligions.length > 0) {
    if (religion && eligibleReligions.includes(religion)) {
      score += 2;
      matchedCriteria += 1;
      reasons.push(`Includes ${answers.religion} minority applicants`);
    } else {
      return null;
    }
  }

  const maxFamilyIncome = scholarship.maxFamilyIncome;
  const familyIncome = toNumber(answers.familyIncome, 0);
  if (typeof maxFamilyIncome === "number") {
    if (familyIncome > 0 && familyIncome <= maxFamilyIncome) {
      score += 4;
      matchedCriteria += 1;
      reasons.push(`Fits the income limit of Rs. ${maxFamilyIncome.toLocaleString("en-IN")}`);
    } else if (familyIncome > maxFamilyIncome) {
      return null;
    }
  } else {
    score += 1;
  }

  const minimumPercentage = toNumber(scholarship.minimumPercentage, -1);
  const percentage = toNumber(answers.percentage, 0);
  if (minimumPercentage >= 0) {
    if (percentage >= minimumPercentage) {
      score += 3;
      matchedCriteria += 1;
      reasons.push(`Meets the minimum academic score of ${minimumPercentage}%`);
    } else if (percentage > 0) {
      return null;
    }
  }

  if (!reasons.length) {
    reasons.push("General eligibility appears to match your answers");
  }

  return {
    ...scholarship,
    matchScore: score,
    matchedCriteria,
    fitLabel: score >= 14 ? "Best match" : score >= 10 ? "Strong match" : "Possible match",
    reasons,
  };
}

function buildApplicationGuidance(scholarship, answers) {
  const documents = [
    "Aadhaar card",
    "Passport-size photograph",
    "Bank account details or passbook copy",
    "Bonafide certificate or admission proof",
  ];

  if (toNumber(answers.percentage, 0) > 0) {
    documents.push("Latest marksheets and academic certificates");
  }

  if (Array.isArray(scholarship.eligibleCastes) && scholarship.eligibleCastes.length > 0) {
    documents.push("Community or caste certificate");
  }

  if (Array.isArray(scholarship.eligibleReligions) && scholarship.eligibleReligions.length > 0) {
    documents.push("Minority community certificate if required by the scheme");
  }

  if (typeof scholarship.maxFamilyIncome === "number") {
    documents.push("Income certificate");
  }

  if (normalizeText(answers.educationLevel) === "under_grad") {
    documents.push("College ID card, fee receipt, or college admission letter");
  }

  const uniqueDocuments = [...new Set(documents)];
  const portalName = scholarship.applyLink?.includes("aicte")
    ? "AICTE portal"
    : "National Scholarship Portal";
  const isMinorityScheme = Array.isArray(scholarship.eligibleReligions) && scholarship.eligibleReligions.length > 0;
  const isCommunityScheme = Array.isArray(scholarship.eligibleCastes) && scholarship.eligibleCastes.length > 0;
  const isIncomeBasedScheme = typeof scholarship.maxFamilyIncome === "number";
  const isCollegeScheme = normalizeText(answers.educationLevel) === "under_grad";
  const postLoginSteps = [
    `Search for "${scholarship.name}" inside the ${portalName} dashboard.`,
    "Open the scholarship card and read the official eligibility, amount, and required document list once more.",
    "Choose the correct application type such as fresh application or renewal, whichever applies to you.",
    "Fill in your personal details exactly as in your Aadhaar card, marksheets, and bank records.",
    "Enter your academic details carefully, including institution name, course, year, and marks or CGPA.",
  ];

  if (isIncomeBasedScheme) {
    postLoginSteps.push("Enter the family income details exactly as shown in your income certificate.");
  }

  if (isCommunityScheme) {
    postLoginSteps.push("Select the correct community category and upload the caste certificate in the required format.");
  }

  if (isMinorityScheme) {
    postLoginSteps.push("Fill in the minority community details carefully and upload the required supporting certificate if the scheme asks for it.");
  }

  if (isCollegeScheme) {
    postLoginSteps.push("Review the college, course, and admission information before moving to document upload.");
  }

  postLoginSteps.push("Upload all documents clearly, preview the form, and submit only after checking every field.");
  postLoginSteps.push("After submission, track institute verification, district or state verification, and final approval status from the portal.");

  return [
    `Application help for ${scholarship.name}:`,
    "",
    "Before you open the portal:",
    "1. Read the scheme details carefully and confirm your eligibility again.",
    "2. Keep your documents ready before starting the application.",
    "3. Register or log in on the official portal linked below.",
    "",
    "After entering the website, follow these steps:",
    ...postLoginSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Documents you should prepare:",
    ...uniqueDocuments.map((item) => `- ${item}`),
    "",
    `Official portal: ${scholarship.applyLink || "https://scholarships.gov.in/"}`,
  ].join("\n");
}

function buildScholarshipSummary(scholarship) {
  return [
    `${scholarship.name}`,
    `Provider: ${scholarship.provider || "Government of India"}`,
    `Scheme: ${scholarship.scheme || "National Scholarship Portal"}`,
    `Amount: ${scholarship.amount || "Not specified"}`,
    `Deadline: ${scholarship.deadline || "Not specified"}`,
    `Eligibility: ${scholarship.eligibility || "Refer to official notification"}`,
    `Tags: ${scholarship.tags || "Not specified"}`,
  ].join("\n");
}

function findScholarshipByMessage(message, scholarshipList) {
  const normalizedMessage = normalizeText(message);
  return scholarshipList.find((scholarship) =>
    normalizedMessage.includes(normalizeText(scholarship.name))
  );
}

function buildBestMatchResponse(scholarship) {
  if (!scholarship) {
    return "I do not have a clear best match yet. Please complete your profile or restart the questions.";
  }

  return [
    `My best suggestion for you is ${scholarship.name}.`,
    "",
    "Why this looks precise for your profile:",
    ...scholarship.reasons.slice(0, 4).map((reason) => `- ${reason}`),
    "",
    "If you want, I can also show the other strong options or help you apply for this one.",
  ].join("\n");
}

function buildTopMatchesResponse(matches) {
  return [
    "Here are the top scholarships I found for you:",
    "",
    ...matches.slice(0, 3).map(
      (scholarship, index) =>
        `${index + 1}. ${scholarship.name} (${scholarship.fitLabel})`
    ),
    "",
    "You can click a card below, or type:",
    '- "Tell me about AICTE Pragati Scholarship for Girls"',
    '- "Choose Top Class Education Scheme for SC Students"',
  ].join("\n");
}

function buildDocumentsResponse(scholarship, answers) {
  const documents = [
    "Aadhaar card",
    "Passport-size photograph",
    "Bank account details or passbook copy",
    "Bonafide certificate or admission proof",
  ];

  if (toNumber(answers.percentage, 0) > 0) {
    documents.push("Latest marksheets and academic certificates");
  }

  if (Array.isArray(scholarship.eligibleCastes) && scholarship.eligibleCastes.length > 0) {
    documents.push("Community or caste certificate");
  }

  if (Array.isArray(scholarship.eligibleReligions) && scholarship.eligibleReligions.length > 0) {
    documents.push("Minority community certificate if required by the scheme");
  }

  if (typeof scholarship.maxFamilyIncome === "number") {
    documents.push("Income certificate");
  }

  if (normalizeText(answers.educationLevel) === "under_grad") {
    documents.push("College ID card, fee receipt, or college admission letter");
  }

  return [
    `Documents for ${scholarship.name}:`,
    "",
    ...[...new Set(documents)].map((item) => `- ${item}`),
  ].join("\n");
}

function buildSelectionSummary(scholarship) {
  return [
    `${scholarship.name} is a good option for you.`,
    "",
    "Why it fits:",
    ...scholarship.reasons.slice(0, 4).map((reason) => `- ${reason}`),
  ].join("\n");
}

function Chatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [scholarships, setScholarships] = useState([]);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [chatStarted, setChatStarted] = useState(false);
  const [filteredScholarships, setFilteredScholarships] = useState([]);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState("");
  const [selectedGuidance, setSelectedGuidance] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState("");
  const [needsQuestionFlow, setNeedsQuestionFlow] = useState(false);
  const [recommendationAnchorId, setRecommendationAnchorId] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(1);

  const currentQuestion = QUESTION_FLOW[questionIndex] || null;
  const profileAnswers = getProfileAnswers(userProfile);
  const profileComplete = hasCompleteProfileAnswers(profileAnswers);

  const addMessage = useCallback((text, sender) => {
    const nextMessage = {
      id: messageIdRef.current++,
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, nextMessage]);
  }, []);

  const getRecentMessages = useCallback(() => {
    return messages.slice(-8).map((message) => ({
      sender: message.sender,
      text: message.text,
    }));
  }, [messages]);

  const askQuestion = useCallback((index, nextAnswers) => {
    const question = QUESTION_FLOW[index];
    if (!question) {
      return;
    }

    const suggestedValue = nextAnswers[question.id];
    let prompt = `Question ${index + 1} of ${QUESTION_FLOW.length}: ${question.prompt}`;

    if (suggestedValue) {
      const displayValue =
        question.id === "educationLevel"
          ? formatEducationLevel(suggestedValue)
          : question.id === "familyIncome"
            ? `Rs. ${toNumber(suggestedValue).toLocaleString("en-IN")}`
            : question.id === "percentage"
              ? `${suggestedValue}%`
              : suggestedValue;
      prompt += `\nI found "${displayValue}" in your profile. You can use it or enter a different answer.`;
    }

    addMessage(prompt, "bot");
  }, [addMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, filteredScholarships, selectedScholarship]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error loading signed-in user for chatbot:", error);
        setUserProfile(null);
      } finally {
        setAuthResolved(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/scholarships`);
        if (response.ok) {
          const data = await response.json();
          setScholarships(Array.isArray(data.scholarships) ? data.scholarships : []);
        }
      } catch (error) {
        console.error("Error fetching chatbot data:", error);
      }
    };

    fetchScholarships();
  }, []);

  const fetchAssistantReply = useCallback(async (userMessage) => {
    const response = await fetch(`${API_BASE_URL}/chatbot/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        profile: userProfile || {},
        answers,
        recommendations: filteredScholarships,
        availableScholarships: scholarships,
        selectedScholarship,
        needsQuestionFlow,
        currentQuestion,
        recentMessages: getRecentMessages(),
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.detail || "Unable to get an AI response right now.");
    }

    const data = await response.json();
    return data.reply;
  }, [
    answers,
    currentQuestion,
    filteredScholarships,
    getRecentMessages,
    needsQuestionFlow,
    scholarships,
    selectedScholarship,
    userProfile,
  ]);

  const finishInterview = useCallback((nextAnswers) => {
    const matches = scholarships
      .map((scholarship) => scoreScholarship(scholarship, nextAnswers))
      .filter(Boolean)
      .sort((a, b) => b.matchScore - a.matchScore);

    setFilteredScholarships(matches);
    setSelectedScholarship(null);

    if (matches.length === 0) {
      addMessage(
        "I could not find a strong match from the current scholarship list based on these answers. You can restart the questions or update your profile details and try again.",
        "bot"
      );
      return;
    }

    const bestMatch = matches[0];
    addMessage(
      [
        `I found ${matches.length} scholarship option${matches.length > 1 ? "s" : ""} that fit your profile.`,
        "",
        `Best match right now: ${bestMatch.name}`,
        ...bestMatch.reasons.slice(0, 3).map((reason) => `- ${reason}`),
        "",
        "The cards below are ordered from strongest match to broader match. You can open details, choose one directly, or ask me to compare the top options.",
      ].join("\n"),
      "bot"
    );
    setRecommendationAnchorId(messageIdRef.current);
  }, [addMessage, scholarships]);

  useEffect(() => {
    if (!authResolved || chatStarted || scholarships.length === 0) {
      return;
    }

      const defaultAnswers = getProfileAnswers(userProfile);
      const missingFields = getMissingProfileFields(defaultAnswers);
      setAnswers(defaultAnswers);
      setChatStarted(true);

      if (missingFields.length === 0 && hasCompleteProfileAnswers(defaultAnswers)) {
        setNeedsQuestionFlow(false);
        setQuestionIndex(QUESTION_FLOW.length);
        addMessage(
          "I found your profile details, so I have already shortlisted the most suitable scholarships for you.",
          "bot"
        );
        finishInterview(defaultAnswers);
      } else {
        setNeedsQuestionFlow(false);
        setQuestionIndex(QUESTION_FLOW.length);
        addMessage(
          `Complete the profile fully before I can recommend scholarships. Missing details: ${missingFields.join(", ")}. Please finish your profile and submit it first.`,
          "bot"
        );
      }
  }, [addMessage, askQuestion, authResolved, chatStarted, finishInterview, scholarships, userProfile]);

  const simulateTyping = (callback) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, 700);
  };

  const handleQuestionAnswer = (rawValue, displayValue = rawValue) => {
    if (!currentQuestion) {
      return;
    }

    let parsedValue = rawValue;

    if (currentQuestion.type === "number") {
      const numericValue = Number(String(rawValue).replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        addMessage(`Please enter a valid ${currentQuestion.label}.`, "bot");
        return;
      }
      parsedValue = numericValue;
    }

    addMessage(String(displayValue), "user");

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: parsedValue,
    };

    setAnswers(nextAnswers);
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);

    simulateTyping(() => {
      if (nextIndex < QUESTION_FLOW.length) {
        askQuestion(nextIndex, nextAnswers);
      } else {
        setNeedsQuestionFlow(false);
        finishInterview(nextAnswers);
      }
    });
  };

  const handleGeneralChat = async (message) => {
    const lowered = message.toLowerCase();
    const scholarshipFromMessage =
      findScholarshipByMessage(message, filteredScholarships) ||
      findScholarshipByMessage(message, scholarships);

    if (!profileComplete) {
      addMessage(
        "Complete the profile fully before I can recommend scholarships. Open your profile, fill every required field, submit it, and then come back to the AI Assistant.",
        "bot"
      );
      return;
    }

    if (lowered.includes("restart") || lowered.includes("start again") || lowered.includes("change answers")) {
      restartInterview();
      return;
    }

    if (scholarshipFromMessage && (lowered.includes("select") || lowered.includes("choose") || lowered.includes("apply for"))) {
      selectScholarship(scholarshipFromMessage);
      addMessage(
        `I selected ${scholarshipFromMessage.name} below your recommendations. You can review the steps there, or ask me anything specific about eligibility, documents, or the application process.`,
        "bot"
      );
      return;
    }

    if (scholarshipFromMessage && (lowered.includes("detail") || lowered.includes("about") || lowered.includes("tell me") || lowered.includes("what is"))) {
      try {
        addMessage(await fetchAssistantReply(message), "bot");
      } catch (error) {
        console.error("AI assistant detail request failed:", error);
        addMessage(buildScholarshipSummary(scholarshipFromMessage), "bot");
      }
      return;
    }

    if (filteredScholarships.length > 1 && (lowered.includes("compare") || lowered.includes("difference"))) {
      try {
        addMessage(await fetchAssistantReply(message), "bot");
      } catch (error) {
        console.error("AI assistant comparison request failed:", error);
        const compared = filteredScholarships.slice(0, 3);
        addMessage(
          [
            "Here is a quick comparison of your top options:",
            "",
            ...compared.map((scholarship, index) => `${index + 1}. ${scholarship.name}: ${scholarship.reasons.slice(0, 2).join("; ")}`),
            "",
            "If one looks right, choose it and I will guide you through the application steps.",
          ].join("\n"),
          "bot"
        );
      }
      return;
    }

    if (selectedScholarship) {
      if (lowered.includes("document")) {
        try {
          addMessage(await fetchAssistantReply(message), "bot");
        } catch (error) {
          console.error("AI assistant document request failed:", error);
          addMessage(buildDocumentsResponse(selectedScholarship, answers), "bot");
        }
        return;
      }

      if (lowered.includes("deadline")) {
        addMessage(
          `The current deadline shown for ${selectedScholarship.name} is ${selectedScholarship.deadline || "not specified"}. You should still verify it on the official portal before applying.`,
          "bot"
        );
        return;
      }

      if (lowered.includes("apply") || lowered.includes("application") || lowered.includes("help")) {
        try {
          addMessage(await fetchAssistantReply(message), "bot");
        } catch (error) {
          console.error("AI assistant application request failed:", error);
          addMessage(buildApplicationGuidance(selectedScholarship, answers), "bot");
        }
        return;
      }

      if (lowered.includes("eligibility")) {
        try {
          addMessage(await fetchAssistantReply(message), "bot");
        } catch (error) {
          console.error("AI assistant eligibility request failed:", error);
          addMessage(
            `Here are the key details for ${selectedScholarship.name}:\n${buildScholarshipSummary(selectedScholarship)}`,
            "bot"
          );
        }
        return;
      }
    }

    if (filteredScholarships.length > 0 && (lowered.includes("best") || lowered.includes("most suitable") || lowered.includes("which one"))) {
      try {
        addMessage(await fetchAssistantReply(message), "bot");
      } catch (error) {
        console.error("AI assistant best-match request failed:", error);
        addMessage(buildBestMatchResponse(filteredScholarships[0]), "bot");
      }
      return;
    }

    if (filteredScholarships.length > 0 && (lowered.includes("recommend") || lowered.includes("scholarship") || lowered.includes("suggest") || lowered.includes("top"))) {
      try {
        addMessage(await fetchAssistantReply(message), "bot");
      } catch (error) {
        console.error("AI assistant recommendation request failed:", error);
        addMessage(buildTopMatchesResponse(filteredScholarships), "bot");
      }
      return;
    }

    if (filteredScholarships.length > 0 && !selectedScholarship) {
      try {
        addMessage(await fetchAssistantReply(message), "bot");
      } catch (error) {
        console.error("AI assistant shortlist request failed:", error);
        addMessage(
          "I have already shortlisted scholarships for you. Ask me for the best match, compare the top options, open the details of one scholarship, or choose one for application help.",
          "bot"
        );
      }
      return;
    }

    try {
      addMessage(await fetchAssistantReply(message), "bot");
    } catch (error) {
      console.error("AI assistant general request failed:", error);
      addMessage(
        "I can chat with you about scholarships, explain eligibility, recommend the best matches, and help with applications. Try asking: Which scholarship is best for me?",
        "bot"
      );
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");

    if (currentQuestion) {
      handleQuestionAnswer(userMessage);
      return;
    }

    addMessage(userMessage, "user");
    simulateTyping(() => handleGeneralChat(userMessage));
  };

  const restartInterview = () => {
    const defaultAnswers = getProfileAnswers(userProfile);
    setAnswers(defaultAnswers);
    setQuestionIndex(0);
    setFilteredScholarships([]);
    setSelectedScholarship(null);
    setSelectedSummary("");
    setSelectedGuidance("");
    setSelectedDocuments("");
    setNeedsQuestionFlow(true);
    setRecommendationAnchorId(null);

    addMessage("Let's start again and refine your scholarship shortlist.", "bot");
    askQuestion(0, defaultAnswers);
  };

  const beforeRecommendationMessages = recommendationAnchorId
    ? messages.filter((message) => message.id < recommendationAnchorId)
    : messages;

  const afterRecommendationMessages = recommendationAnchorId
    ? messages.filter((message) => message.id >= recommendationAnchorId)
    : [];

  const selectScholarship = (scholarship) => {
    setSelectedScholarship(scholarship);
    setSelectedSummary(buildSelectionSummary(scholarship));
    setSelectedGuidance(buildApplicationGuidance(scholarship, answers));
    setSelectedDocuments(buildDocumentsResponse(scholarship, answers));
  };

  const renderQuickActions = () => {
    if (!profileComplete) {
      return (
        <button onClick={() => navigate("/profile")} className="quick-btn primary">
          Complete Profile
        </button>
      );
    }

    if (currentQuestion?.type === "choice") {
      return currentQuestion.options.map((option) => {
        const label = typeof option === "string" ? option : option.label;
        const value = typeof option === "string" ? option : option.value;
        return (
          <button
            key={value}
            onClick={() => handleQuestionAnswer(value, label)}
            className="quick-btn"
          >
            {label}
          </button>
        );
      });
    }

    if (currentQuestion?.type === "number") {
      const suggestedValue = answers[currentQuestion.id];
      return (
        <>
          {suggestedValue ? (
            <button
              onClick={() =>
                handleQuestionAnswer(
                  suggestedValue,
                  currentQuestion.id === "familyIncome"
                    ? `Use profile income: Rs. ${toNumber(suggestedValue).toLocaleString("en-IN")}`
                    : `Use profile percentage: ${suggestedValue}%`
                )
              }
              className="quick-btn"
            >
              Use Profile Value
            </button>
          ) : null}
          <button onClick={restartInterview} className="quick-btn">
            Restart Questions
          </button>
        </>
      );
    }

    if (selectedScholarship) {
      return (
        <>
          <button onClick={() => setSelectedGuidance(buildApplicationGuidance(selectedScholarship, answers))} className="quick-btn">
            Application Steps
          </button>
          <button onClick={() => setSelectedDocuments(buildDocumentsResponse(selectedScholarship, answers))} className="quick-btn">
            Documents
          </button>
          <button onClick={() => window.open(selectedScholarship.applyLink || "https://scholarships.gov.in/", "_blank")} className="quick-btn primary">
            Open Portal
          </button>
          <button onClick={restartInterview} className="quick-btn">
            Find Another
          </button>
        </>
      );
    }

    return (
      <>
        {filteredScholarships.length > 0 ? (
          <>
            <button onClick={() => addMessage(buildBestMatchResponse(filteredScholarships[0]), "bot")} className="quick-btn">
              Best Match
            </button>
            <button
              onClick={() =>
                addMessage(
                  [
                    "Here is a quick comparison of your top options:",
                    "",
                    ...filteredScholarships.slice(0, 3).map((scholarship, index) => `${index + 1}. ${scholarship.name}: ${scholarship.reasons.slice(0, 2).join("; ")}`),
                    "",
                    "Choose one when you are ready, and I will guide you through the application steps.",
                  ].join("\n"),
                  "bot"
                )
              }
              className="quick-btn"
            >
              Compare
            </button>
            <button onClick={() => addMessage(buildTopMatchesResponse(filteredScholarships), "bot")} className="quick-btn">
              Top 3
            </button>
          </>
        ) : null}
        <button onClick={restartInterview} className="quick-btn">
          Restart Questions
        </button>
      </>
    );
  };

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", paddingTop: "70px" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
        <div className="chatbot-container" style={{ maxWidth: "760px" }}>
          <div className="chatbot-header">
            <div className="bot-avatar">AI</div>
            <div>
              <h3>Scholarship Assistant</h3>
              <p>Chat with me about scholarships, eligibility, and application help</p>
              <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "5px" }}>
                Connected to {scholarships.length} government scholarship options
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {beforeRecommendationMessages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
              >
                <div className="message-content" style={{ whiteSpace: "pre-wrap" }}>
                  {message.text}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {filteredScholarships.length > 0 && (
              <div className="recommendations-panel">
                <div className="recommendations-title">Recommended for you</div>
                <div className="recommendations-subtitle">
                  Showing the most suitable scholarships first based on your profile and eligibility.
                </div>
                <div className="recommendations-grid">
                  {filteredScholarships.slice(0, 4).map((scholarship, index) => (
                    <div
                      key={scholarship.name}
                      className={`recommendation-card ${index === 0 ? "top-recommendation" : ""} ${selectedScholarship?.name === scholarship.name ? "selected-recommendation" : ""}`}
                    >
                      <div className="recommendation-badge">
                        {index === 0 ? "Best Match" : scholarship.fitLabel}
                      </div>
                      <div className="recommendation-name">{scholarship.name}</div>
                      <div className="recommendation-meta">{scholarship.scheme || scholarship.provider}</div>
                      <div className="recommendation-amount">{scholarship.amount || "Amount not specified"}</div>
                      <div className="recommendation-reasons">
                        {scholarship.reasons.slice(0, 3).map((reason) => (
                          <div key={reason} className="recommendation-reason">
                            {reason}
                          </div>
                        ))}
                      </div>
                      <div className="recommendation-actions">
                        <button
                          type="button"
                          onClick={() => addMessage(buildScholarshipSummary(scholarship), "bot")}
                          className="quick-btn"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => selectScholarship(scholarship)}
                          className="quick-btn primary"
                        >
                          Choose This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedScholarship && (
                  <div className="selected-scholarship-panel">
                    <div className="selected-scholarship-title">Selected Scholarship</div>
                    <div className="selected-scholarship-name">{selectedScholarship.name}</div>
                    <div className="selected-scholarship-block" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedSummary}
                    </div>
                    <div className="selected-scholarship-subtitle">Application Steps</div>
                    <div className="selected-scholarship-block" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedGuidance}
                    </div>
                    <div className="selected-scholarship-subtitle">Documents</div>
                    <div className="selected-scholarship-block" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedDocuments}
                    </div>
                  </div>
                )}
              </div>
            )}

            {afterRecommendationMessages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
              >
                <div className="message-content" style={{ whiteSpace: "pre-wrap" }}>
                  {message.text}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message bot-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <div className="quick-actions">
              {renderQuickActions()}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={currentQuestion ? `Type your ${currentQuestion.label}...` : "Ask about scholarships, eligibility, or applications..."}
                className="message-input"
              />
              <button
                onClick={handleSendMessage}
                className="send-button"
                disabled={!inputMessage.trim()}
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;

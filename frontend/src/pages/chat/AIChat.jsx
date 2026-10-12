import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import robo from "../../image/robo.png";

export default function AIChat() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm TechBoard AI. I can help you find jobs, improve your resume, prepare for interviews, identify missing skills, and plan your career.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* =====================================================
     LOAD USER
  ===================================================== */

  useEffect(() => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("user")
      );

      if (!savedUser || savedUser.role !== "user") {
        navigate("/login");
        return;
      }

      setUser(savedUser);
    } catch (error) {
      console.error("USER LOAD ERROR:", error);
      navigate("/login");
    }
  }, [navigate]);

  /* =====================================================
     AUTO SCROLL
  ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /* =====================================================
     FOCUS INPUT
  ===================================================== */

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [loading]);

  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  const sendMessage = async (customMessage = null) => {
    const message = (
      customMessage !== null ? customMessage : input
    ).trim();

    if (!message || loading) return;

    setInput("");

    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setLoading(true);

    try {
      const history = messages
        .slice(-10)
        .map((item) => ({
          role: item.role,
          content: item.content,
        }));

      const response = await API.post("/ai/chat", {
        message,
        history,
      });

      console.log("AI RESPONSE:", response.data);

      if (response.data?.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.data.message,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "AI returned an empty response. Please try again.",
          },
        ]);
      }
    } catch (error) {
      console.error(
        "AI CHAT ERROR:",
        error.response?.data || error.message
      );

      let errorMessage =
        "Something went wrong. Please try again.";

      if (error.response?.status === 429) {
        errorMessage =
          error.response?.data?.message ||
          "AI request limit reached. Please try again later.";
      } else if (error.response?.status === 503) {
        errorMessage =
          "AI service is temporarily busy. Please try again in a few seconds.";
      } else if (error.response?.data?.message) {
        errorMessage =
          error.response.data.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FORM SUBMIT
  ===================================================== */

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  /* =====================================================
     ENTER KEY
  ===================================================== */

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* =====================================================
     QUICK QUESTIONS
  ===================================================== */

  const quickQuestions = [
    {
      icon: "bi-search",
      title: "Find matching jobs",
      text: "Find jobs matching my skills",
    },
    {
      icon: "bi-graph-up-arrow",
      title: "Improve my skills",
      text: "What skills should I improve?",
    },
    {
      icon: "bi-person-video3",
      title: "Interview preparation",
      text: "Help me prepare for an interview",
    },
    {
      icon: "bi-map",
      title: "Career roadmap",
      text: "Create a career roadmap for me",
    },
  ];

  /* =====================================================
     CLEAR CHAT
  ===================================================== */

  const clearChat = () => {
    if (loading) return;

    setMessages([
      {
        role: "assistant",
        content:
          "Hi! 👋 I'm TechBoard AI. How can I help you with your career today?",
      },
    ]);

    setInput("");
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="ai-chat-page">

      <div className="ai-chat-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="ai-chat-header">

          <div className="ai-header-left">

            <button
              className="ai-back-button"
              type="button"
              onClick={() => navigate("/dashboard")}
              title="Back to dashboard"
            >
              <i className="bi bi-arrow-left"></i>
            </button>

            <div className="ai-header-avatar">
              <img
                src={robo}
                alt="TechBoard AI"
              />

              <span className="ai-header-status"></span>
            </div>

            <div className="ai-header-info">

              <div className="ai-title-row">
                <h2>TechBoard AI</h2>

                <span className="ai-beta-badge">
                  AI
                </span>
              </div>

              <div className="ai-subtitle">
                <span className="ai-online-dot"></span>
                Career Assistant
              </div>

            </div>

          </div>

          <div className="ai-header-actions">

            <button
              type="button"
              className="ai-clear-button"
              onClick={clearChat}
              disabled={
                loading || messages.length === 1
              }
              title="Clear conversation"
            >
              <i className="bi bi-trash3"></i>
              <span>Clear chat</span>
            </button>

          </div>

        </header>


        {/* =================================================
            CHAT BODY
        ================================================= */}

        <main className="ai-chat-body">

          <div className="ai-messages">

            {messages.map((message, index) => (

              <div
                key={index}
                className={`ai-message-row ${
                  message.role === "user"
                    ? "user-row"
                    : "ai-row"
                }`}
              >

                {/* AI AVATAR */}

                {message.role === "assistant" && (
                  <div className="ai-small-avatar">
                    <img
                      src={robo}
                      alt=""
                    />
                  </div>
                )}


                {/* MESSAGE */}

                <div className="ai-message-wrapper">

                  {message.role === "assistant" && (
                    <div className="ai-message-meta">
                      <span className="ai-message-label">
                        TechBoard AI
                      </span>

                      {message.error && (
                        <span className="ai-error-label">
                          <i className="bi bi-exclamation-circle"></i>
                          Service notice
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`ai-message ${
                      message.role === "user"
                        ? "user-message"
                        : "assistant-message"
                    } ${
                      message.error
                        ? "ai-error-message"
                        : ""
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.role === "user" && (
                    <span className="ai-message-label user-label">
                      You
                    </span>
                  )}

                </div>

              </div>

            ))}


            {/* =================================================
                TYPING
            ================================================= */}

            {loading && (

              <div className="ai-message-row ai-row">

                <div className="ai-small-avatar">
                  <img
                    src={robo}
                    alt=""
                  />
                </div>

                <div className="ai-message-wrapper">

                  <span className="ai-message-label">
                    TechBoard AI
                  </span>

                  <div className="ai-message assistant-message typing">

                    <span></span>
                    <span></span>
                    <span></span>

                  </div>

                </div>

              </div>

            )}

            <div ref={messagesEndRef}></div>

          </div>


          {/* =================================================
              QUICK QUESTIONS
          ================================================= */}

          {messages.length === 1 && !loading && (

            <div className="ai-quick-section">

              <div className="ai-quick-heading">

                <div className="ai-sparkle-icon">
                  <i className="bi bi-stars"></i>
                </div>

                <div>
                  <h3>
                    How can I help you?
                  </h3>

                  <p>
                    Start with one of these popular
                    career topics
                  </p>
                </div>

              </div>


              <div className="ai-quick-buttons">

                {quickQuestions.map(
                  (question, index) => (

                    <button
                      key={index}
                      type="button"
                      className="ai-quick-card"
                      onClick={() =>
                        sendMessage(
                          question.text
                        )
                      }
                    >

                      <div className="ai-quick-icon">
                        <i
                          className={`bi ${question.icon}`}
                        ></i>
                      </div>

                      <div className="ai-quick-content">

                        <strong>
                          {question.title}
                        </strong>

                        <span>
                          {question.text}
                        </span>

                      </div>

                      <div className="ai-quick-arrow">
                        <i className="bi bi-arrow-up-right"></i>
                      </div>

                    </button>

                  )
                )}

              </div>

            </div>

          )}

        </main>


        {/* =================================================
            INPUT AREA
        ================================================= */}

        <div className="ai-input-wrapper">

          <form
            className="ai-input-area"
            onSubmit={handleSubmit}
          >

            <div className="ai-input-icon">
              <i className="bi bi-stars"></i>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask TechBoard AI anything about your career..."
              disabled={loading}
              autoComplete="off"
            />

            <button
              type="submit"
              className="ai-send-button"
              disabled={
                !input.trim() || loading
              }
              title="Send message"
            >
              {loading ? (
                <i className="bi bi-hourglass-split"></i>
              ) : (
                <i className="bi bi-arrow-up"></i>
              )}
            </button>

          </form>

          <div className="ai-input-footer">

            <span>
              <i className="bi bi-shield-check"></i>
              Private & secure
            </span>

            <span>
              Press <strong>Enter</strong> to send
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}
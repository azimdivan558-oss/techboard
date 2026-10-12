import {
  useEffect,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";
import API from "../../services/api";

const SOCKET_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export default function Chat() {
  const storedUser =
    JSON.parse(localStorage.getItem("user")) || null;

  const userId =
    storedUser?._id ||
    storedUser?.id;

  const [user] = useState(storedUser);

  const [contacts, setContacts] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loadingContacts, setLoadingContacts] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  // Online / Offline / Typing
  const [onlineUsers, setOnlineUsers] =
    useState({});

  const [typingUsers, setTypingUsers] =
    useState({});

  const messagesEndRef =
    useRef(null);

  const socketRef =
    useRef(null);

  const selectedUserRef =
    useRef(null);

  const typingTimeoutRef =
    useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  /* ==========================================
     LOAD CONTACTS
  ========================================== */

  useEffect(() => {
    if (!userId) return;

    const loadContacts = async () => {
      try {
        setLoadingContacts(true);

        const response =
          await API.get("/chat/contacts");

        setContacts(
          response.data?.contacts || []
        );
      } catch (error) {
        console.error(
          "CONTACT ERROR:",
          error
        );
      } finally {
        setLoadingContacts(false);
      }
    };

    loadContacts();
  }, [userId]);

  /* ==========================================
     SOCKET CONNECTION
  ========================================== */

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      socket.emit("userOnline", userId);

      const currentSelectedUser =
        selectedUserRef.current;

      if (currentSelectedUser?.userId) {
        socket.emit("joinRoom", {
          userId,
          otherUserId:
            currentSelectedUser.userId,
        });
      }
    });

    socket.on("onlineUsers", (users) => {
      const onlineMap = {};

      users.forEach((id) => {
        onlineMap[String(id)] = {
          online: true,
        };
      });

      setOnlineUsers(onlineMap);
    });

    socket.on(
      "userStatus",
      ({
        userId: changedUserId,
        online,
        lastSeen,
      }) => {
        const id = String(changedUserId);

        setOnlineUsers((prev) => ({
          ...prev,
          [id]: {
            online,
            lastSeen:
              lastSeen ||
              prev[id]?.lastSeen,
          },
        }));
      }
    );

    socket.on(
      "userTyping",
      ({
        userId: typingUserId,
        typing,
      }) => {
        const id = String(typingUserId);

        setTypingUsers((prev) => ({
          ...prev,
          [id]: typing,
        }));
      }
    );

    socket.on(
      "receiveMessage",
      (message) => {
        const senderId =
          message.sender?._id;

        const receiverId =
          message.receiver?._id;

        if (
          String(senderId) !== String(userId) &&
          String(receiverId) !== String(userId)
        ) {
          return;
        }

        const currentSelectedUser =
          selectedUserRef.current;

        if (!currentSelectedUser) return;

        const selectedId =
          currentSelectedUser.userId;

        if (
          String(senderId) !== String(selectedId) &&
          String(receiverId) !== String(selectedId)
        ) {
          return;
        }

        setMessages((prev) => {
          const exists = prev.some(
            (item) =>
              item._id === message._id
          );

          if (exists) return prev;

          return [...prev, message];
        });
      }
    );

    socket.on(
      "messageDeleted",
      (messageId) => {
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message._id !== messageId
          )
        );
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "Socket disconnected"
      );
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  /* ==========================================
     AUTO SCROLL
  ========================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* ==========================================
     SELECT CONTACT
  ========================================== */

  const selectUser = async (contact) => {
    if (!userId) return;

    setSelectedUser(contact);
    selectedUserRef.current = contact;

    setMessages([]);
    setLoadingMessages(true);

    try {
      const response =
        await API.get(
          `/chat/messages/${contact.userId}`
        );

      setMessages(
        response.data?.messages || []
      );

      socketRef.current?.emit(
        "joinRoom",
        {
          userId,
          otherUserId:
            contact.userId,
        }
      );
    } catch (error) {
      console.error(
        "MESSAGE LOAD ERROR:",
        error
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  /* ==========================================
     TYPING
  ========================================== */

  const handleTyping = (event) => {
    const value = event.target.value;

    setText(value);

    if (
      !selectedUser ||
      !socketRef.current ||
      !userId
    ) {
      return;
    }

    if (!value.trim()) {
      socketRef.current.emit(
        "stopTyping",
        {
          senderId: userId,
          receiverId:
            selectedUser.userId,
        }
      );

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      return;
    }

    socketRef.current.emit(
      "typing",
      {
        senderId: userId,
        receiverId:
          selectedUser.userId,
      }
    );

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        socketRef.current?.emit(
          "stopTyping",
          {
            senderId: userId,
            receiverId:
              selectedUser.userId,
          }
        );
      }, 800);
  };

  /* ==========================================
     SEND MESSAGE
  ========================================== */

  const sendMessage = () => {
    const cleanMessage =
      text.trim();

    if (
      !cleanMessage ||
      !selectedUser ||
      !userId ||
      !socketRef.current ||
      !socketRef.current.connected ||
      sending
    ) {
      return;
    }

    setSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    socketRef.current.emit(
      "stopTyping",
      {
        senderId: userId,
        receiverId:
          selectedUser.userId,
      }
    );

    socketRef.current.emit(
      "sendMessage",
      {
        senderId: userId,
        receiverId:
          selectedUser.userId,
        message: cleanMessage,
      }
    );

    setText("");
    setSending(false);
  };

  /* ==========================================
     DELETE MESSAGE
  ========================================== */

  const deleteMessage = (
    messageId
  ) => {
    if (!messageId || !userId) {
      return;
    }

    socketRef.current?.emit(
      "deleteMessage",
      {
        messageId,
        userId,
      }
    );
  };

  /* ==========================================
     ENTER TO SEND
  ========================================== */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  /* ==========================================
     SEARCH CONTACTS
  ========================================== */

  const filteredContacts =
    contacts.filter((contact) => {
      const query =
        search.toLowerCase().trim();

      if (!query) return true;

      return (
        contact.name
          ?.toLowerCase()
          .includes(query) ||
        contact.email
          ?.toLowerCase()
          .includes(query) ||
        contact.jobTitle
          ?.toLowerCase()
          .includes(query)
      );
    });

  /* ==========================================
     FORMAT TIME
  ========================================== */

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(
      date
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ==========================================
     FORMAT LAST SEEN
  ========================================== */

  const formatLastSeen = (date) => {
    if (!date) return "";

    const lastSeen =
      new Date(date);

    const now = new Date();

    const diff =
      now.getTime() -
      lastSeen.getTime();

    const minutes = Math.floor(
      diff / (1000 * 60)
    );

    if (minutes < 1) {
      return "just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    return lastSeen.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ==========================================
     AVATAR LETTER
  ========================================== */

  const getInitial = (name) => {
    return (
      name
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() || "U"
    );
  };

  const selectedStatus =
    selectedUser
      ? onlineUsers[
          String(selectedUser.userId)
        ]
      : null;

  const selectedIsOnline =
    selectedStatus?.online === true;

  return (
    <main className="professional-chat-page">

      <div className="professional-chat">

        <aside className="professional-chat-sidebar">

          <div className="chat-sidebar-top">

            <div>
              <h2>Messages</h2>

              <span>
                {user?.role === "company"
                  ? "Candidate conversations"
                  : "Recruiter conversations"}
              </span>
            </div>

            <div className="chat-message-icon">
              <i className="bi bi-chat-dots-fill"></i>
            </div>

          </div>

          <div className="chat-search">

            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                type="button"
              >
                <i className="bi bi-x"></i>
              </button>
            )}

          </div>

          <div className="professional-contacts">

            {loadingContacts ? (
              <div className="chat-loading">

                <div className="chat-spinner"></div>

                <span>
                  Loading conversations...
                </span>

              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="professional-empty">

                <div className="empty-chat-icon">
                  <i className="bi bi-chat-square-text"></i>
                </div>

                <h4>
                  No conversations
                </h4>

                <p>
                  {search
                    ? "No matching conversations found."
                    : "Your conversations will appear here."}
                </p>

              </div>
            ) : (
              filteredContacts.map(
                (contact) => {

                  const active =
                    selectedUser?.userId ===
                    contact.userId;

                  const isOnline =
                    onlineUsers[
                      String(contact.userId)
                    ]?.online === true;

                  return (
                    <button
                      type="button"
                      key={contact.userId}
                      className={`professional-contact ${
                        active
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectUser(contact)
                      }
                    >

                      <div className="contact-avatar-wrapper">

                        <div className="professional-avatar">
                          {getInitial(
                            contact.name
                          )}
                        </div>

                        <span
                          className={`online-dot ${
                            isOnline
                              ? "online"
                              : "offline"
                          }`}
                        ></span>

                      </div>

                      <div className="contact-details">

                        <div className="contact-name-row">

                          <strong>
                            {contact.name}
                          </strong>

                        </div>

                        <span>
                          {contact.jobTitle ||
                            "Conversation"}
                        </span>

                      </div>

                    </button>
                  );
                }
              )
            )}

          </div>

        </aside>

        <section className="professional-chat-window">

          {!selectedUser ? (

            <div className="professional-chat-empty">

              <div className="large-chat-icon">
                <i className="bi bi-chat-square-dots-fill"></i>
              </div>

              <h2>
                Your conversations
              </h2>

              <p>
                Select a conversation from the
                sidebar to start messaging.
              </p>

              <div className="chat-empty-tip">
                <i className="bi bi-shield-check"></i>
                <span>
                  Your messages are securely
                  stored.
                </span>
              </div>

            </div>
          ) : (
            <>

              <header className="professional-chat-header">

                <div className="chat-user-info">

                  <div className="header-avatar-wrapper">

                    <div className="professional-avatar large">
                      {getInitial(
                        selectedUser.name
                      )}
                    </div>

                    <span
                      className={`online-dot ${
                        selectedIsOnline
                          ? "online"
                          : "offline"
                      }`}
                    ></span>

                  </div>

                  <div>

                    <h3>
                      {selectedUser.name}
                    </h3>

                    <div className="chat-status">

                      <span
                        className={`status-dot ${
                          selectedIsOnline
                            ? "online"
                            : "offline"
                        }`}
                      ></span>

                      <span>
                        {selectedIsOnline
                          ? "Online"
                          : selectedStatus?.lastSeen
                          ? `Last seen ${formatLastSeen(
                              selectedStatus.lastSeen
                            )}`
                          : "Offline"}
                      </span>

                    </div>

                  </div>

                </div>

                <div className="chat-header-actions">

                  <button
                    type="button"
                    title="Conversation information"
                  >
                    <i className="bi bi-info-circle"></i>
                  </button>

                </div>

              </header>

              <div className="professional-messages">

                <div className="messages-inner">

                  <div className="conversation-start">

                    <div className="conversation-line"></div>

                    <span>
                      Conversation started
                    </span>

                    <div className="conversation-line"></div>

                  </div>

                  {loadingMessages ? (
                    <div className="messages-loading">

                      <div className="chat-spinner"></div>

                      <span>
                        Loading messages...
                      </span>

                    </div>
                  ) : messages.length === 0 ? (
                    <div className="no-messages">

                      <div className="no-message-icon">
                        <i className="bi bi-chat-heart"></i>
                      </div>

                      <h4>
                        Start the conversation
                      </h4>

                      <p>
                        Send a message to{" "}
                        {selectedUser.name}.
                      </p>

                    </div>
                  ) : (
                    messages.map(
                      (message) => {

                        const isMine =
                          String(
                            message.sender?._id
                          ) ===
                          String(userId);

                        return (
                          <div
                            key={
                              message._id
                            }
                            className={`professional-message-row ${
                              isMine
                                ? "sent"
                                : "received"
                            }`}
                          >

                            {!isMine && (
                              <div className="message-avatar">
                                {getInitial(
                                  selectedUser.name
                                )}
                              </div>
                            )}

                            <div
                              className={`professional-message-group ${
                                isMine
                                  ? "mine"
                                  : ""
                              }`}
                            >

                              <div
                                className={`professional-message ${
                                  isMine
                                    ? "sent-message"
                                    : "received-message"
                                }`}
                              >
                                {message.message}
                              </div>

                              <div className="message-meta">

                                <span>
                                  {formatTime(
                                    message.createdAt
                                  )}
                                </span>

                                {isMine && (
                                  <>
                                    <span>
                                      •
                                    </span>

                                    <span className="message-status">
                                      <i className="bi bi-check2-all"></i>
                                    </span>

                                    <button
                                      type="button"
                                      className="message-delete"
                                      title="Delete message"
                                      onClick={() =>
                                        deleteMessage(
                                          message._id
                                        )
                                      }
                                    >
                                      <i className="bi bi-trash3"></i>
                                    </button>
                                  </>
                                )}

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )
                  )}

                  {selectedUser &&
                    typingUsers[
                      String(selectedUser.userId)
                    ] && (
                      <div className="typing-indicator">

                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>

                        <span>
                          {selectedUser.name} is typing...
                        </span>

                      </div>
                    )}

                  <div
                    ref={messagesEndRef}
                  />

                </div>

              </div>

              <div className="professional-input-section">

                <div className="professional-input">

                  <textarea
                    value={text}
                    onChange={handleTyping}
                    onKeyDown={
                      handleKeyDown
                    }
                    placeholder="Write a message..."
                    rows={1}
                  />

                  <button
                    type="button"
                    className="professional-send"
                    onClick={sendMessage}
                    disabled={
                      !text.trim() ||
                      sending
                    }
                    title="Send message"
                  >
                    {sending ? (
                      <span className="send-loader"></span>
                    ) : (
                      <i className="bi bi-send-fill"></i>
                    )}
                  </button>

                </div>

                <div className="input-hint">
                  Press Enter to send • Shift + Enter
                  for a new line
                </div>

              </div>

            </>
          )}

        </section>

      </div>

    </main>
  );
}

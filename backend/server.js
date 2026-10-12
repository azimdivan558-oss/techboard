import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import featureRoutes from "./routes/featureRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import Message from "./models/Message.js";
import aiRoutes from "./routes/aiRoutes.js";
import recruiterCopilotRoutes from "./routes/recruiterCopilotRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { expireMemberships } from "./utils/membershipExpiry.js";



connectDB();

// Automatic membership expiry/downgrade.
// Runs once after startup and then every 5 minutes while the API is running.
const runMembershipExpiry = async () => {
  try {
    await expireMemberships();
  } catch (error) {
    console.error("MEMBERSHIP EXPIRY JOB ERROR:", error);
  }
};

setTimeout(runMembershipExpiry, 5000);
setInterval(runMembershipExpiry, 5 * 60 * 1000);

const app = express();

/*
========================================
HTTP SERVER
========================================
*/

const server = http.createServer(app);

/*
========================================
SOCKET.IO
========================================
*/

// Allowed frontend origins: FRONTEND_URL + CORS_ORIGINS (comma separated) + local dev.
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
]
  .map((o) => (o || "").trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  // allow non-browser tools (no Origin header) and whitelisted sites
  if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    return callback(null, true);
  }
  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  },
});

/*
========================================
ONLINE USERS
========================================

userId -> socketId
========================================
*/

const onlineUsers = new Map();

/*
========================================
MIDDLEWARE
========================================
*/

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Cashfree webhook must be registered before the global JSON parser so rawBody is preserved.
app.use("/api/webhooks", webhookRoutes);

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true }));


app.use(morgan("dev"));

/*
========================================
API
========================================
*/

app.get("/", (req, res) => {
  res.json({
    message: "TechBoard MERN API Running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/jobs", jobRoutes);

app.use("/api/company", companyRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/features", featureRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/ai", aiRoutes);
app.use("/api/recruiter-copilot", recruiterCopilotRoutes);

app.use(
  "/api/membership",
  membershipRoutes
);

app.use("/api/reports", reportRoutes);

app.use("/api/payments", paymentRoutes);
/*
========================================
SOCKET CONNECTION
========================================
*/

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  /*
  ========================================
  USER ONLINE
  ========================================
  */

  socket.on("userOnline", (userId) => {
  console.log("📡 userOnline EVENT RECEIVED:", userId);

  if (!userId) {
    console.log("❌ userOnline received without userId");
    return;
  }

  const userIdString = userId.toString();

  onlineUsers.set(userIdString, socket.id);
  socket.userId = userIdString;

  console.log(`🟢 User ${userIdString} is ONLINE`);

  socket.emit(
    "onlineUsers",
    Array.from(onlineUsers.keys())
  );

  socket.broadcast.emit("userStatus", {
    userId: userIdString,
    online: true,
  });

    /*
    Send current online users to this user
    */

    socket.emit(
      "onlineUsers",
      Array.from(onlineUsers.keys())
    );

    /*
    Tell all other users that this user is online
    */

    socket.broadcast.emit("userStatus", {
      userId: userIdString,
      online: true,
    });
  });

  /*
  ========================================
  JOIN CHAT ROOM
  ========================================
  */

  socket.on(
    "joinRoom",
    ({ userId, otherUserId }) => {
      if (!userId || !otherUserId) return;

      const roomId = [
        userId.toString(),
        otherUserId.toString(),
      ]
        .sort()
        .join("_");

      socket.join(roomId);

      console.log(
        `User ${userId} joined room ${roomId}`
      );
    }
  );

  /*
  ========================================
  TYPING START
  ========================================
  */

  socket.on(
    "typing",
    ({ senderId, receiverId }) => {
      if (!senderId || !receiverId) return;

      const receiverSocketId =
        onlineUsers.get(
          receiverId.toString()
        );

      if (!receiverSocketId) return;

      io.to(receiverSocketId).emit(
        "userTyping",
        {
          userId: senderId.toString(),
          typing: true,
        }
      );
    }
  );

  /*
  ========================================
  TYPING STOP
  ========================================
  */

  socket.on(
    "stopTyping",
    ({ senderId, receiverId }) => {
      if (!senderId || !receiverId) return;

      const receiverSocketId =
        onlineUsers.get(
          receiverId.toString()
        );

      if (!receiverSocketId) return;

      io.to(receiverSocketId).emit(
        "userTyping",
        {
          userId: senderId.toString(),
          typing: false,
        }
      );
    }
  );

  /*
  ========================================
  SEND MESSAGE
  ========================================
  */

  socket.on("sendMessage", async (data) => {
    try {
      const {
        senderId,
        receiverId,
        message,
      } = data;

      if (
        !senderId ||
        !receiverId ||
        !message?.trim()
      ) {
        return;
      }

      const roomId = [
        senderId.toString(),
        receiverId.toString(),
      ]
        .sort()
        .join("_");

      const newMessage =
        await Message.create({
          roomId,
          sender: senderId,
          receiver: receiverId,
          message: message.trim(),
        });

      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "name companyName role"
          )
          .populate(
            "receiver",
            "name companyName role"
          );

      /*
      Send message to both users
      */

      io.to(roomId).emit(
        "receiveMessage",
        populatedMessage
      );
    } catch (error) {
      console.error(
        "SOCKET MESSAGE ERROR:",
        error
      );
    }
  });

  /*
  ========================================
  DELETE MESSAGE
  ========================================
  */

  socket.on(
    "deleteMessage",
    async (data) => {
      try {
        const {
          messageId,
          userId,
        } = data;

        const message =
          await Message.findOne({
            _id: messageId,
            sender: userId,
          });

        if (!message) return;

        const roomId = message.roomId;

        await message.deleteOne();

        /*
        Notify both users
        */

        io.to(roomId).emit(
          "messageDeleted",
          messageId
        );
      } catch (error) {
        console.error(
          "DELETE SOCKET MESSAGE ERROR:",
          error
        );
      }
    }
  );

  /*
  ========================================
  DISCONNECT
  ========================================
  */

  socket.on("disconnect", () => {
    const userId = socket.userId;

    if (userId) {
      /*
      Remove user only if this socket
      is still the registered socket
      */

      if (
        onlineUsers.get(userId) ===
        socket.id
      ) {
        onlineUsers.delete(userId);

        console.log(
          `🔴 User ${userId} is OFFLINE`
        );

        /*
        Tell other users
        */

        socket.broadcast.emit(
          "userStatus",
          {
            userId,
            online: false,
            lastSeen: new Date(),
          }
        );
      }
    }

    console.log(
      "🔴 Socket disconnected:",
      socket.id
    );
  });
});

/*
========================================
START SERVER
========================================
*/

app.get("/", (req, res) => res.json({ success: true, service: "TechBoard API" }));
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server Running on ${PORT}`
  );
});
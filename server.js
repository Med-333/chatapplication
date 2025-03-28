const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
const sessionMiddleware = session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://localhost:27017/chatapp",
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
});

app.use(sessionMiddleware);

// Routes
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/chat.html");
  } else {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
});

// connection database
mongoose
  .connect("mongodb://localhost:27017/chatapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Socket.io
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.userId) {
    next();
  } else {
    next(new Error("Unauthorized"));
  }
});

// Available chat rooms
const CHAT_ROOMS = ["general", "Math", "Physics", "informatique"];

io.on("connection", (socket) => {
  const userId = socket.request.session.userId;
  const username = socket.request.session.username;

  console.log(`User connected: ${username} (${userId})`);

  let currentRoom = "general"; // Default room

  // Join the default room
  socket.join(currentRoom);

  // Load previous messages for the default room
  Message.find({ room: currentRoom })
    .sort({ createdAt: -1 })
    .limit(50)
    .then((messages) => {
      socket.emit("previous-messages", messages.reverse());
    })
    .catch((err) => console.error("Error loading messages:", err));

  // Send available rooms to the client
  socket.emit("available-rooms", CHAT_ROOMS);

  // Join a room
  socket.on("join-room", (room) => {
    if (CHAT_ROOMS.includes(room)) {
      socket.leave(currentRoom);
      socket.join(room);
      currentRoom = room;

      // Notify the room that a new user joined
      socket.to(room).emit("user-joined", username);

      // Load previous messages for the new room
      Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(50)
        .then((messages) => {
          socket.emit("previous-messages", messages.reverse());
        })
        .catch((err) => console.error("Error loading messages:", err));
    }
  });

  // New message
  socket.on("send-message", (messageText) => {
    const messageData = {
      userId,
      username,
      room: currentRoom,
      text: messageText,
      createdAt: new Date(),
    };

    // Save message to database
    const message = new Message(messageData);
    message
      .save()
      .then((savedMessage) => {
        // Broadcast to everyone in the room including sender
        io.to(currentRoom).emit("new-message", savedMessage);
      })
      .catch((err) => console.error("Error saving message:", err));
  });

  // User disconnected
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${username} (${userId})`);
    socket.to(currentRoom).emit("user-left", username);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

document.addEventListener("DOMContentLoaded", () => {
  const currentUserElement = document.getElementById("current-user");
  const logoutBtn = document.getElementById("logout-btn");
  const roomsList = document.getElementById("rooms-list");
  const roomNameElement = document.getElementById("room-name");
  const messagesContainer = document.getElementById("messages");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-text");

  // Check if user is authenticated
  fetch("/auth/status")
    .then((response) => response.json())
    .then((data) => {
      if (!data.isAuthenticated) {
        window.location.href = "/index.html";
        return;
      }

      currentUserElement.textContent = data.username;

      // Initialize Socket.io connection
      initializeSocket();
    })
    .catch((error) => {
      console.error("Error checking auth status:", error);
      window.location.href = "/index.html";
    });

  // Logout functionality
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        window.location.href = "/index.html";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  function initializeSocket() {
    const socket = io();

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      if (error.message === "Unauthorized") {
        window.location.href = "/index.html";
      }
    });

    // Handle available rooms
    socket.on("available-rooms", (rooms) => {
      roomsList.innerHTML = "";

      rooms.forEach((room) => {
        const li = document.createElement("li");
        li.textContent = capitalizeFirstLetter(room);
        li.dataset.room = room;

        if (room === "general") {
          li.classList.add("active");
        }

        li.addEventListener("click", () => {
          // Remove active class from all room items
          document.querySelectorAll("#rooms-list li").forEach((item) => {
            item.classList.remove("active");
          });

          // Add active class to clicked room
          li.classList.add("active");

          // Join the room
          socket.emit("join-room", room);
          roomNameElement.textContent = capitalizeFirstLetter(room);

          // Clear messages
          messagesContainer.innerHTML = "";
        });

        roomsList.appendChild(li);
      });
    });

    // Handle previous messages
    socket.on("previous-messages", (messages) => {
      messagesContainer.innerHTML = "";

      messages.forEach((message) => {
        appendMessage(message);
      });

      // Scroll to bottom
      scrollToBottom();
    });

    // Handle new message
    socket.on("new-message", (message) => {
      appendMessage(message);
      scrollToBottom();
    });

    // Handle user joined
    socket.on("user-joined", (username) => {
      const systemMessage = document.createElement("div");
      systemMessage.classList.add("system-message");
      systemMessage.textContent = `${username} joined the room`;
      messagesContainer.appendChild(systemMessage);
      scrollToBottom();
    });

    // Handle user left
    socket.on("user-left", (username) => {
      const systemMessage = document.createElement("div");
      systemMessage.classList.add("system-message");
      systemMessage.textContent = `${username} left the room`;
      messagesContainer.appendChild(systemMessage);
      scrollToBottom();
    });

    // Handle message form submission
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const messageText = messageInput.value.trim();
      if (messageText) {
        socket.emit("send-message", messageText);
        messageInput.value = "";
      }
    });
  }

  function appendMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    // Check if message is from current user
    fetch("/auth/status")
      .then((response) => response.json())
      .then((data) => {
        const isCurrentUser = message.userId === data.userId;
        messageElement.classList.add(isCurrentUser ? "sent" : "received");

        const messageHTML = `
          <div class="message-info">
            <span class="message-username">${
              isCurrentUser ? "You" : message.username
            }</span>
            <span class="message-time">${formatTime(
              new Date(message.createdAt)
            )}</span>
          </div>
          <div class="message-text">${message.text}</div>
        `;

        messageElement.innerHTML = messageHTML;
        messagesContainer.appendChild(messageElement);
      });
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});

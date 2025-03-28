document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in
  fetch("/auth/status")
    .then((response) => response.json())
    .then((data) => {
      if (data.isAuthenticated) {
        window.location.href = "/chat.html";
      }
    });

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all buttons and contents
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Login form submission
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "/chat.html";
      } else {
        loginError.textContent = data.error;
      }
    } catch (error) {
      loginError.textContent = "An error occurred. Please try again.";
    }
  });

  // Register form submission
  const registerForm = document.getElementById("register-form");
  const registerError = document.getElementById("register-error");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById(
      "register-confirm-password"
    ).value;

    // Check passwords
    if (password !== confirmPassword) {
      registerError.textContent = "Passwords do not match";
      return;
    }

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "/chat.html";
      } else {
        registerError.textContent = data.error;
      }
    } catch (error) {
      registerError.textContent = "An error occurred. Please try again.";
    }
  });
});

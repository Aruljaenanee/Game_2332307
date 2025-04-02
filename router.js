const express = require("express");
const router = express.Router();
const path = require("path");

const authenticateSession = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    res.redirect("/");
  }
};

// Handle the homepage (index.html) - No authentication needed
router.get("/game", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle the leaderboard page - Protected route
router.get("/leaderboard", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaderboard.html"));
});

// Handle the about page - Protected route
router.get("/about", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

// Handle the registration page - No authentication needed
router.get("/reg", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Handle the feedback page - Protected route
router.get("/feedback", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "feedback.html"));
});

// Handle the all feedbacks page - Protected route
router.get("/allfeedbacks", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "allfeedbacks.html"));
});

// Handle the login page - No authentication needed
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Handle the scoreboard page - Protected route
router.get("/scoreboard", authenticateSession, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "scoreboard.html"));
});

module.exports = router;

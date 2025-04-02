const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const app = express();
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const router = require("./router");
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

require("dotenv").config();
const jwt = require("jsonwebtoken");

// Use JWT_SECRET from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// user login session
app.use(
  session({
    secret: "quiz_game_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 },
  })
);

app.use(router);

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "quiz_app",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected!");
});

app.use(express.static("public"));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      (err) => {
        if (err) return res.status(500).send({ error: "Database error" });
        res.send({ message: "User registered successfully!" });
      }
    );
  } catch (error) {
    res.status(500).send({ error: "Error hashing password" });
  }
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).send({ error: "Database error" });

      if (results.length === 0) {
        return res.status(401).send({ message: "Invalid credentials!" });
      }

      const user = results[0];
      // Compare entered password with hashed password from DB
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).send({ message: "Invalid credentials!" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.user_id, username: user.username },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });

      req.session.authenticated = true;
      res.send({ message: "Login successful!" });
    }
  );
});

app.get("/quiz", async (req, res) => {
  try {
    const response = await fetch("https://marcconrad.com/uob/banana/api.php");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching quiz question:", error);
    res.status(500).send({ message: "Error fetching quiz question" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: "Failed to destroy session" });
    }
    res.clearCookie("token");
    res.send({ message: "Logged out successfully" });
  });
});

app.post("/submit-score", (req, res) => {
  const { level, score } = req.body;
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .send({ message: "No token provided, authorization denied!" });
  }

  // Verify the token and decode it
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid or expired token!" });
    }

    const username = decoded.username;

    // Insert score into the database
    db.query(
      "INSERT INTO scores (username, level, high_score) VALUES (?, ?, ?)",
      [username, level, score],
      (err, results) => {
        if (err) return res.status(500).send({ error: "Database error" });
        res.send({ message: "Score saved successfully!" });
      }
    );
  });
});

//scoreboard
app.get("/scoreboard-list", (req, res) => {
  const loggedInUser = req.session.user ? req.session.user.username : null;

  db.query(
    `
    SELECT username, level, MAX(high_score) AS high_score
    FROM scores
    GROUP BY username
    ORDER BY high_score DESC, level DESC
  `,
    (err, results) => {
      if (err) return res.status(500).send(err);

      if (loggedInUser) {
        results.forEach((player) => {
          if (player.username === loggedInUser) {
            player.isCurrentUser = true;
          }
        });
      }

      res.json(results);
    }
  );
});

// Endpoint to submit feedback
app.post("/submit-feedback", (req, res) => {
  const { feedback, rating } = req.body;
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .send({ message: "No token provided, authorization denied!" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid or expired token!" });
    }

    const username = decoded.username;

    // Check if at least one field (feedback or rating) is provided
    if (!feedback && (rating === undefined || rating === null)) {
      return res
        .status(400)
        .send({ message: "Either feedback or rating is required." });
    }

    // Insert into the database (allow null values if not provided)
    db.query(
      "INSERT INTO feedback (username, feedback, rating) VALUES (?, ?, ?)",
      [username, feedback || null, rating || null],
      (err, results) => {
        if (err) return res.status(500).send({ message: "Database error" });
        res.send({ message: "Feedback submitted successfully!" });
      }
    );
  });
});

app.get("/get-feedback", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .send({ message: "No token provided, authorization denied!" });
  }

  // Verify the token and decode it
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid or expired token!" });
    }

    const username = decoded.username;

    db.query(
      "SELECT feedback, rating FROM feedback WHERE username = ?",
      [username],
      (err, results) => {
        if (err) return res.status(500).send({ message: "Database error" });
        res.send({ feedback: results });
      }
    );
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

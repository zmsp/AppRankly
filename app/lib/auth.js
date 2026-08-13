const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { DATA_DIR } = require("./config");

const PASSWORD_FILE = path.join(DATA_DIR, ".admin_password");

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const secretFile = path.join(DATA_DIR, ".jwt_secret");
  if (fs.existsSync(secretFile)) {
    try {
      JWT_SECRET = fs.readFileSync(secretFile, "utf8").trim();
    } catch (e) {
      JWT_SECRET = "dev-insecure-secret-key-fallback";
    }
  } else {
    JWT_SECRET = "dev-insecure-secret-key-" + bcrypt.genSaltSync(10);
    try {
      fs.writeFileSync(secretFile, JWT_SECRET, "utf8");
    } catch (e) {
      JWT_SECRET = "dev-insecure-secret-key-fallback";
    }
  }
}

const isPasswordSet = () => {
  return fs.existsSync(PASSWORD_FILE) || process.env.ADMIN_PASSWORD;
};

const authenticate = (req, res, next) => {
  if (!isPasswordSet()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = {
  JWT_SECRET,
  PASSWORD_FILE,
  isPasswordSet,
  authenticate
};

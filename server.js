const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: "file-server-secret",
        resave: false,
        saveUninitialized: false,
    })
);

const USERS_DB = "./database/users.json";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync("./database")) fs.mkdirSync("./database");
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, "{}");

app.use(express.static("public"));
app.use("/files", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: process.env.MAX_SIZE || 20000000 }
});

// ====== AUTH ======
function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_DB));
}
function writeUsers(data) {
    fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 2));
}

app.post("/signup", (req, res) => {
    let users = readUsers();
    if (users[req.body.username]) {
        return res.send("Username already exist");
    }
    const hashed = bcrypt.hashSync(req.body.password, 10);
    users[req.body.username] = hashed;
    writeUsers(users);
    res.send("Signup success");
});

app.post("/login", (req, res) => {
    let users = readUsers();
    const userPass = users[req.body.username];

    if (!userPass) return res.send("Wrong username");

    if (!bcrypt.compareSync(req.body.password, userPass)) {
        return res.send("Wrong password");
    }

    req.session.user = req.body.username;
    res.redirect("/");
});

// Middleware cek login
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login.html");
    next();
}

// ====== FILE UPLOAD ======
app.post("/upload", auth, upload.array("files"), (req, res) => {
    res.redirect("/");
});

// ====== LIST FILE ======
app.get("/list", auth, (req, res) => {
    const files = fs.readdirSync(UPLOAD_DIR);
    res.json(files);
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));

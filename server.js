import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
  })
);


const db = new sqlite3.Database("database.db");


db.run(`
CREATE TABLE IF NOT EXISTS judges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judge TEXT,
  group_number TEXT,
  project_title TEXT,
  criteria1 INTEGER,
  criteria2 INTEGER,
  criteria3 INTEGER,
  criteria4 INTEGER,
  total INTEGER,
  comments TEXT
)`);


const judgeList = ["judge1", "judge2", "judge3", "judge4"];
judgeList.forEach((j) => {
  db.get("SELECT * FROM judges WHERE username=?", [j], (err, row) => {
    if (!row) {
      const passwordHash = bcrypt.hashSync("password123", 10);
      db.run("INSERT INTO judges (username, password) VALUES (?,?)", [
        j,
        passwordHash,
      ]);
    }
  });
});


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});


app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM judges WHERE username=?",
    [username],
    (err, user) => {
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.send("Invalid login <br><a href='/'>Try again</a>");
      }
      req.session.user = username;
      res.redirect("/grades");
    }
  );
});


app.get("/grades", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "/public/grades.html"));
});


app.post("/submitGrades", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const {
    group_number,
    project_title,
    c1, c2, c3, c4,
    comments,
  } = req.body;

  const total =
    Number(c1) + Number(c2) + Number(c3) + Number(c4);

  db.run(
    `INSERT INTO grades (judge, group_number, project_title,
      criteria1, criteria2, criteria3, criteria4, total, comments)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      req.session.user,
      group_number,
      project_title,
      c1, c2, c3, c4,
      total,
      comments,
    ]
  );

  res.send(`<h2>Grades Submitted!</h2>
            <a href="/grades">Submit again</a>`);
});


app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/admin.html"));
});


app.get("/admin/data", (req, res) => {
  db.all("SELECT * FROM grades", (err, rows) => {
    res.json(rows);
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

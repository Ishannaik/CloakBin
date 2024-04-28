const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const { nanoid } = require("nanoid");

require("dotenv").config();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

const Document = require("./models/Document");
const mongoose = require("mongoose");

const MONGO_URL = process.env.MONGO_URL; //Rotated the MongoDB Api password to prevent unauthorized access

mongoose.connect(MONGO_URL);

app.get("/", (req, res) => {
  const code = `Welcome to CloakBin!
Use the commands in the top right corner to 
create a new file to share with others.
This project is open sourced, if you have any issues
you can report them on the GitHub page.
https://github.com/ishannaik/CloakBin`;
  res.render("code-display", { code });
});

app.get("/new", (req, res) => {
  res.render("new");
});

app.post("/save", async (req, res) => {
  const value = req.body.value;
  // Generate a short ID, specify length if desired (e.g., 10 characters)
  const id = nanoid(10);
  try {
    const document = await Document.create({ id, value });
    res.redirect(`/${id}`);
  } catch (e) {
    res.render("new", { value });
  }
});

app.get("/:id/duplicate", async (req, res) => {
  const id = req.params.id;
  try {
    const document = await Document.findById(id);
    res.render("new", { value: document.value });
  } catch (e) {
    res.redirect(`/${id}`);
  }
});

app.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const document = await Document.findOne({ id: id });
    if (!document) {
      return res.redirect("/");
    }
    res.render("code-display", { code: document.value, id });
  } catch (e) {
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log("Server is running on port 3000");
});

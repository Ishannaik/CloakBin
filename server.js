const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
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
  const code = `🔐 Welcome to CloakBin! 🔐

  CloakBin is your ultimate platform for securely sharing and collaborating on text documents, code snippets, notes, and more—all while ensuring your anonymity. Whether you're a developer, student, or professional, CloakBin provides a seamless and intuitive interface for creating, storing, and sharing your text-based content without revealing your identity.
  
  Here's how to get started:
  
  Creating a New Document: Click on the "+" button located at the top right of your screen. This will initiate a new document where you can start typing or pasting your content.
  
  Saving Your Document: Once you've entered your content, simply press the "Save" button. CloakBin will generate a unique URL for your document, allowing you to easily share it with others.
  
  Sharing Your Document: Share the generated URL with collaborators, teammates, or friends. They'll be able to access the document anonymously, without any sign-up or login required.
  
  Editing an Existing Document: If you have the URL of an existing document, simply navigate to that URL. CloakBin will display the content of the document, and you'll have the option to duplicate and edit it as needed.
  
  CloakBin ensures the security and privacy of your content by providing anonymous sharing and editing capabilities. Plus, with automatic syntax highlighting for code snippets in various programming languages, your content is easy to read and share. For example:
  
  function greet(name) {
    return \`Hello, \${name}! Welcome to CloakBin!\`;
  }
  
  console.log(greet("User"));
  CloakBin's code highlighting feature supports multiple programming languages, automatically detecting and highlighting the syntax for each language.
  
  🛠️ CloakBin is open source and publicly hosted on GitHub at https://github.com/ishannaik/cloakbin. If you encounter any issues or have suggestions for improvements, feel free to post them on the GitHub repository. Your feedback helps us make CloakBin even better for everyone!
  
  🎉 Join the thousands of users who trust CloakBin for their secure and anonymous content sharing needs. Start using CloakBin today and experience the simplicity and power of secure text sharing. 🎉
  
  `;
  res.render("code-display", { code });
});

app.get("/new", (req, res) => {
  res.render("new");
});

app.post("/save", async (req, res) => {
  const value = req.body.value;
  try {
    const document = await Document.create({ value });
    res.redirect(`/${document.id}`);
  } catch (e) {
    res.render("new", { value });
  }
  console.log(value);
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
  const id = req.params.id;
  try {
    const document = await Document.findById(id);
    res.render("code-display", { code: document.value, id });
  } catch (e) {
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log("Server is running on port 3000");
});

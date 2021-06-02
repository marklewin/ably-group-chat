require("dotenv").config();

const express = require("express");
const Ably = require("ably");
const app = express();
const rug = require("username-generator");
const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });
const channel = ably.channels.get("chat-channel");

app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/auth", (req, res) => {
  let tokenParams = {
    ttl: 30000,
    clientId: req.query.id,
  };
  ably.auth.createTokenRequest(tokenParams, (err, tokenRequest) => {
    if (err) {
      res.status(500).send("Authentication error: " + JSON.stringify(err));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(tokenRequest));
    }
  });
});

app.get("/user", (req, res) => {
  res.json({ username: rug.generateUsername("-") });
});

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

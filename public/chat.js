let userName;
let client;
let channel;
let user;
let userColor = generateRandomColor();

let typingTimer,
  clearTypingTimer,
  timeoutVal = 1000;

async function setupConversation() {
  let response = await fetch("/user");
  let data = await response.json();
  user = data.username;
  document.getElementById(
    "username"
  ).innerHTML = `You are <span style="color:${userColor};font-weight:bold">${user}</span>`;

  client = new Ably.Realtime({ authUrl: `/auth?id=${user}` });
  client.connection.once("connected", () => {
    console.log("Connected to Ably");
  });

  channel = client.channels.get("chat-channel");
  channel.subscribe("chats", (message) => {
    let messageText = `<strong>${message.clientId}</strong>: ${message.data.messageText}`;
    appendMessage(message.data.color, messageText);
  });

  channel.presence.subscribe("enter", (member) => {
    if (member.clientId == user) return;
    let presenceText = `<em>${member.clientId} joined the conversation</em>`;
    appendMessage("black", presenceText);
    getMemberCount();
  });

  channel.presence.subscribe("leave", (member) => {
    if (member.clientId == user) return;
    let presenceText = `<em>${member.clientId} left the conversation</em>`;
    appendMessage("black", presenceText);
    getMemberCount();
  });

  channel.presence.enter();

  channel.presence.subscribe("update", function (member) {
    if (member.clientId == user) return; // don't bother letting current user know when they are typing!
    let typingText = `<em>${member.clientId} ${member.data}</em>`;
    document.getElementById("typing-indicator").innerHTML = typingText;
    if (member.data == "has stopped typing") {
      clearTypingIndicatorAfterInterval();
    }
  });
}

function setupUIListeners() {
  const form = document.getElementById("textentry");
  const textbox = document.getElementById("textbox");

  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const inputText = textbox.value;
      console.log(inputText);
      channel.publish("chats", { messageText: inputText, color: userColor });
      textbox.value = "";
    },
    false
  );

  textbox.addEventListener("keypress", handleKeyPress);
  textbox.addEventListener("keyup", handleKeyUp);
}

function appendMessage(messageColor, message) {
  let messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.innerHTML = `<p style="color:${messageColor}">${message}</p>`;

  const messageArea = document.getElementById("message-area");
  messageArea.appendChild(messageDiv);

  messageArea.scroll({
    // Scroll the message area to the bottom. */
    top: messageArea.scrollHeight,
    behavior: "smooth",
  });
}

window.addEventListener("load", () => {
  setupConversation();
  setupUIListeners();
});

function handleKeyUp(e) {
  window.clearTimeout(typingTimer); // prevent errant multiple timeouts from being generated
  typingTimer = window.setTimeout(() => {
    channel.presence.update("has stopped typing");
  }, timeoutVal);
}

function handleKeyPress(e) {
  window.clearTimeout(typingTimer);
  channel.presence.update("is typing");
}

function clearTypingIndicatorAfterInterval() {
  window.clearTimeout(clearTypingTimer);
  clearTypingTimer = window.setTimeout(() => {
    document.getElementById("typing-indicator").innerHTML = "";
  }, timeoutVal);
}

function generateRandomColor() {
  const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
  return randomColor;
}

function getMemberCount() {
  channel.presence.get((err, members) => {
    let list = "";
    let memberList = members.forEach((member) => {
      list += ` ${member.clientId}`;
      if (members.indexOf(member) !== members.length - 1) {
        list += ", ";
      }
    });
    appendMessage(
      "black",
      `There are ${members.length} members on this channel: <strong>${list}</strong>`
    );
  });
}

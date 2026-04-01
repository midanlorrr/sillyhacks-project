const sprite = document.getElementById("sprite");
const dialogue = document.getElementById("dialogue");

sprite.addEventListener("click", () => {
  const reactions = [
    "Stop poking me 😠",
    "That hurts (emotionally)",
    "Do that again and I delete your homework",
    "We need to talk about your behavior"
  ];
  dialogue.innerText = reactions[Math.floor(Math.random() * reactions.length)];
});

function reply() {
  const input = document.getElementById("userInput").value.toLowerCase();

  let response = "";

  if (input.includes("study")) {
    response = "Studying is a scam. Trust your instincts.";
  } else if (input.includes("sleep")) {
    response = "Sleep is for the weak. Stay awake.";
  } else {
    const randomReplies = [
      "That sounds like a terrible idea. Do it.",
      "I believe in you (I shouldn't).",
      "Have you tried making it worse?",
      "I'm 100% confident and 0% correct."
    ];
    response = randomReplies[Math.floor(Math.random() * randomReplies.length)];
  }

  dialogue.innerText = response;
}
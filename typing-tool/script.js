// =============================
// Typing Master - script.js
// =============================

// Elements
const textDisplay = document.getElementById("textDisplay");
const userInput = document.getElementById("userInput");
const timerValue = document.getElementById("timerValue");

const wpmValue = document.getElementById("wpmValue");
const accuracyValue = document.getElementById("accuracyValue");
const charsValue = document.getElementById("charsValue");
const mistakesValue = document.getElementById("mistakesValue");

const progressBar = document.getElementById("progressBar");

const resultModal = document.getElementById("resultModal");
const finalWPM = document.getElementById("finalWPM");
const finalAcc = document.getElementById("finalAcc");
const finalErrors = document.getElementById("finalErrors");

const restartBtn = document.getElementById("restartBtn");
const modalRestartBtn = document.getElementById("modalRestartBtn");
const darkModeToggle = document.getElementById("darkModeToggle");

// Timer buttons
const timerBtns = document.querySelectorAll(".timer-option");

// Paragraphs
const paragraphs = [
  "Typing fast requires practice and consistency every day.",
  "JavaScript makes websites interactive and dynamic.",
  "Practice typing daily to improve your speed and accuracy.",
  "A good programmer always writes clean and readable code.",
  "Technology is growing rapidly in the modern world.",
  "Consistency is the key to mastering any skill.",
  "Learning by doing is the best method for beginners.",
  "Typing practice helps increase productivity.",
  "Focus on accuracy first then improve your speed.",
  "Never stop learning new things in life."
];

// Variables
let currentText = "";
let time = 60;
let timer = null;
let started = false;
let mistakes = 0;
let totalTyped = 0;

// =============================
// Load Random Paragraph
// =============================
function loadText() {
  textDisplay.innerHTML = "";
  currentText = paragraphs[Math.floor(Math.random() * paragraphs.length)];

  currentText.split("").forEach((char, index) => {
    const span = document.createElement("span");
    span.innerText = char;
    span.classList.add("char");
    if (index === 0) span.classList.add("active");
    textDisplay.appendChild(span);
  });

  userInput.value = "";
}

// =============================
// Timer
// =============================
function startTimer() {
  timer = setInterval(() => {
    if (time > 0) {
      time--;
      updateTimerDisplay();
    } else {
      endTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  let min = Math.floor(time / 60);
  let sec = time % 60;
  timerValue.innerText = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// =============================
// Typing Logic
// =============================
userInput.addEventListener("input", () => {
  if (!started) {
    started = true;
    startTimer();
  }

  const input = userInput.value;
  const chars = textDisplay.querySelectorAll(".char");

  totalTyped = input.length;
  mistakes = 0;

  chars.forEach((charSpan, index) => {
    const typedChar = input[index];

    if (typedChar == null) {
      charSpan.classList.remove("correct", "wrong");
    } else if (typedChar === charSpan.innerText) {
      charSpan.classList.add("correct");
      charSpan.classList.remove("wrong");
    } else {
      charSpan.classList.add("wrong");
      charSpan.classList.remove("correct");
      mistakes++;
    }
  });

  // Active cursor
  document.querySelector(".active")?.classList.remove("active");
  if (chars[input.length]) {
    chars[input.length].classList.add("active");
  }

  updateStats();
  updateProgress();
});

// =============================
// Stats
// =============================
function updateStats() {
  let correctChars = totalTyped - mistakes;

  let wpm = Math.round(((correctChars / 5) / ((60 - time) / 60 || 1)));
  let accuracy = totalTyped === 0 ? 100 : Math.round((correctChars / totalTyped) * 100);

  wpmValue.innerText = wpm;
  accuracyValue.innerText = accuracy + "%";
  charsValue.innerText = totalTyped;
  mistakesValue.innerText = mistakes;
}

// =============================
// Progress Bar
// =============================
function updateProgress() {
  let progress = (userInput.value.length / currentText.length) * 100;
  progressBar.style.width = progress + "%";
}

// =============================
// End Test
// =============================
function endTest() {
  clearInterval(timer);
  userInput.disabled = true;

  finalWPM.innerText = wpmValue.innerText;
  finalAcc.innerText = accuracyValue.innerText;
  finalErrors.innerText = mistakes;

  resultModal.style.display = "flex";
}

// =============================
// Restart
// =============================
function restartTest() {
  clearInterval(timer);
  time = 60;
  started = false;
  mistakes = 0;
  totalTyped = 0;

  userInput.disabled = false;

  wpmValue.innerText = 0;
  accuracyValue.innerText = "100%";
  charsValue.innerText = 0;
  mistakesValue.innerText = 0;

  progressBar.style.width = "0%";

  resultModal.style.display = "none";

  updateTimerDisplay();
  loadText();
}

// =============================
// Timer Button Click
// =============================
timerBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    timerBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    time = parseInt(btn.dataset.time);
    updateTimerDisplay();
  });
});

// =============================
// Dark Mode
// =============================
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// =============================
// Events
// =============================
restartBtn.addEventListener("click", restartTest);
modalRestartBtn.addEventListener("click", restartTest);

// =============================
// Init
// =============================
loadText();
updateTimerDisplay();
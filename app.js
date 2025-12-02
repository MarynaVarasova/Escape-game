const STORAGE_KEY = "jiraEscapeRoomQuestions";
const PROGRESS_KEY = "jiraEscapeRoomProgress";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const clone = (value) => JSON.parse(JSON.stringify(value));

const DEFAULT_QUESTIONS = [
  {
    id: createId(),
    prompt:
      "A sprint review reveals a blocker across three squads. Which Jira artifact helps you visualize cross-team dependencies?",
    answer: "program board",
    hint: "Think PI Planning.",
  },
  {
    id: createId(),
    prompt:
      "Your retrospective action items lack owners. Which Jira field must never stay empty if you expect accountability?",
    answer: "assignee",
    hint: "It's assigned by name.",
  },
  {
    id: createId(),
    prompt:
      "To exit this room you must sum the story points of tickets ESC-101 (3), ESC-102 (5), ESC-103 (8).",
    answer: "16",
    hint: "Just add the Fibonacci trio.",
  },
];

const $ = (selector) => document.querySelector(selector);

const elements = {
  questionForm: $("#questionForm"),
  questionsContainer: $("#questionsContainer"),
  questionCount: $("#questionCount"),
  currentQuestion: $("#currentQuestion"),
  currentHint: $("#currentHint"),
  answerForm: $("#answerForm"),
  playerAnswer: $("#playerAnswer"),
  feedback: $("#feedback"),
  progressLabel: $("#questionProgressLabel"),
  progressBar: $("#progressBar"),
  resetDefaultsBtn: $("#resetDefaultsBtn"),
  playAgainBtn: $("#playAgainBtn"),
  successOverlay: $("#successOverlay"),
};

let questions = loadQuestions();
let progress = loadProgress();

init();

function init() {
  renderQuestionList();
  updatePlayerView();
  elements.questionForm.addEventListener("submit", handleQuestionSubmit);
  elements.questionsContainer.addEventListener("click", handleAdminAction);
  elements.answerForm.addEventListener("submit", handleAnswerSubmit);
  elements.resetDefaultsBtn.addEventListener("click", resetToDefaults);
  elements.playAgainBtn.addEventListener("click", resetRun);
}

function loadQuestions() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUESTIONS));
  return clone(DEFAULT_QUESTIONS);
}

function saveQuestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function loadProgress() {
  const saved = localStorage.getItem(PROGRESS_KEY);
  if (saved) return JSON.parse(saved);
  return { currentIndex: 0 };
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function handleQuestionSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const prompt = formData.get("question").trim();
  const answer = formData.get("answer").trim();
  const hint = formData.get("hint").trim();

  if (!prompt || !answer) {
    return;
  }

  questions.push({
    id: createId(),
    prompt,
    answer,
    hint,
  });

  saveQuestions();
  event.currentTarget.reset();
  elements.playerAnswer.focus();
  renderQuestionList();
  updatePlayerView();
}

function handleAdminAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "delete") {
    questions = questions.filter((q) => q.id !== id);
    if (progress.currentIndex >= questions.length) {
      progress.currentIndex = Math.max(questions.length - 1, 0);
    }
    saveQuestions();
    saveProgress();
    renderQuestionList();
    updatePlayerView();
  }
}

function renderQuestionList() {
  elements.questionCount.textContent = `${questions.length} loaded`;
  if (!questions.length) {
    elements.questionsContainer.innerHTML =
      '<li class="muted tiny">No questions configured.</li>';
    return;
  }

  elements.questionsContainer.innerHTML = questions
    .map(
      (question, index) => `
      <li class="question-item">
        <span class="badge">${index + 1}</span>
        <div class="question-copy">
          <strong>${question.prompt}</strong>
          <span>Answer: ${question.answer}</span>
          ${
            question.hint
              ? `<span class="tiny">Hint: ${question.hint}</span>`
              : ""
          }
        </div>
        <div class="question-actions">
          <button data-action="delete" data-id="${question.id}">Delete</button>
        </div>
      </li>
    `
    )
    .join("");
}

function updatePlayerView() {
  if (!questions.length) {
    elements.currentQuestion.textContent = "Waiting for the control room...";
    elements.currentHint.textContent = "";
    elements.progressLabel.textContent = "No questions yet";
    elements.progressBar.style.width = "0%";
    elements.answerForm.dataset.disabled = "true";
    elements.playerAnswer.disabled = true;
    return;
  }

  elements.answerForm.dataset.disabled = "false";
  elements.playerAnswer.disabled = false;
  const maxIndex = Math.min(progress.currentIndex, questions.length - 1);
  const current = questions[maxIndex];
  elements.currentQuestion.textContent = current.prompt;
  elements.currentHint.textContent = current.hint || "";
  elements.progressLabel.textContent = `Puzzle ${
    maxIndex + 1
  } of ${questions.length}`;
  elements.progressBar.style.width = `${
    (maxIndex / questions.length) * 100
  }%`;
}

function handleAnswerSubmit(event) {
  event.preventDefault();
  if (!questions.length) return;

  const attempt = elements.playerAnswer.value.trim();
  const current = questions[progress.currentIndex];
  if (!current) return;

  if (isCorrect(attempt, current.answer)) {
    elements.feedback.textContent = randomSuccess();
    elements.feedback.className = "feedback success";
    progress.currentIndex += 1;
    saveProgress();

    if (progress.currentIndex >= questions.length) {
      triggerWin();
    } else {
      elements.playerAnswer.value = "";
      updatePlayerView();
    }
  } else {
    elements.feedback.textContent = randomFailure();
    elements.feedback.className = "feedback error";
  }
}

function isCorrect(attempt, answer) {
  return attempt.trim().toLowerCase() === answer.trim().toLowerCase();
}

function randomSuccess() {
  const lines = [
    "Lock released. Move forward!",
    "Ticket closed flawlessly.",
    "Door slide open—next mission awaits.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function randomFailure() {
  const lines = [
    "Access denied. Recalibrate.",
    "Not quite—revisit the backlog.",
    "System rejects the input. Try again.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function triggerWin() {
  elements.successOverlay.hidden = false;
  elements.feedback.textContent = "";
  launchConfetti();
}

function launchConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function resetRun() {
  progress = { currentIndex: 0 };
  saveProgress();
  elements.successOverlay.hidden = true;
  elements.playerAnswer.value = "";
  updatePlayerView();
}

function resetToDefaults() {
  if (!confirm("Replace current riddles with the default set?")) return;
  questions = clone(DEFAULT_QUESTIONS).map((question) => ({
    ...question,
    id: createId(),
  }));
  progress = { currentIndex: 0 };
  saveQuestions();
  saveProgress();
  renderQuestionList();
  updatePlayerView();
}

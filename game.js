(() => {
  "use strict";

  const SAVE_KEY = "number-meadow-progress-v1";
  const praise = [
    "Hooray! Your brain just grew a little 🌱",
    "You did it! Those counting skills are blooming 🌼",
    "Brilliant thinking! Pip is doing a happy dance 💃",
    "A math superstar! You should feel proud ⭐",
    "Wonderful work! Every try helps your brain grow 🌈",
    "Yes! You figured it out! High-five from Pip 🙌",
  ];
  const retryMessages = [
    "Good try! Let's count it out together.",
    "So close! Use the pictures and give it another go.",
    "That's a brave try! Let's think it through together.",
  ];
  const operations = {
    add: {
      symbol: "+",
      story: (a, b) => `There ${a === 1 ? "is" : "are"} ${a} ${fruit(a)}. You find ${b} more!`,
      hint: (a, b) => additionHint(a, b),
      visual: "add",
    },
    subtract: {
      symbol: "−",
      story: (a, b) => `You have ${a} ${fruit(a)}. ${b} ${b === 1 ? "gets" : "get"} picked!`,
      hint: (a, b) => `Start at ${a} and count back ${b}: ${countBack(a, b)}.`,
      visual: "subtract",
    },
    multiply: {
      symbol: "×",
      story: (a, b) => `There ${a === 1 ? "is" : "are"} ${a} little ${a === 1 ? "basket" : "baskets"}, with ${b} ${fruit(b)} in each.`,
      hint: (a, b) => `Count ${a} groups of ${b}, or add ${b} again and again.`,
      visual: "multiply",
    },
    divide: {
      symbol: "÷",
      story: (a, b) => `${a} ${fruit(a)} are shared fairly between ${b} ${b === 1 ? "friend" : "friends"}.`,
      hint: (a, b) => `Share ${a} ${fruit(a)} into ${b} equal groups. How many in each?`,
      visual: "divide",
    },
  };

  const elements = {
    tabs: [...document.querySelectorAll(".operation-tab")],
    story: document.getElementById("question-story"),
    equation: document.getElementById("equation"),
    visual: document.getElementById("question-visual"),
    hint: document.getElementById("question-hint"),
    hintToggle: document.getElementById("hint-toggle"),
    answerRow: document.getElementById("answer-row"),
    feedback: document.getElementById("feedback"),
    next: document.getElementById("next-button"),
    help: document.getElementById("help-button"),
    stars: document.getElementById("stars-count"),
    solved: document.getElementById("solved-count"),
    streak: document.getElementById("streak-count"),
    bestStreak: document.getElementById("best-streak"),
    sound: document.getElementById("sound-button"),
  };

  const freshState = () => ({
    stars: 0,
    solved: 0,
    streak: 0,
    bestStreak: 0,
  });

  let state = loadState();
  let operation = "add";
  let question;
  let hintVisible = true;
  let soundOn = false;
  let audioContext;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== "object") return freshState();
      const clean = freshState();
      for (const key of ["stars", "solved", "streak", "bestStreak"]) {
        if (Number.isSafeInteger(saved[key]) && saved[key] >= 0) clean[key] = saved[key];
      }
      return clean;
    } catch (error) {
      console.warn("Number Meadow could not load saved progress.", error);
      return freshState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Number Meadow could not save progress.", error);
    }
  }

  function level() {
    return Math.min(3, Math.floor(state.stars / 5));
  }

  function numberCeiling() {
    return [5, 10, 15, 20][level()];
  }

  function pick(max) {
    return Math.floor(Math.random() * max) + 1;
  }

  function makeQuestion() {
    const ceiling = numberCeiling();
    let a;
    let b;
    let answer;

    switch (operation) {
      case "add":
        a = pick(Math.max(1, ceiling - 1));
        b = pick(ceiling - a);
        answer = a + b;
        break;
      case "subtract":
        a = pick(ceiling);
        b = pick(a);
        answer = a - b;
        break;
      case "multiply": {
        const factors = multiplicationPairs(ceiling);
        [a, b] = factors[pick(factors.length) - 1];
        answer = a * b;
        break;
      }
      case "divide": {
        const divisions = divisionPairs(ceiling);
        [answer, b] = divisions[pick(divisions.length) - 1];
        a = answer * b;
        break;
      }
      default:
        throw new Error(`Unknown math operation: ${operation}`);
    }

    question = { a, b, answer, wrongAttempts: 0, complete: false };
    renderQuestion();
  }

  function multiplicationPairs(ceiling) {
    const factors = [];
    for (let groups = 2; groups <= 5; groups++) {
      for (let size = 1; size <= 5; size++) {
        if (groups * size <= ceiling) factors.push([groups, size]);
      }
    }
    return factors.length ? factors : [[2, 1]];
  }

  function divisionPairs(ceiling) {
    const divisions = [];
    for (let divisor = 2; divisor <= 5; divisor++) {
      for (let answer = 1; divisor * answer <= ceiling; answer++) {
        divisions.push([answer, divisor]);
      }
    }
    return divisions.length ? divisions : [[1, 2]];
  }

  function fruit(count) {
    return count === 1 ? "apple" : "apples";
  }

  function countSteps(start, count) {
    return Array.from({ length: count }, (_, index) => start + index + 1).join(", ");
  }

  function additionHint(a, b) {
    const toNextTen = 10 - (a % 10);
    if (a + b >= 10 && toNextTen <= b) {
      const remainder = b - toNextTen;
      return `Make 10: ${a} needs ${toNextTen} more to make ${a + toNextTen}, then add ${remainder} more.`;
    }
    return `Start at ${a}, then count on ${b}: ${countSteps(a, b)}.`;
  }

  function countBack(start, count) {
    return Array.from({ length: count }, (_, index) => start - index - 1).join(", ");
  }

  function makeChoices(answer) {
    const choices = new Set([answer]);
    while (choices.size < 3) {
      const offset = pick(3) * (Math.random() < 0.5 ? -1 : 1);
      choices.add(Math.max(0, answer + offset));
    }
    return [...choices].sort(() => Math.random() - 0.5);
  }

  function equationLabel(a, symbol, b) {
    const spoken = { "+": "plus", "−": "minus", "×": "times", "÷": "divided by" }[symbol];
    return `${a} ${spoken} ${b} equals what?`;
  }

  function renderQuestion() {
    const details = operations[operation];
    const { a, b } = question;
    elements.story.textContent = details.story(a, b);
    elements.equation.innerHTML = `<span>${a}</span> <span class="operator">${details.symbol}</span> <span>${b}</span> <span class="equals">= ?</span>`;
    elements.equation.setAttribute("aria-label", equationLabel(a, details.symbol, b));
    elements.hint.textContent = details.hint(a, b);
    elements.hint.hidden = !hintVisible;
    elements.hintToggle.textContent = hintVisible ? "💡 Hide hint" : "💡 Show hint";
    elements.hintToggle.setAttribute("aria-expanded", String(hintVisible));
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";
    elements.next.disabled = true;
    elements.answerRow.replaceChildren();
    makeChoices(question.answer).forEach((choice) => {
      const button = document.createElement("button");
      button.className = "answer-button";
      button.type = "button";
      button.textContent = String(choice);
      button.setAttribute("aria-label", `Answer ${choice}`);
      button.addEventListener("click", () => checkAnswer(choice, button));
      elements.answerRow.append(button);
    });
    renderVisual(details.visual, a, b);
    elements.help.disabled = false;
  }

  function renderVisual(kind, a, b) {
    elements.visual.replaceChildren();
    const apple = () => {
      const icon = document.createElement("span");
      icon.textContent = "🍎";
      return icon;
    };
    const group = (count, equal = false) => {
      const container = document.createElement("span");
      container.className = equal ? "mini-group" : "visual-group";
      for (let index = 0; index < count; index++) container.append(apple());
      return container;
    };
    const symbol = (text) => {
      const node = document.createElement("span");
      node.className = "visual-symbol";
      node.textContent = text;
      return node;
    };

    if (kind === "add") {
      elements.visual.append(group(a), symbol("+"), group(b));
    } else if (kind === "subtract") {
      const remaining = document.createElement("span");
      remaining.className = "visual-group";
      for (let index = 0; index < a; index++) {
        const icon = apple();
        if (index >= a - b) icon.style.opacity = "0.24";
        remaining.append(icon);
      }
      elements.visual.append(remaining);
    } else if (kind === "multiply") {
      const groups = document.createElement("span");
      groups.className = "visual-group equal-groups";
      for (let index = 0; index < a; index++) groups.append(group(b, true));
      elements.visual.append(groups);
    } else {
      const groups = document.createElement("span");
      groups.className = "visual-group equal-groups";
      for (let index = 0; index < b; index++) groups.append(group(Math.floor(a / b), true));
      elements.visual.append(groups);
    }
  }

  function checkAnswer(value, selectedButton) {
    if (question.complete) return;
    if (value === question.answer) {
      question.complete = true;
      const previousLevel = level();
      state.stars++;
      state.solved++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      saveState();
      updateProgress();
      selectedButton.classList.add("is-correct");
      elements.answerRow.querySelectorAll("button").forEach((button) => {
        if (button !== selectedButton) button.disabled = true;
      });
      elements.feedback.className = "feedback";
      const newLevel = level();
      elements.feedback.textContent = newLevel > previousLevel
        ? "Level up! The puzzles are getting trickier. You've got this! 🎉"
        : praise[Math.floor(Math.random() * praise.length)];
      elements.next.disabled = false;
      elements.next.focus({ preventScroll: true });
      playNote(true);
    } else {
      question.wrongAttempts++;
      selectedButton.classList.add("is-wrong");
      selectedButton.disabled = true;
      state.streak = 0;
      saveState();
      elements.feedback.className = "feedback is-wrong";
      if (question.wrongAttempts >= 2) {
        question.complete = true;
        elements.feedback.textContent = `The answer is ${question.answer}. Let's try a new one together!`;
        elements.answerRow.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        elements.next.disabled = false;
      } else {
        elements.feedback.textContent = retryMessages[Math.floor(Math.random() * retryMessages.length)];
        elements.hint.hidden = false;
        elements.hintToggle.textContent = "💡 Hide hint";
        elements.hintToggle.setAttribute("aria-expanded", "true");
        hintVisible = true;
        elements.help.disabled = false;
      }
      playNote(false);
    }
    updateProgress();
  }

  function updateProgress() {
    elements.stars.textContent = String(state.stars);
    elements.solved.textContent = String(state.solved);
    elements.streak.textContent = String(state.streak);
    elements.bestStreak.textContent = String(state.bestStreak);
  }

  function chooseOperation(nextOperation) {
    if (!operations[nextOperation]) return;
    operation = nextOperation;
    elements.tabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.operation === operation)));
    makeQuestion();
  }

  function playNote(correct) {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Audio is not supported in this browser.");
      audioContext = audioContext || new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = correct ? 660 : 350;
      gain.gain.setValueAtTime(0.06, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    } catch (error) {
      console.warn("DeesMathsGame could not play a sound.", error);
      soundOn = false;
      elements.sound.textContent = "🔇";
      elements.sound.setAttribute("aria-label", "Turn sound on");
      elements.sound.title = "Turn sound on";
    }
  }

  elements.tabs.forEach((tab) => tab.addEventListener("click", () => chooseOperation(tab.dataset.operation)));
  elements.next.addEventListener("click", makeQuestion);
  elements.hintToggle.addEventListener("click", () => {
    hintVisible = !hintVisible;
    elements.hint.hidden = !hintVisible;
    elements.hintToggle.textContent = hintVisible ? "💡 Hide hint" : "💡 Show hint";
    elements.hintToggle.setAttribute("aria-expanded", String(hintVisible));
  });
  elements.help.addEventListener("click", () => {
    hintVisible = true;
    elements.hint.hidden = false;
    elements.hintToggle.textContent = "💡 Hide hint";
    elements.hintToggle.setAttribute("aria-expanded", "true");
    elements.feedback.className = "feedback";
    elements.feedback.textContent = operations[operation].hint(question.a, question.b);
  });
  elements.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    elements.sound.textContent = soundOn ? "🔊" : "🔇";
    elements.sound.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    elements.sound.title = soundOn ? "Turn sound off" : "Turn sound on";
    if (soundOn) playNote(true);
  });
  updateProgress();
  makeQuestion();
})();
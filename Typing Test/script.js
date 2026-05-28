// script.js – Complete typing test logic, navigation, premium features

(function() {
  "use strict";

  // ---------- DOM Elements ----------
  const homeView = document.getElementById('homeView');
  const typingView = document.getElementById('typingView');
  const resultView = document.getElementById('resultView');
  const themeToggle = document.getElementById('themeToggle');
  
  // Cards
  const learnCard = document.getElementById('learnCard');
  const practiceCard = document.getElementById('practiceCard');
  const testCard = document.getElementById('testCard');
  const learnPanel = document.getElementById('learnPanel');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeLearnBtn = document.getElementById('closeLearnBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  
  // Settings
  const modeBtns = document.querySelectorAll('.mode-btn');
  const timeBtns = document.querySelectorAll('.time-btn');
  const diffBtns = document.querySelectorAll('.diff-btn');
  const startSessionBtn = document.getElementById('startSessionBtn');
  
  // Typing view
  const textDisplay = document.getElementById('textDisplay');
  const typingInput = document.getElementById('typingInput');
  const wpmDisplay = document.getElementById('wpmDisplay');
  const accDisplay = document.getElementById('accDisplay');
  const timerDisplay = document.getElementById('timerDisplay');
  const errorDisplay = document.getElementById('errorDisplay');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  // Result view
  const finalWpm = document.getElementById('finalWpm');
  const finalAcc = document.getElementById('finalAcc');
  const totalWordsSpan = document.getElementById('totalWords');
  const correctWordsSpan = document.getElementById('correctWords');
  const incorrectWordsSpan = document.getElementById('incorrectWords');
  const timeTakenSpan = document.getElementById('timeTaken');
  const progressBar = document.getElementById('progressBar');
  const perfMessage = document.getElementById('perfMessage');
  const restartResultBtn = document.getElementById('restartResultBtn');
  const homeBtn = document.getElementById('homeBtn');
  
  // Keyboard visuals
  const learnKeyboardDiv = document.getElementById('learnKeyboard');
  const liveKeyboardDiv = document.getElementById('liveKeyboard');
  
  // ---------- State ----------
  let currentMode = 'practice'; // practice or test
  let textMode = 'words';       // words / paragraph
  let timeDuration = 60;        // seconds
  let difficulty = 'easy';
  let targetText = '';
  let targetWords = [];
  let typedCharacters = '';
  let startTime = null;
  let timerInterval = null;
  let timeLeft = 60;
  let isPaused = false;
  let isFinished = false;
  let errorsCount = 0;
  let correctCharCount = 0;
  let totalTypedChars = 0;
  let wordStatus = []; // per word correctness
  
  // Settings state
  let selectedModeSetting = { mode: 'words', time: 60, diff: 'easy' };
  
  // ---------- Helper: Word banks ----------
  const wordBank = {
    easy: ['the','be','to','of','and','a','in','that','have','I','it','for','not','on','with','he','as','you','do','at'],
    medium: ['practice','keyboard','monitor','function','variable','develop','project','dynamic','responsive','algorithm'],
    hard: ['synchronization','idiosyncratic','unprecedented','infrastructure','revolutionary','entrepreneurial','lexicographical']
  };
  const paragraphs = {
    easy: "Typing is a fundamental skill in the digital age. Practice every day to improve your speed and accuracy. Keep your fingers on the home row.",
    medium: "The quick brown fox jumps over the lazy dog. Efficient typing requires consistent practice and proper ergonomics. Your WPM will increase steadily.",
    hard: "Pneumonoultramicroscopicsilicovolcanoconiosis is a lung disease. Mastering complex keystrokes demands patience. Perseverance yields extraordinary results."
  };
  
  // ---------- Navigation & UI helpers ----------
  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    if (viewId === 'typingView') typingInput.focus();
  }
  
  function hidePanels() {
    learnPanel.classList.add('hidden');
    settingsPanel.classList.add('hidden');
  }
  
  // Learn panel toggle
  learnCard.addEventListener('click', () => {
    hidePanels();
    learnPanel.classList.remove('hidden');
    renderLearnKeyboard();
  });
  closeLearnBtn.addEventListener('click', () => learnPanel.classList.add('hidden'));
  
  // Practice / Test show settings
  function showSettings(mode) {
    currentMode = mode;
    hidePanels();
    settingsPanel.classList.remove('hidden');
    // reset active toggles
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${selectedModeSetting.mode}"]`).classList.add('active');
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.time-btn[data-time="${selectedModeSetting.time}"]`).classList.add('active');
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.diff-btn[data-diff="${selectedModeSetting.diff}"]`).classList.add('active');
  }
  practiceCard.addEventListener('click', () => showSettings('practice'));
  testCard.addEventListener('click', () => showSettings('test'));
  closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));
  
  // Settings toggle listeners
  modeBtns.forEach(btn => btn.addEventListener('click', function() {
    modeBtns.forEach(b => b.classList.remove('active')); this.classList.add('active');
    selectedModeSetting.mode = this.dataset.mode;
  }));
  timeBtns.forEach(btn => btn.addEventListener('click', function() {
    timeBtns.forEach(b => b.classList.remove('active')); this.classList.add('active');
    selectedModeSetting.time = parseInt(this.dataset.time);
  }));
  diffBtns.forEach(btn => btn.addEventListener('click', function() {
    diffBtns.forEach(b => b.classList.remove('active')); this.classList.add('active');
    selectedModeSetting.diff = this.dataset.diff;
  }));
  
  // Start session
  startSessionBtn.addEventListener('click', () => {
    textMode = selectedModeSetting.mode;
    timeDuration = selectedModeSetting.time;
    difficulty = selectedModeSetting.diff;
    generateText();
    resetTestState();
    showView('typingView');
    renderTextDisplay();
    typingInput.value = '';
    typingInput.disabled = false;
    typingInput.focus();
    isFinished = false;
    isPaused = false;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    clearInterval(timerInterval);
    timeLeft = timeDuration;
    timerDisplay.textContent = timeLeft;
    startTime = null;
    typedCharacters = '';
    errorsCount = 0; correctCharCount = 0; totalTypedChars = 0;
    updateStats();
    renderLiveKeyboard();
  });
  
  // Generate text
  function generateText() {
    if (textMode === 'words') {
      const list = wordBank[difficulty] || wordBank.medium;
      let words = [];
      const count = 40;
      for (let i=0; i<count; i++) {
        words.push(list[Math.floor(Math.random() * list.length)]);
      }
      targetText = words.join(' ');
    } else {
      targetText = paragraphs[difficulty] || paragraphs.medium;
    }
    targetWords = targetText.split(' ');
    wordStatus = new Array(targetWords.length).fill(null);
  }
  
  function renderTextDisplay() {
    let html = '';
    targetWords.forEach((word, idx) => {
      html += `<span class="word" data-index="${idx}">${word}</span> `;
    });
    textDisplay.innerHTML = html;
    highlightCurrentWord();
  }
  
  function highlightCurrentWord() {
    const wordSpans = document.querySelectorAll('.word');
    wordSpans.forEach((span, i) => {
      span.classList.remove('current-word');
      if (i === currentWordIndex()) span.classList.add('current-word');
    });
  }
  
  function currentWordIndex() {
    if (!typedCharacters.length) return 0;
    const wordsTyped = typedCharacters.trim().split(/\s+/).length - 1;
    return Math.min(wordsTyped, targetWords.length-1);
  }
  
  // Reset state
  function resetTestState() {
    clearInterval(timerInterval);
    typedCharacters = '';
    errorsCount = 0; correctCharCount = 0; totalTypedChars = 0;
    startTime = null; isFinished = false; isPaused = false;
    updateStats();
  }
  
  // Timer logic
  function startTimerOnType() {
    if (startTime === null && !isPaused && !isFinished) {
      startTime = Date.now();
      timerInterval = setInterval(() => {
        if (!isPaused && !isFinished) {
          timeLeft = Math.max(0, timeDuration - Math.floor((Date.now() - startTime) / 1000));
          timerDisplay.textContent = timeLeft;
          if (timeLeft <= 0) {
            finishTest('timeout');
          }
          updateStats();
        }
      }, 200);
    }
  }
  
  function finishTest(reason) {
    if (isFinished) return;
    isFinished = true;
    clearInterval(timerInterval);
    typingInput.disabled = true;
    pauseBtn.disabled = true; resumeBtn.disabled = true;
    calculateFinalResults();
    showView('resultView');
  }
  
  // Input handler
  typingInput.addEventListener('input', (e) => {
    if (isPaused || isFinished) return;
    const val = e.target.value;
    startTimerOnType();
    
    // Process typing
    typedCharacters = val;
    totalTypedChars = val.length;
    let correct = 0;
    const targetChars = targetText;
    
    for (let i=0; i<val.length; i++) {
      if (i < targetChars.length && val[i] === targetChars[i]) correct++;
    }
    correctCharCount = correct;
    errorsCount = totalTypedChars - correctCharCount;
    
    updateStats();
    applyCharacterStyling(val);
    highlightCurrentWord();
    
    // auto finish if typed beyond length? no.
    if (val.length >= targetText.length) {
      // optional auto submit? we'll allow manual
    }
  });
  
  function applyCharacterStyling(typed) {
    const wordSpans = document.querySelectorAll('.word');
    // clear classes
    wordSpans.forEach(span => { span.classList.remove('correct','incorrect'); });
    let globalIdx = 0;
    for (let w=0; w<targetWords.length; w++) {
      const word = targetWords[w];
      for (let c=0; c<word.length; c++) {
        const charSpan = wordSpans[w]?.childNodes[0]; // not per char, we style whole word? spec: letters green/red. better create spans per letter? we'll use simpler: highlight correct/incorrect words? but spec says letters. We'll create letter spans for demo. We'll improve: render text with letter spans.
        // Instead, we can re-render with spans? We'll implement a robust render with letters.
      }
    }
    // For brevity but we can implement letter-based: we will rework render for letter spans.
    // Let's call a new render function that creates letter spans.
    renderWithLetterSpans(typed);
  }
  
  function renderWithLetterSpans(typed) {
    let html = '';
    let charIndex = 0;
    targetWords.forEach((word, wIdx) => {
      let wordHtml = '';
      for (let i=0; i<word.length; i++) {
        const expected = word[i];
        const typedChar = typed[charIndex];
        let cls = '';
        if (typedChar !== undefined) {
          cls = (typedChar === expected) ? 'correct' : 'incorrect';
        }
        wordHtml += `<span class="${cls}">${expected}</span>`;
        charIndex++;
      }
      html += `<span class="word" data-index="${wIdx}">${wordHtml}</span> `;
      charIndex++; // space
    });
    textDisplay.innerHTML = html;
    highlightCurrentWord();
  }
  
  function updateStats() {
    const minutes = (timeDuration - timeLeft) / 60 || 0.01;
    const wpm = (totalTypedChars / 5) / minutes;
    wpmDisplay.textContent = Math.round(wpm) || 0;
    const acc = totalTypedChars ? Math.round((correctCharCount / totalTypedChars)*100) : 100;
    accDisplay.textContent = acc + '%';
    errorDisplay.textContent = errorsCount;
  }
  
  // Pause / Resume
  pauseBtn.addEventListener('click', () => { isPaused = true; pauseBtn.disabled = true; resumeBtn.disabled = false; typingInput.disabled = true; });
  resumeBtn.addEventListener('click', () => { isPaused = false; typingInput.disabled = false; typingInput.focus(); pauseBtn.disabled = false; resumeBtn.disabled = true; });
  restartBtn.addEventListener('click', () => {
    resetTestState();
    generateText();
    renderTextDisplay();
    typingInput.value = '';
    timeLeft = timeDuration; timerDisplay.textContent = timeLeft;
    typingInput.disabled = false; pauseBtn.disabled = false; resumeBtn.disabled = true;
    isPaused = false; isFinished = false; startTime = null;
    updateStats();
  });
  submitBtn.addEventListener('click', () => finishTest('manual'));
  
  // Result calculation
  function calculateFinalResults() {
    const minutes = (timeDuration - timeLeft) / 60;
    const wpm = Math.round((totalTypedChars / 5) / minutes) || 0;
    const accuracy = totalTypedChars ? Math.round((correctCharCount/totalTypedChars)*100) : 100;
    const totalW = targetWords.length;
    let correctW = 0;
    // count correct words
    const typedWords = typedCharacters.trim().split(/\s+/);
    targetWords.forEach((tw, i) => { if (typedWords[i] === tw) correctW++; });
    
    finalWpm.textContent = wpm;
    finalAcc.textContent = accuracy + '%';
    totalWordsSpan.textContent = totalW;
    correctWordsSpan.textContent = correctW;
    incorrectWordsSpan.textContent = totalW - correctW;
    timeTakenSpan.textContent = (timeDuration - timeLeft) + 's';
    const perf = accuracy > 95 ? 'Excellent! 🌟' : (accuracy>80?'Good 👍':'Needs Improvement 💪');
    perfMessage.textContent = perf;
    progressBar.style.width = accuracy + '%';
  }
  
  // Learn keyboard render
  function renderLearnKeyboard() {
    const rows = [
      ['`','1','2','3','4','5','6','7','8','9','0','-','='],
      ['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
      ['Caps','A','S','D','F','G','H','J','K','L',';','\'','Enter'],
      ['Shift','Z','X','C','V','B','N','M',',','.','/','Shift']
    ];
    let html = '';
    rows.forEach(row => {
      row.forEach(key => {
        let sideClass = '';
        if ('QWERTASDFGZXCVB'.includes(key)) sideClass = 'left-key';
        else if ('YUIOPHJKLNM'.includes(key)) sideClass = 'right-key';
        html += `<div class="key-visual ${sideClass}">${key}</div>`;
      });
    });
    learnKeyboardDiv.innerHTML = html;
  }
  
  function renderLiveKeyboard() {
    const keys = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M'];
    let html = '';
    keys.forEach(k => html += `<div class="keycap" data-key="${k}">${k}</div>`);
    liveKeyboardDiv.innerHTML = html;
    document.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      const cap = document.querySelector(`.keycap[data-key="${key}"]`);
      if(cap) { cap.classList.add('highlight'); setTimeout(()=>cap.classList.remove('highlight'),120); }
    });
  }
  
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
  
  // Navigation home/restart
  homeBtn.addEventListener('click', () => { showView('homeView'); hidePanels(); });
  restartResultBtn.addEventListener('click', () => {
    showView('typingView');
    restartBtn.click();
  });
  
  // Initialize
  renderLearnKeyboard();
  renderLiveKeyboard();
  showView('homeView');
})();
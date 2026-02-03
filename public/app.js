(function () {
  // --- State ---
  let words = JSON.parse(localStorage.getItem('spellingWords') || '[]');
  let inPractice = false;
  let currentIndex = 0;
  let score = 0;
  let practiceWords = []; // shuffled copy of words for each round
  let firstTry = true; // whether current word is still on first attempt
  let tiles = [];      // { letter, id, used }
  let answer = [];     // fixed-length array of tile ids (null = empty slot)
  let lockedSlots = []; // boolean array — true if that position is locked correct

  // --- DOM refs ---
  const modeToggle = document.getElementById('mode-toggle');
  const adminSection = document.getElementById('admin-section');
  const practiceSection = document.getElementById('practice-section');
  const wordInput = document.getElementById('word-input');
  const addWordBtn = document.getElementById('add-word-btn');
  const wordListEl = document.getElementById('word-list');
  const emptyMsg = document.getElementById('empty-msg');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const hearBtn = document.getElementById('hear-btn');
  const tileContainer = document.getElementById('tile-container');
  const answerArea = document.getElementById('answer-area');
  const submitBtn = document.getElementById('submit-btn');
  const nextBtn = document.getElementById('next-btn');
  const feedback = document.getElementById('feedback');
  const currentNum = document.getElementById('current-num');
  const totalNum = document.getElementById('total-num');
  const scoreEl = document.getElementById('score');
  const playAgainBtn = document.getElementById('play-again-btn');

  // --- Persistence ---
  function saveWords() {
    localStorage.setItem('spellingWords', JSON.stringify(words));
  }

  // --- Admin rendering ---
  function renderWordList() {
    wordListEl.innerHTML = '';
    emptyMsg.hidden = words.length > 0;
    words.forEach(function (w, i) {
      var li = document.createElement('li');
      li.textContent = w;
      var del = document.createElement('button');
      del.textContent = '\u{274C} Delete';
      del.addEventListener('click', function () {
        words.splice(i, 1);
        saveWords();
        renderWordList();
      });
      li.appendChild(del);
      wordListEl.appendChild(li);
    });
  }

  // --- Add word ---
  function addWord() {
    var w = wordInput.value.trim().toLowerCase();
    if (!w || !/^[a-z]+$/.test(w)) return;
    if (words.indexOf(w) !== -1) return;
    words.push(w);
    saveWords();
    renderWordList();
    wordInput.value = '';
    wordInput.focus();
  }

  addWordBtn.addEventListener('click', addWord);
  wordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addWord();
  });

  // --- Export ---
  exportBtn.addEventListener('click', function () {
    var data = JSON.stringify({ name: 'Spelling Words', words: words }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'spelling-words.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Import ---
  importInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.words || !Array.isArray(data.words)) {
          alert('Invalid file: missing "words" array.');
          return;
        }
        words = data.words.map(function (w) { return String(w).trim().toLowerCase(); })
          .filter(function (w) { return /^[a-z]+$/.test(w); });
        saveWords();
        renderWordList();
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });

  // --- Mode toggle ---
  modeToggle.addEventListener('click', function () {
    if (!inPractice) {
      if (words.length === 0) {
        alert('Add some words first!');
        return;
      }
      inPractice = true;
      currentIndex = 0;
      score = 0;
      practiceWords = shuffle(words.slice());
      adminSection.hidden = true;
      practiceSection.hidden = false;
      modeToggle.textContent = 'Back to Admin';
      startWord();
    } else {
      inPractice = false;
      adminSection.hidden = false;
      practiceSection.hidden = true;
      modeToggle.textContent = 'Switch to Practice Mode';
    }
  });

  // --- Speech ---
  function getPreferredVoice() {
    var voices = speechSynthesis.getVoices();
    // Prefer high-quality English voices in order
    var preferred = ['Microsoft Zira', 'Google US English', 'Google UK English Female',
      'Samantha', 'Karen', 'Daniel'];
    for (var i = 0; i < preferred.length; i++) {
      for (var j = 0; j < voices.length; j++) {
        if (voices[j].name.indexOf(preferred[i]) !== -1) return voices[j];
      }
    }
    // Fallback: first English voice available
    for (var j = 0; j < voices.length; j++) {
      if (voices[j].lang.indexOf('en') === 0) return voices[j];
    }
    return null;
  }

  // Pre-load voices (some browsers load them asynchronously)
  speechSynthesis.getVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); };
  }

  function speakWord() {
    var word = practiceWords[currentIndex];
    speechSynthesis.cancel();

    var voice = getPreferredVoice();

    // First utterance: the prompt and the word spoken slowly
    var prompt = new SpeechSynthesisUtterance('Spell the word');
    if (voice) prompt.voice = voice;
    prompt.rate = 0.5;
    prompt.pitch = 1.0;
    prompt.volume = 1.0;

    var spoken = new SpeechSynthesisUtterance(word);
    if (voice) spoken.voice = voice;
    spoken.rate = 0.4;
    spoken.pitch = 1.0;
    spoken.volume = 1.0;

    // Second utterance: repeat the whole word once more
    var repeat = new SpeechSynthesisUtterance(word);
    if (voice) repeat.voice = voice;
    repeat.rate = 0.4;
    repeat.pitch = 1.0;
    repeat.volume = 1.0;

    speechSynthesis.speak(prompt);
    speechSynthesis.speak(spoken);
    speechSynthesis.speak(repeat);
  }

  hearBtn.addEventListener('click', speakWord);

  // --- Tile generation ---
  function randomLetter(type) {
    var vowels = 'aeiou';
    var consonants = 'bcdfghjklmnpqrstvwxyz';
    var pool = type === 'vowel' ? vowels : consonants;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function generateTiles(word) {
    var total = word.length * 3;
    var fillerCount = total - word.length;
    var result = [];
    for (var i = 0; i < word.length; i++) {
      result.push({ letter: word[i], id: i });
    }
    for (var i = 0; i < fillerCount; i++) {
      var type = Math.random() < 0.3 ? 'vowel' : 'consonant';
      result.push({ letter: randomLetter(type), id: word.length + i });
    }
    shuffle(result);
    return result.map(function (t, idx) {
      return { letter: t.letter, id: idx, used: false };
    });
  }

  // --- Practice rendering ---
  function startWord() {
    var word = practiceWords[currentIndex];
    tiles = generateTiles(word);
    answer = new Array(word.length);
    for (var i = 0; i < word.length; i++) { answer[i] = null; }
    lockedSlots = new Array(word.length);
    for (var i = 0; i < word.length; i++) { lockedSlots[i] = false; }
    firstTry = true;
    feedback.hidden = true;
    feedback.className = '';
    submitBtn.hidden = false;
    nextBtn.hidden = true;
    currentNum.textContent = currentIndex + 1;
    totalNum.textContent = practiceWords.length;
    scoreEl.textContent = score;
    renderTiles();
    renderAnswer();
  }

  function renderTiles() {
    tileContainer.innerHTML = '';
    tiles.forEach(function (t) {
      var div = document.createElement('div');
      div.className = 'tile' + (t.used ? ' used' : '');
      div.textContent = t.letter;
      div.addEventListener('click', function () {
        if (t.used) return;
        // Find next empty, non-locked slot
        var slot = -1;
        for (var i = 0; i < answer.length; i++) {
          if (answer[i] === null && !lockedSlots[i]) { slot = i; break; }
        }
        if (slot === -1) return; // all slots filled or locked
        t.used = true;
        answer[slot] = t.id;
        renderTiles();
        renderAnswer();
      });
      tileContainer.appendChild(div);
    });
  }

  function renderAnswer() {
    answerArea.innerHTML = '';
    for (var i = 0; i < answer.length; i++) {
      (function (idx) {
        var div = document.createElement('div');
        if (answer[idx] !== null) {
          var t = tiles[answer[idx]];
          div.className = 'tile' + (lockedSlots[idx] ? ' locked' : '');
          div.textContent = t.letter;
          if (!lockedSlots[idx]) {
            div.addEventListener('click', function () {
              t.used = false;
              answer[idx] = null;
              renderTiles();
              renderAnswer();
            });
          }
        } else {
          div.className = 'tile empty-slot';
        }
        answerArea.appendChild(div);
      })(i);
    }
  }

  // --- Submit ---
  submitBtn.addEventListener('click', function () {
    var attempt = answer.map(function (id) { return id !== null ? tiles[id].letter : ''; }).join('');
    var word = practiceWords[currentIndex];
    feedback.hidden = false;
    if (attempt === word) {
      if (firstTry) {
        score++;
        scoreEl.textContent = score;
      }
      feedback.textContent = firstTry ? '\u{1F389} Correct! Great job! \u{2B50}' : '\u{1F44D} Correct! You got it!';
      feedback.className = 'correct';
      submitBtn.hidden = true;
      nextBtn.hidden = false;
    } else {
      firstTry = false;
      feedback.textContent = '\u{1F914} Not quite \u2014 try again!';
      feedback.className = 'incorrect';
      // Lock correct positions, release incorrect tiles back to the pool
      for (var i = 0; i < word.length; i++) {
        if (answer[i] !== null && tiles[answer[i]].letter === word[i]) {
          lockedSlots[i] = true;
        } else if (answer[i] !== null) {
          tiles[answer[i]].used = false;
          answer[i] = null;
        }
      }
      renderTiles();
      renderAnswer();
    }
  });

  // --- Next ---
  nextBtn.addEventListener('click', function () {
    currentIndex++;
    if (currentIndex >= practiceWords.length) {
      tileContainer.innerHTML = '';
      answerArea.innerHTML = '';
      feedback.hidden = false;
      feedback.className = 'correct';
      feedback.textContent = '\u{1F3C6} All done! You got ' + score + ' out of ' + practiceWords.length + ' correct on the first try! \u{1F31F}';
      submitBtn.hidden = true;
      nextBtn.hidden = true;
      hearBtn.hidden = true;
      playAgainBtn.hidden = false;
    } else {
      startWord();
    }
  });

  // --- Play Again ---
  playAgainBtn.addEventListener('click', function () {
    currentIndex = 0;
    score = 0;
    practiceWords = shuffle(words.slice());
    playAgainBtn.hidden = true;
    hearBtn.hidden = false;
    startWord();
  });

  // --- Init ---
  renderWordList();
})();

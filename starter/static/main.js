const SIZE = 9;
let puzzle = [];
let timerInterval = null;
let elapsedSeconds = 0;
let hintCount = 0;
let gameSolved = false;
let gameDifficulty = 'medium';
let leaderboardScores = SudokuLeaderboard.createEmptyLeaderboard();
let highlightedScoreId = null;

function getBoard() {
  const inputs = document.querySelectorAll('#sudoku-board input');
  const board = [];
  for (let row = 0; row < SIZE; row++) {
    board[row] = [];
    for (let column = 0; column < SIZE; column++) {
      const value = inputs[row * SIZE + column].value;
      board[row][column] = value ? parseInt(value, 10) : 0;
    }
  }
  return board;
}

function updateTimer() {
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  clearInterval(timerInterval);
  elapsedSeconds = 0;
  updateTimer();
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function setMessage(text, state = '') {
  const message = document.getElementById('message');
  message.textContent = text;
  message.classList.toggle('message-error', state === 'error');
  message.classList.toggle('message-success', state === 'success');
}

function setDarkMode(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  const toggle = document.getElementById('dark-mode-toggle');
  toggle.setAttribute('aria-pressed', String(isDark));
  toggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

function renderLeaderboard() {
  const entries = SudokuLeaderboard.getVisibleScores(
    leaderboardScores,
    document.getElementById('leaderboard-filter').value,
  );
  const tableBody = document.getElementById('leaderboard-entries');
  tableBody.replaceChildren();
  if (entries.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'leaderboard-empty';
    cell.colSpan = 5;
    cell.textContent = 'No scores yet.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (entry.id === highlightedScoreId) row.classList.add('leaderboard-new');
    const values = [
      index + 1,
      entry.name,
      SudokuLeaderboard.formatTime(entry.time),
      entry.difficulty[0].toUpperCase() + entry.difficulty.slice(1),
      entry.hints,
    ];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  });
}

function loadLeaderboard() {
  try {
    leaderboardScores = SudokuLeaderboard.load(window.localStorage);
  } catch {
    leaderboardScores = SudokuLeaderboard.createEmptyLeaderboard();
  }
  renderLeaderboard();
}

function recordSolvedGame() {
  if (gameSolved) return;
  gameSolved = true;
  stopTimer();
  setMessage('Congratulations! You solved it!', 'success');
  let enteredName;
  try {
    enteredName = window.prompt('Puzzle solved! Enter your name for the leaderboard:');
  } catch {
    return;
  }
  if (enteredName === null) return;
  const score = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: enteredName.trim() || 'Anonymous',
    time: elapsedSeconds,
    difficulty: gameDifficulty,
    hints: hintCount,
  };
  const result = SudokuLeaderboard.rankScore(leaderboardScores, score);
  leaderboardScores = result.leaderboard;
  highlightedScoreId = result.included ? score.id : null;
  try {
    SudokuLeaderboard.save(leaderboardScores, window.localStorage);
  } catch {
  }
  if (result.included) {
    document.getElementById('leaderboard-filter').value = score.difficulty;
  }
  renderLeaderboard();
}

function updateLiveConflicts() {
  const inputs = document.querySelectorAll('#sudoku-board input');
  for (const input of inputs) input.classList.remove('live-conflict');
  for (const input of inputs) {
    if (input.disabled || !input.value) continue;
    const row = Number(input.dataset.row);
    const column = Number(input.dataset.col);
    const value = input.value;
    const sharesUnit = (other) => other !== input && other.value === value && (
      Number(other.dataset.row) === row ||
      Number(other.dataset.col) === column ||
      (Math.floor(Number(other.dataset.row) / 3) === Math.floor(row / 3) &&
        Math.floor(Number(other.dataset.col) / 3) === Math.floor(column / 3))
    );
    if ([...inputs].some(sharesUnit)) input.classList.add('live-conflict');
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let column = 0; column < SIZE; column++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = column;
      input.addEventListener('input', (event) => {
        const value = event.target.value.replace(/[^1-9]/g, '');
        event.target.value = value;
        event.target.classList.remove('incorrect');
        updateLiveConflicts();
        verifyCompletedBoard();
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(nextPuzzle) {
  puzzle = nextPuzzle;
  createBoardElement();
  const inputs = document.querySelectorAll('#sudoku-board input');
  for (let row = 0; row < SIZE; row++) {
    for (let column = 0; column < SIZE; column++) {
      const input = inputs[row * SIZE + column];
      const value = puzzle[row][column];
      if (value !== 0) {
        input.value = value;
        input.disabled = true;
        input.classList.add('prefilled');
      }
    }
  }
}

async function newGame() {
  const difficulty = document.getElementById('difficulty').value;
  const response = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
  const data = await response.json();
  if (data.error) {
    setMessage(data.error, 'error');
    return;
  }
  renderPuzzle(data.puzzle);
  gameDifficulty = difficulty;
  hintCount = 0;
  gameSolved = false;
  highlightedScoreId = null;
  setMessage('');
  startTimer();
}

async function verifyCompletedBoard() {
  const board = getBoard();
  if (board.some((row) => row.includes(0))) return;
  const response = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board}),
  });
  const data = await response.json();
  if (!data.error && data.incorrect.length === 0) recordSolvedGame();
}

async function checkSolution() {
  const board = getBoard();
  const inputs = document.querySelectorAll('#sudoku-board input');
  const response = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board}),
  });
  const data = await response.json();
  if (data.error) {
    setMessage(data.error, 'error');
    return;
  }
  const incorrect = new Set(data.incorrect.map(([row, column]) => row * SIZE + column));
  inputs.forEach((input, index) => {
    if (!input.disabled) input.classList.toggle('incorrect', incorrect.has(index));
  });
  if (incorrect.size === 0) {
    recordSolvedGame();
  } else {
    setMessage('Some cells are incorrect.', 'error');
  }
}

async function requestHint() {
  const response = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board: getBoard()}),
  });
  const data = await response.json();
  if (data.error) {
    setMessage(data.error, 'error');
    return;
  }
  const index = data.row * SIZE + data.column;
  const input = document.querySelectorAll('#sudoku-board input')[index];
  input.value = data.value;
  input.disabled = true;
  input.classList.remove('incorrect', 'live-conflict');
  input.classList.add('hinted');
  hintCount += 1;
  updateLiveConflicts();
  setMessage('');
  verifyCompletedBoard();
}

window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('difficulty').addEventListener('change', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', requestHint);
  document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    setDarkMode(isDark);
    try {
      window.localStorage.setItem('sudoku-dark-mode', String(isDark));
    } catch {
    }
  });
  document.getElementById('leaderboard-filter').addEventListener('change', () => {
    highlightedScoreId = null;
    renderLeaderboard();
  });
  try {
    setDarkMode(window.localStorage.getItem('sudoku-dark-mode') === 'true');
  } catch {
    setDarkMode(false);
  }
  loadLeaderboard();
  newGame();
});
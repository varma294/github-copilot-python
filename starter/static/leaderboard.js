(function (root, factory) {
  const leaderboard = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = leaderboard;
  } else {
    root.SudokuLeaderboard = leaderboard;
  }
})(globalThis, () => {
  const STORAGE_KEY = 'sudoku-leaderboard';
  const DIFFICULTIES = ['easy', 'medium', 'hard'];
  const LIMIT = 10;

  function createEmptyLeaderboard() {
    return {easy: [], medium: [], hard: []};
  }

  function isValidScore(score, difficulty) {
    return score && typeof score.id === 'string' &&
      typeof score.name === 'string' &&
      Number.isSafeInteger(score.time) && score.time >= 0 &&
      score.difficulty === difficulty &&
      Number.isSafeInteger(score.hints) && score.hints >= 0;
  }

  function load(storage) {
    const leaderboard = createEmptyLeaderboard();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return leaderboard;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return leaderboard;
      }
      for (const difficulty of DIFFICULTIES) {
        if (!Array.isArray(parsed[difficulty])) continue;
        leaderboard[difficulty] = parsed[difficulty]
          .filter((score) => isValidScore(score, difficulty))
          .sort((first, second) => first.time - second.time)
          .slice(0, LIMIT);
      }
    } catch {
      return createEmptyLeaderboard();
    }
    return leaderboard;
  }

  function save(leaderboard, storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
      return true;
    } catch {
      return false;
    }
  }

  function rankScore(leaderboard, score) {
    if (!DIFFICULTIES.includes(score.difficulty) ||
        !isValidScore(score, score.difficulty)) {
      return {leaderboard, included: false};
    }
    const ranked = [...leaderboard[score.difficulty], score]
      .sort((first, second) => first.time - second.time)
      .slice(0, LIMIT);
    const nextLeaderboard = {...leaderboard, [score.difficulty]: ranked};
    return {
      leaderboard: nextLeaderboard,
      included: ranked.some((entry) => entry.id === score.id),
    };
  }

  function getVisibleScores(leaderboard, difficulty) {
    const scores = difficulty === 'all'
      ? DIFFICULTIES.flatMap((level) => leaderboard[level])
      : leaderboard[difficulty] || [];
    return [...scores].sort((first, second) => first.time - second.time);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  return {
    STORAGE_KEY,
    createEmptyLeaderboard,
    formatTime,
    getVisibleScores,
    load,
    rankScore,
    save,
  };
});
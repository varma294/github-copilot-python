const test = require('node:test');
const assert = require('node:assert/strict');
const leaderboard = require('../static/leaderboard.js');

function score(id, difficulty, time) {
  return {id, name: id, time, difficulty, hints: 0};
}

test('keeps the ten fastest entries independently for each difficulty', () => {
  let scores = leaderboard.createEmptyLeaderboard();
  for (let time = 20; time >= 1; time--) {
    scores = leaderboard.rankScore(scores, score(`easy-${time}`, 'easy', time)).leaderboard;
  }
  scores = leaderboard.rankScore(scores, score('hard-score', 'hard', 100)).leaderboard;
  assert.deepEqual(scores.easy.map((entry) => entry.time),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(scores.hard.length, 1);
  assert.equal(scores.medium.length, 0);
});

test('reports whether a score made the Top 10', () => {
  let scores = leaderboard.createEmptyLeaderboard();
  for (let time = 10; time >= 1; time--) {
    scores = leaderboard.rankScore(scores, score(`entry-${time}`, 'medium', time)).leaderboard;
  }
  const faster = leaderboard.rankScore(scores, score('new-fastest', 'medium', 0));
  const slower = leaderboard.rankScore(scores, score('too-slow', 'medium', 11));
  assert.equal(faster.included, true);
  assert.equal(faster.leaderboard.medium[0].id, 'new-fastest');
  assert.equal(slower.included, false);
  assert.equal(slower.leaderboard.medium.length, 10);
});

test('loads corrupted or unavailable storage without throwing', () => {
  const corruptedStorage = {getItem: () => '{not json'};
  const unavailableStorage = {getItem: () => { throw new Error('blocked'); }};
  assert.deepEqual(leaderboard.load(corruptedStorage), leaderboard.createEmptyLeaderboard());
  assert.deepEqual(leaderboard.load(unavailableStorage), leaderboard.createEmptyLeaderboard());
  assert.equal(leaderboard.save({}, {
    setItem: () => { throw new Error('blocked'); },
  }), false);
});

test('filters entries and formats elapsed times', () => {
  const scores = {
    ...leaderboard.createEmptyLeaderboard(),
    easy: [score('easy', 'easy', 90)],
    hard: [score('hard', 'hard', 30)],
  };
  assert.deepEqual(leaderboard.getVisibleScores(scores, 'all')
    .map((entry) => entry.id), ['hard', 'easy']);
  assert.deepEqual(leaderboard.getVisibleScores(scores, 'easy')
    .map((entry) => entry.id), ['easy']);
  assert.equal(leaderboard.formatTime(90), '01:30');
});
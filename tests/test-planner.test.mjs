import test from 'node:test';
import assert from 'node:assert/strict';
import { TEST_PLANNER } from '../test-planner.js';

test('Yakeen NEET 3.0 planner includes all 22 source tests in date order', () => {
  assert.equal(TEST_PLANNER.tests.length, 22);
  assert.deepEqual(TEST_PLANNER.tests.map(t => t.number), Array.from({length: 22}, (_, i) => i + 1));
  assert.deepEqual(TEST_PLANNER.tests.map(t => t.date), [...TEST_PLANNER.tests.map(t => t.date)].sort());
});

test('every test has subject-wise syllabus for all four NEET sections', () => {
  for (const testCase of TEST_PLANNER.tests) {
    assert.ok(testCase.title && testCase.date && testCase.type, 'test metadata must be present');
    for (const subject of ['Physics', 'Chemistry', 'Botany', 'Zoology']) {
      assert.ok(Array.isArray(testCase.syllabus[subject]), `missing ${subject} syllabus in test ${testCase.number}`);
      assert.ok(testCase.syllabus[subject].length > 0, `empty ${subject} syllabus in test ${testCase.number}`);
    }
  }
});

test('October 25 Rank Booster Test-1 preserves the listed cumulative chapters', () => {
  const t = TEST_PLANNER.tests.find(row => row.date === '2026-10-25');
  assert.equal(t.title, 'Rank Booster Test-1');
  assert.ok(t.syllabus.Physics.includes('Vectors'));
  assert.ok(t.syllabus.Chemistry.includes('Redox Reaction'));
  assert.ok(t.syllabus.Botany.includes('The Living World'));
  assert.ok(t.syllabus.Zoology.includes('Breathing and Exchange of Gases'));
});

test('full-syllabus labels from the source are retained instead of inventing chapters', () => {
  for (const number of [14, 16]) {
    const t = TEST_PLANNER.tests.find(row => row.number === number);
    for (const subject of ['Physics', 'Chemistry', 'Botany', 'Zoology']) {
      assert.equal(t.syllabus[subject][0], 'Full Syllabus');
    }
  }
  for (const number of [18, 19, 20, 21, 22]) {
    const t = TEST_PLANNER.tests.find(row => row.number === number);
    for (const subject of ['Physics', 'Chemistry', 'Botany', 'Zoology']) {
      assert.equal(t.syllabus[subject][0], 'Full Syllabus as per NTA');
    }
  }
});

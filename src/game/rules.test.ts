import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  toggleLoadItem,
  rowBoat,
  undoLastMove,
  calculateStars,
  getSocraticHint,
  DEMO_STEPS,
} from './rules';

test('initial state places all 3 items on left bank with empty boat', () => {
  const state = createInitialState();
  assert.deepEqual(state.leftBank, ['cabbage', 'wolf', 'goat']);
  assert.deepEqual(state.rightBank, []);
  assert.equal(state.boatPassenger, null);
  assert.equal(state.boatSide, 'left');
  assert.equal(state.moves, 0);
  assert.equal(state.conflict, 'none');
  assert.equal(state.isVictory, false);
});

test('loading, unloading, and swapping items on current bank works cleanly', () => {
  let state = createInitialState();

  // Load cabbage
  state = toggleLoadItem(state, 'cabbage');
  assert.equal(state.boatPassenger, 'cabbage');
  assert.deepEqual(state.leftBank, ['wolf', 'goat']);

  // Swap cabbage with goat directly
  state = toggleLoadItem(state, 'goat');
  assert.equal(state.boatPassenger, 'goat');
  assert.deepEqual(state.leftBank, ['cabbage', 'wolf']);

  // Unload goat back to left bank
  state = toggleLoadItem(state, 'goat');
  assert.equal(state.boatPassenger, null);
  assert.deepEqual(state.leftBank, ['cabbage', 'wolf', 'goat']);
});

test('rowing away leaving wolf and goat triggers wolf_eats_goat conflict and undo restores state', () => {
  let state = createInitialState();
  state = toggleLoadItem(state, 'cabbage');
  state = rowBoat(state);

  assert.equal(state.conflict, 'wolf_eats_goat');
  assert.equal(state.conflictBank, 'left');
  assert.equal(state.moves, 1);

  // Undo restores previous valid state
  const restored = undoLastMove(state);
  assert.equal(restored.conflict, 'none');
  assert.equal(restored.moves, 0);
  assert.equal(restored.boatSide, 'left');
  assert.equal(restored.boatPassenger, 'cabbage');
});

test('rowing away leaving goat and cabbage triggers goat_eats_cabbage conflict', () => {
  let state = createInitialState();
  state = toggleLoadItem(state, 'wolf');
  state = rowBoat(state);

  assert.equal(state.conflict, 'goat_eats_cabbage');
  assert.equal(state.conflictBank, 'left');
  assert.equal(state.moves, 1);
});

test('optimal 7-step solution via DEMO_STEPS achieves victory with 3 stars', () => {
  let state = createInitialState();

  for (const step of DEMO_STEPS) {
    // Unload current passenger if needed before loading step.loadItem
    if (state.boatPassenger !== step.loadItem) {
      if (state.boatPassenger !== null && step.loadItem === null) {
        state = toggleLoadItem(state, state.boatPassenger);
      } else if (step.loadItem !== null) {
        state = toggleLoadItem(state, step.loadItem);
      }
    }
    state = rowBoat(state);
    if (step.stepNumber < 7) {
      assert.equal(state.conflict, 'none', `Step ${step.stepNumber} should have no conflict`);
      assert.equal(state.isVictory, false, `Step ${step.stepNumber} should not win early`);
    }
  }

  assert.equal(state.moves, 7);
  assert.equal(state.conflict, 'none');
  assert.equal(state.isVictory, true);
  assert.deepEqual(state.rightBank, ['cabbage', 'wolf', 'goat']);
  assert.deepEqual(state.leftBank, []);
  assert.equal(state.boatPassenger, null);
  assert.equal(calculateStars(state.moves), 3);
});

test('Socratic hint highlights the step 4 return trick when 2 items including goat are on right bank', () => {
  let state = createInitialState();
  // Step 1: Goat -> Right (auto-disembarks onto right bank)
  state = toggleLoadItem(state, 'goat');
  state = rowBoat(state);
  // Step 2: Empty -> Left
  state = rowBoat(state);
  // Step 3: Wolf -> Right (auto-disembarks onto right bank)
  state = toggleLoadItem(state, 'wolf');
  state = rowBoat(state);

  const hint = getSocraticHint(state);
  assert.ok(
    hint.message.includes('BOLEH dibawa balik lagi') ||
      hint.keyInsight.includes('Kambing kembali ke perahu'),
  );
});

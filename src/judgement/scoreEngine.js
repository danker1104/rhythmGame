import { HP_CHANGES, JUDGEMENT_WEIGHTS, RULESET_VERSION } from '../config/gameConfig.js';

export function createScoreState(totalTargets) {
  if (!Number.isInteger(totalTargets) || totalTargets <= 0) {
    throw new RangeError('Score requires a positive target count');
  }
  return {
    totalTargets,
    judgedCount: 0,
    weightedSum: 0,
    score: 0,
    accuracy: 0,
    combo: 0,
    maxCombo: 0,
    hp: 100,
    failed: false,
    judgements: { perfect: 0, great: 0, good: 0, miss: 0 },
    rulesetVersion: RULESET_VERSION,
  };
}

export function applyJudgement(state, judgement) {
  if (!(judgement in JUDGEMENT_WEIGHTS)) throw new Error(`Unknown judgement: ${judgement}`);

  const combo = judgement === 'miss' ? 0 : state.combo + 1;
  const maxCombo = Math.max(state.maxCombo, combo);
  const weightedSum = state.weightedSum + JUDGEMENT_WEIGHTS[judgement];
  const accuracy = weightedSum / state.totalTargets;
  const comboRatio = maxCombo / state.totalTargets;
  const hp = Math.min(100, Math.max(0, state.hp + HP_CHANGES[judgement]));

  return {
    ...state,
    judgedCount: state.judgedCount + 1,
    weightedSum,
    score: Math.min(1_000_000, Math.max(0, Math.round(accuracy * 900_000 + comboRatio * 100_000))),
    accuracy,
    combo,
    maxCombo,
    hp,
    failed: state.failed || hp === 0,
    judgements: { ...state.judgements, [judgement]: state.judgements[judgement] + 1 },
  };
}


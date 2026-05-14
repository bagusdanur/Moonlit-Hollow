import { LEVELS } from '.';

const COMPLETED_LEVELS_KEY = 'moonlit-completed-levels';

export function getCompletedLevels() {
  try {
    const saved = window.localStorage.getItem(COMPLETED_LEVELS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function completeLevel(levelId: string) {
  const completed = new Set(getCompletedLevels());

  completed.add(levelId);
  window.localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify([...completed]));
}

export function isLevelCompleted(levelId: string) {
  return getCompletedLevels().includes(levelId);
}

export function isLevelUnlocked(levelId: string) {
  const index = LEVELS.findIndex((level) => level.id === levelId);

  if (index <= 0) {
    return true;
  }

  return isLevelCompleted(LEVELS[index - 1].id);
}

export function getContinueLevelId() {
  const nextLevel = LEVELS.find((level) => isLevelUnlocked(level.id) && !isLevelCompleted(level.id));

  return nextLevel?.id ?? LEVELS.at(-1)?.id ?? LEVELS[0].id;
}

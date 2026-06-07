const storageKeys = {
    correct: "sqlCorrect",
    attempted: "sqlAttempted",
    xp: "sqlXp",
    streak: "sqlStreak"
};

let state = {
    correct: Number(localStorage.getItem(storageKeys.correct) || 0),
    attempted: Number(localStorage.getItem(storageKeys.attempted) || 0),
    xp: Number(localStorage.getItem(storageKeys.xp) || 0),
    streak: Number(localStorage.getItem(storageKeys.streak) || 0)
};

export function recordRun(isCorrect) {
    state.attempted += 1;
    state.correct += isCorrect ? 1 : 0;
    state.streak = isCorrect ? state.streak + 1 : 0;
    state.xp += isCorrect ? 35 : 8;
    persist();
    renderProgress();
}

export function recordQuiz(isCorrect) {
    state.xp += isCorrect ? 15 : 4;
    state.streak = isCorrect ? state.streak + 1 : 0;
    persist();
    renderProgress();
}

export function resetProgress() {
    state = { correct: 0, attempted: 0, xp: 0, streak: 0 };
    persist();
    renderProgress();
}

export function renderProgress() {
    const level = Math.floor(state.xp / 100) + 1;
    const progress = state.xp % 100;
    setText("xpText", state.xp);
    setText("levelText", `Lv ${level}`);
    setText("streakText", state.streak);
    setText("sqlScore", `${state.correct}/${state.attempted}`);
    const xpBar = document.getElementById("xpBar");
    if (xpBar) xpBar.style.width = `${progress}%`;
    unlock("badgeFirstRun", state.attempted > 0);
    unlock("badgeJoin", state.xp >= 70);
    unlock("badgeAggregate", state.correct >= 3);
    unlock("badgeLevel", level >= 3);
}

function persist() {
    localStorage.setItem(storageKeys.correct, state.correct);
    localStorage.setItem(storageKeys.attempted, state.attempted);
    localStorage.setItem(storageKeys.xp, state.xp);
    localStorage.setItem(storageKeys.streak, state.streak);
}

function unlock(id, active) {
    document.getElementById(id)?.classList.toggle("unlocked", active);
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.innerText = value;
}

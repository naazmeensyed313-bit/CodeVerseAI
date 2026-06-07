import { algorithmDetails, algorithmIntros, algorithmNames, quizQuestions } from './algorithms-data.js';

export const ui = {
    explanation: document.getElementById("explanation"),
    comparisons: document.getElementById("comparisons"),
    swaps: document.getElementById("swaps"),
    status: document.getElementById("sceneStatus"),
    executionFlow: document.getElementById("executionFlow"),
    arrayValues: document.getElementById("arrayValues"),
    doubtAnswer: document.getElementById("doubtAnswer")
};

export function updateStats(comps, swaps, step) {
    ui.comparisons.innerText = comps;
    ui.swaps.innerText = swaps;
    const pass = document.getElementById("currentPass");
    if (pass) pass.innerText = step;
}

export function updateStatus(text) {
    ui.status.innerText = text;
}

export function renderArrayValues(values) {
    ui.arrayValues.innerHTML = values
        .map(v => `<span class="px-3 py-2 rounded-xl bg-white/5 border border-white/10">${v}</span>`)
        .join("");
}

export function renderExecutionFlow(steps) {
    ui.executionFlow.innerHTML = steps
        .map(s => `<div class="execution-step rounded-2xl p-4">${escapeHtml(s)}</div>`)
        .join("");
}

function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

export function updateComplexity(algo) {
    const complexities = {
        "Bubble Sort": ["O(n^2)", "O(1)"],
        "Selection Sort": ["O(n^2)", "O(1)"],
        "Insertion Sort": ["O(n^2)", "O(1)"],
        "Quick Sort": ["O(n log n)", "O(log n)"],
        "Merge Sort": ["O(n log n)", "O(n)"]
    };
    document.getElementById("timeComplexity").innerText = complexities[algo][0];
    document.getElementById("spaceComplexity").innerText = complexities[algo][1];
}

export function renderAlgorithmCards(onSelect) {
    document.querySelectorAll("[data-algorithm-card]").forEach(card => {
        const name = card.dataset.algorithmCard;
        const details = algorithmDetails[name];
        card.innerHTML = `
            <p class="mb-2 text-lg font-semibold text-white">${name}</p>
            <p class="mb-4 text-sm text-gray-400">${algorithmIntros[name]}</p>
            <div class="grid gap-2 text-xs text-gray-400">
                <p><span class="text-purple-200">Time:</span> ${details.time}</p>
                <p><span class="text-sky-200">Space:</span> ${details.space}</p>
            </div>
        `;
        card.onclick = () => onSelect(name);
    });
}

export function localDoubtAnswer(selectedAlgorithm, question) {
    const lower = question.toLowerCase();
    if (lower.includes("swap")) return "A swap happens when values are in the wrong order. The animation shows the correction.";
    if (lower.includes("pivot")) return "The pivot is the reference point. Smaller values go left, larger go right.";
    return algorithmIntros[selectedAlgorithm] || "Ask about swaps, pivots, or complexity.";
}

export function updateProgressUI(progress) {
    const total = Math.min(100, (progress.runs * 12) + (progress.algorithms.length * 7));
    const level = Math.floor(total / 34) + 1;
    document.getElementById("progressPercent").innerText = `${total}%`;
    document.getElementById("progressBar").style.width = `${total}%`;
    document.getElementById("runsCompleted").innerText = progress.runs;
    document.getElementById("levelText").innerText = `Lv ${level}`;
}

export function loadQuizQuestion(index, onAnswer) {
    const quiz = quizQuestions[index];
    const qText = document.getElementById("quizQuestion");
    const qOpts = document.getElementById("quizOptions");
    qText.innerText = quiz.question;
    document.getElementById("quizFeedback").innerText = "";
    qOpts.innerHTML = quiz.options.map((opt, i) => `
        <button type="button" class="quiz-option rounded-2xl px-4 py-3 transition hover:bg-white/10" id="opt-${i}">
            ${opt}
        </button>
    `).join("");
    quiz.options.forEach((_, i) => {
        document.getElementById(`opt-${i}`).onclick = () => onAnswer(i);
    });
}

export async function speakText(text, voiceMode) {
    if (!voiceMode || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(text.replace(/\n+/g, ". "));
    message.rate = 0.95;
    return new Promise(resolve => {
        message.onend = resolve;
        window.speechSynthesis.speak(message);
    });
}

export function explainCurrentCounters(comps, swaps) {
    if (comps && swaps) return `${comps} comparisons, ${swaps} swaps so far.`;
    return "Watch the highlighted blocks for the current operation.";
}

export function renderChallenge(challenge, onAnswer) {
    const title = document.getElementById("pracChallengeTitle");
    const text = document.getElementById("pracChallengeText");
    const opts = document.getElementById("pracChallengeOptions");
    const feedback = document.getElementById("pracChallengeFeedback");
    if (!title || !text || !opts) return;

    if (feedback) feedback.classList.add("hidden");

    title.innerText = challenge.title;
    text.innerText = challenge.text;
    opts.innerHTML = challenge.options.map((opt, i) => `
        <button type="button" class="quiz-option rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10"
            id="prac-opt-${i}">${escapeHtml(opt)}</button>
    `).join("");

    challenge.options.forEach((_, i) => {
        const btn = document.getElementById(`prac-opt-${i}`);
        if (btn) btn.onclick = () => onAnswer(i);
    });
}

export function showChallengeFeedback(isCorrect, concept) {
    const feedback = document.getElementById("pracChallengeFeedback");
    if (!feedback) return;
    feedback.innerText = isCorrect ? `Correct! ${concept}` : "Not quite. Think about the algorithm logic and try again.";
    feedback.className = `mt-4 p-4 rounded-2xl text-sm font-medium ${isCorrect ? "bg-green-500/20 text-green-200 border border-green-500/30" : "bg-pink-500/20 text-pink-200 border border-pink-500/30"}`;
    feedback.classList.remove("hidden");
}
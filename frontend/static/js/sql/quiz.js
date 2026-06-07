import { recordQuiz } from "./progress.js";

const quizzes = [
    { q: "Which clause filters rows?", options: ["ORDER BY", "WHERE", "SELECT"], answer: "WHERE" },
    { q: "Which function counts rows?", options: ["AVG", "COUNT", "JOIN"], answer: "COUNT" },
    { q: "Which join keeps all rows from the left table?", options: ["LEFT JOIN", "INNER JOIN", "GROUP BY"], answer: "LEFT JOIN" },
    { q: "Which clause groups rows before aggregates?", options: ["GROUP BY", "DELETE", "ORDER BY"], answer: "GROUP BY" },
    { q: "Which shortcut runs the query in this playground?", options: ["Ctrl+Enter", "Ctrl+S", "Alt+Tab"], answer: "Ctrl+Enter" }
];

let quizIndex = 0;
let locked = false;

export function renderQuiz() {
    locked = false;
    const quiz = quizzes[quizIndex % quizzes.length];
    setText("quizCounter", `Question ${(quizIndex % quizzes.length) + 1}`);
    setText("quizQuestion", quiz.q);
    const options = document.getElementById("quizOptions");
    if (!options) return;
    options.innerHTML = quiz.options.map(option => `
        <button type="button" data-action="answer-quiz" data-answer="${escapeAttribute(option)}"
            class="quiz-option rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10">
            ${escapeHtml(option)}
        </button>
    `).join("");
    setText("sqlQuiz", "");
}

export function answerQuiz(answer) {
    if (locked) return;
    locked = true;
    const quiz = quizzes[quizIndex % quizzes.length];
    const isCorrect = answer === quiz.answer;
    document.querySelectorAll(".quiz-option").forEach(button => {
        button.classList.toggle("correct", button.innerText.trim() === quiz.answer);
        button.classList.toggle("wrong", button.innerText.trim() === answer && !isCorrect);
        button.setAttribute("disabled", "true");
    });
    setText("sqlQuiz", isCorrect ? `Correct. ${quiz.answer} is the right choice.` : `Not quite. The answer is ${quiz.answer}.`);
    recordQuiz(isCorrect);
    quizIndex += 1;
    window.setTimeout(renderQuiz, 1100);
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.innerText = value;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

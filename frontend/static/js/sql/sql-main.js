import {
    challenges,
    conceptCopy,
    executeQuery,
    explainLocally,
    inferChart,
    initDatabase,
    resetDatabase,
    tablesFromQuery,
    validateAgainstChallenge
} from "./database.js";
import { setTutorText, askTutor, toggleVoice } from "./ai.js";
import { updateChart } from "./chart.js";
import { renderProgress, recordRun, resetProgress } from "./progress.js";
import { answerQuiz, renderQuiz } from "./quiz.js";
import { animateExecution, highlightTables, initScene, renderExecutionSteps } from "./scene.js";

let editor = null;
let challengeIndex = 0;
let currentChallengeIndex = 0;
let lastExecution = null;
let lastError = "";
let isRunning = false;

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
    bindActions();
    renderProgress();
    renderQuiz();
    renderConceptCards();
    renderExecutionSteps([]);
    renderRows([]);
    updateChart([], null);
    initScene();

    try {
        await initDatabase();
        await initMonaco();
        loadChallenge();
        showToast("SQLite engine ready", "success");
    } catch (error) {
        console.error(error);
        showToast("SQL engine failed to initialize. Check network/CDN access.", "error");
        setTutorText("The SQL engine could not start. Refresh once, and check your connection to the sql.js CDN.", false);
    }
}

function bindActions() {
    document.addEventListener("click", async event => {
        const control = event.target.closest("[data-action]");
        if (!control) return;
        const action = control.dataset.action;
        if (control.matches("button")) control.blur();

        try {
            if (action === "switch-tab") switchTab(control.dataset.tab, control);
            if (action === "load-challenge") loadChallenge();
            if (action === "reset-progress") resetSql();
            if (action === "run-query") await runQuery();
            if (action === "fill-answer") fillAnswer();
            if (action === "explain-query") await explainQuery();
            if (action === "fix-query") await fixQuery();
            if (action === "toggle-voice") toggleVoice();
            if (action === "ask-doubt") await answerDoubt();
            if (action === "select-concept") selectConcept(control.dataset.concept);
            if (action === "open-concept") openConceptChallenge(control.dataset.concept);
            if (action === "answer-quiz") answerQuiz(control.dataset.answer);
        } catch (error) {
            console.error(error);
            showToast(error.message || "Something went wrong.", "error");
        }
    });

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            runQuery();
        }
    });
}

function initMonaco() {
    return new Promise((resolve, reject) => {
        if (!window.require) {
            reject(new Error("Monaco loader is unavailable."));
            return;
        }
        window.require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
        window.require(["vs/editor/editor.main"], () => {
            const editorHost = document.getElementById("editor");
            if (!editorHost) {
                reject(new Error("Editor container is missing."));
                return;
            }
            if (editor) editor.dispose();
            registerSqlCompletions();
            editor = monaco.editor.create(editorHost, {
                value: challenges[0].query,
                language: "sql",
                theme: "vs-dark",
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: true,
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                wordWrap: "on",
                tabSize: 2
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runQuery());
            resolve(editor);
        }, reject);
    });
}

function registerSqlCompletions() {
    if (window.__codeVerseSqlCompletionRegistered) return;
    monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: () => ({
            suggestions: [
                "SELECT", "FROM", "WHERE", "ORDER BY", "GROUP BY", "COUNT", "AVG",
                "INNER JOIN", "LEFT JOIN", "INSERT", "UPDATE", "DELETE", "students",
                "courses", "enrollments", "score", "city", "credits", "status"
            ].map(word => ({
                label: word,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: word
            }))
        })
    });
    window.__codeVerseSqlCompletionRegistered = true;
}

function getQuery() {
    return editor ? editor.getValue() : "";
}

function setQuery(value) {
    if (editor) editor.setValue(value);
}

function switchTab(tab, button) {
    if (!tab) return;
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));
    document.getElementById(`${tab}Tab`)?.classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    button?.classList.add("active");
    if (tab === "practice" && editor) window.setTimeout(() => editor.layout(), 80);
}

function loadChallenge() {
    const challenge = challenges[challengeIndex];
    currentChallengeIndex = challengeIndex;
    setText("challengeText", challenge.text);
    setQuery(challenge.query);
    renderExecutionSteps([]);
    renderRows([]);
    updateChart([], null);
    setTutorText("Read the goal, inspect the sample schema, then run the query to see real SQLite execute step by step.", false);
    highlightTables(tablesFromQuery(challenge.query));
    challengeIndex = (challengeIndex + 1) % challenges.length;
}

function fillAnswer() {
    const challenge = challenges[currentChallengeIndex];
    setQuery(challenge.query);
    setTutorText(`${challenge.concept}: ${conceptCopy[challenge.concept]}`, true);
    showToast("Pattern loaded into the editor", "info");
}

async function runQuery() {
    if (isRunning) return;
    isRunning = true;
    setLoading("runQueryBtn", true, "Running...");
    lastError = "";
    const query = getQuery();
    const challenge = challenges[currentChallengeIndex];

    try {
        highlightTables(tablesFromQuery(query));
        const execution = executeQuery(query);
        lastExecution = execution;
        await animateExecution(query);
        const validation = validateAgainstChallenge(query, challenge);
        const displayRows = execution.rows.length ? execution.rows : mutationPreviewRows(execution, challenge);

        renderRows(displayRows);
        updateChart(displayRows, inferChart(displayRows, challenge.chart));
        recordRun(validation.isCorrect);
        setTutorText(explainLocally(query, execution, challenge, validation.isCorrect), true);
        showToast(`${validation.isCorrect ? "Challenge passed" : "Query executed"} - ${execution.summary}`, validation.isCorrect ? "success" : "info");
    } catch (error) {
        lastError = error.message || String(error);
        renderRows([]);
        updateChart([], null);
        setTutorText(`SQLite could not run that query: ${lastError}`, true);
        showToast(lastError, "error");
    } finally {
        setLoading("runQueryBtn", false, "Run Query");
        isRunning = false;
    }
}

async function explainQuery() {
    const query = getQuery();
    if (!query.trim()) {
        showToast("Write a query first.", "info");
        return;
    }
    setTutorText("Explaining your query...", false);
    const answer = await askTutor({
        action: "explain",
        query,
        execution: lastExecution,
        challenge: challenges[currentChallengeIndex]
    });
    setTutorText(answer, true);
}

async function fixQuery() {
    const query = getQuery();
    setTutorText("Looking for the smallest useful fix...", false);
    const answer = await askTutor({
        action: "fix",
        query,
        error: lastError,
        execution: lastExecution,
        challenge: challenges[currentChallengeIndex]
    });
    setTutorText(answer, true);
}

async function answerDoubt() {
    const question = document.getElementById("doubtInput")?.value.trim() || "";
    const target = document.getElementById("doubtAnswer");
    if (!question) {
        if (target) target.innerText = "Ask about a clause, a join, or the current query and I will explain it like a tutor.";
        return;
    }
    setLoading("askDoubtBtn", true, "Thinking...");
    if (target) target.innerText = "Thinking through your SQL question...";
    const answer = await askTutor({
        action: "doubt",
        question,
        query: getQuery(),
        error: lastError,
        execution: lastExecution,
        challenge: challenges[currentChallengeIndex]
    });
    if (target) target.innerText = answer;
    setLoading("askDoubtBtn", false, "Ask");
}

function resetSql() {
    resetDatabase();
    resetProgress();
    loadChallenge();
    lastExecution = null;
    lastError = "";
    showToast("Progress and SQLite data reset", "success");
}

function renderConceptCards() {
    document.querySelectorAll("[data-concept-card]").forEach(card => {
        const concept = card.dataset.conceptCard;
        const challenge = challenges.find(item => item.concept === concept) || challenges.find(item => item.query.includes(concept));
        card.innerHTML = `
            <div class="mb-3 flex items-center justify-between gap-3">
                <h3 class="text-xl font-semibold">${escapeHtml(concept)}</h3>
                <button type="button" data-action="open-concept" data-concept="${escapeHtml(concept)}"
                    class="rounded-xl border border-white/15 px-3 py-2 text-xs transition hover:bg-white/10">Practice</button>
            </div>
            <p class="mb-4 text-sm leading-relaxed text-gray-400">${escapeHtml(conceptCopy[concept] || "")}</p>
            <code class="block overflow-x-auto rounded-2xl bg-black/30 p-3 text-xs text-purple-100">${escapeHtml(challenge ? challenge.query : "SELECT COUNT(*) FROM students")}</code>
        `;
    });
}

function openConceptChallenge(concept) {
    const index = challenges.findIndex(challenge => challenge.concept === concept || challenge.query.toLowerCase().includes(String(concept).toLowerCase()));
    if (index >= 0) challengeIndex = index;
    const practiceButton = document.querySelector('[data-action="switch-tab"][data-tab="practice"]');
    switchTab("practice", practiceButton);
    loadChallenge();
}

function selectConcept(concept) {
    const conceptKey = concept === "JOIN" ? "INNER JOIN" : concept;
    const matchIndex = challenges.findIndex(challenge => challenge.concept === conceptKey || challenge.query.includes(concept));
    if (matchIndex >= 0) {
        currentChallengeIndex = matchIndex;
        challengeIndex = (matchIndex + 1) % challenges.length;
        const match = challenges[matchIndex];
        setText("challengeText", match.text);
        setQuery(match.query);
        highlightTables(tablesFromQuery(match.query));
    }
    const practiceButton = document.querySelector('[data-action="switch-tab"][data-tab="practice"]');
    switchTab("practice", practiceButton);
    setTutorText(conceptCopy[conceptKey] || "SQL concepts become easier when you connect the written query to the rows it produces.", true);
}

function renderRows(rows) {
    const resultHead = document.getElementById("resultHead");
    const resultBody = document.getElementById("resultBody");
    if (!resultHead || !resultBody) return;
    if (!rows.length) {
        resultHead.innerHTML = "";
        resultBody.innerHTML = `<tr><td class="p-4 text-gray-400">No result yet.</td></tr>`;
        return;
    }
    const columns = Object.keys(rows[0]);
    resultHead.innerHTML = `<tr>${columns.map(column => `<th class="p-4">${escapeHtml(column)}</th>`).join("")}</tr>`;
    resultBody.innerHTML = rows.map((row, rowIndex) => `
        <tr class="result-row ${rowIndex === 0 ? "highlight" : ""}" style="animation-delay:${rowIndex * 45}ms">
            ${columns.map(column => `<td class="p-4">${escapeHtml(formatCell(row[column]))}</td>`).join("")}
        </tr>
    `).join("");
}

function mutationPreviewRows(execution, challenge) {
    if (challenge.verifyQuery) {
        try {
            return executeQuery(challenge.verifyQuery).rows;
        } catch (error) {
            console.info("Could not render mutation verification preview:", error);
        }
    }
    return [{ status: execution.summary }];
}

function setLoading(id, loading, label) {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    button.innerText = label;
}

function showToast(message, tone = "info") {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const colors = {
        success: "text-green-200",
        error: "text-pink-200",
        info: "text-sky-200"
    };
    const toast = document.createElement("div");
    toast.className = `toast rounded-2xl px-4 py-3 text-sm ${colors[tone] || colors.info}`;
    toast.innerText = message;
    region.appendChild(toast);
    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-6px)";
        toast.style.transition = "all 220ms ease";
        window.setTimeout(() => toast.remove(), 260);
    }, 2600);
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.innerText = value;
}

function formatCell(value) {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
    return value;
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

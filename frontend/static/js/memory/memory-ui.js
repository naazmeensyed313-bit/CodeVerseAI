import { quizQuestions } from "./memory-data.js";

let memoryChart = null;
let cpuChart = null;
let quizIndex = 0;
let voiceEnabled = false;

export function renderAll(state, progress) {
    renderMemory(state);
    renderProcesses(state);
    renderProgress(progress);
    renderCharts(state);
}

export function renderMemory(state) {
    setText("memoryEvent", state.event);
    setText("stackCount", state.stack.length);
    setText("heapCount", state.heap.length);
    setText("ramCount", state.ram.filter(cell => cell.type === "used").length);
    setText("fragmentationText", `Fragmentation: ${state.fragmentation}%`);
    renderMeters(state);

    const stackArea = document.getElementById("stackArea");
    const heapArea = document.getElementById("heapArea");
    const ramArea = document.getElementById("ramArea");

    if (stackArea) {
        stackArea.innerHTML = state.stack.map((frame, index) => `
            <div class="memory-block ${index === state.stack.length - 1 ? "active-frame" : ""} rounded-2xl p-3">
                <p class="font-semibold">${frame.label}</p>
                <p class="text-xs text-gray-300">${frame.local || "local"} · ${frame.size} KB frame</p>
            </div>
        `).join("");
    }

    if (heapArea) {
        heapArea.innerHTML = state.heap.map(object => `
            <div class="memory-block heap-block rounded-2xl p-3">
                <p class="font-semibold">${object.id}</p>
                <p class="text-xs text-pink-100">${object.name || "HeapObject"}</p>
                <p class="text-xs text-gray-300">${object.size} KB</p>
                <p class="text-xs text-gray-400">${object.refs} refs</p>
            </div>
        `).join("");
    }

    if (ramArea) {
        ramArea.innerHTML = state.ram.map(cell => `
            <div class="memory-block ram-block ${cell.type === "hole" ? "hole-block" : ""} rounded-2xl p-3">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold">${cell.type === "used" ? cell.label : cell.type}</span>
                    <span class="text-xs text-gray-300">${cell.size} KB</span>
                </div>
            </div>
        `).join("");
    }
}

function renderMeters(state) {
    const stackPercent = Math.min(100, Math.round((state.stack.length / 6) * 100));
    const heapPercent = Math.min(100, Math.round((state.heap.length / 12) * 100));
    const ramPercent = Math.min(100, Math.round((state.ram.filter(cell => cell.type === "used").length / Math.max(1, state.ram.length)) * 100));
    setText("stackMeterText", `${stackPercent}%`);
    setText("heapMeterText", `${heapPercent}%`);
    setText("ramMeterText", `${ramPercent}%`);
    setWidth("stackMeter", `${stackPercent}%`);
    setWidth("heapMeter", `${heapPercent}%`);
    setWidth("ramMeter", `${ramPercent}%`);
}

export function renderProcesses(state) {
    const processList = document.getElementById("processList");
    const queueArea = document.getElementById("queueArea");
    const ganttChart = document.getElementById("ganttChart");

    if (processList) {
        processList.innerHTML = state.processes.map(process => `
            <article class="process-card ${state.activeProcess === process.id ? "active" : ""} rounded-2xl p-4">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-lg font-semibold">${process.id}</p>
                    <span class="rounded-full px-3 py-1 text-xs" style="background:${process.color}33;color:${process.color}">prio ${process.priority}</span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-400">
                    <p>Burst <span class="text-white">${process.burst} ms</span></p>
                    <p>Arrival <span class="text-white">${process.arrival} ms</span></p>
                </div>
            </article>
        `).join("");
    }

    if (queueArea) {
        queueArea.innerHTML = state.processes.map(process => `
            <span class="rounded-2xl border border-white/10 px-4 py-3 text-sm ${state.activeProcess === process.id ? "bg-green-500/20 text-green-100" : "bg-white/5 text-gray-300"}">${process.id}</span>
        `).join("");
    }

    if (ganttChart) {
        ganttChart.innerHTML = state.schedule.map((segment, index) => {
            const isVisible = state.scheduleCursor >= 0 && index <= state.scheduleCursor;
            return `
            <div class="gantt-segment ${isVisible ? "" : "upcoming"} ${index === state.scheduleCursor ? "ring-2 ring-green-300" : ""}" style="background:linear-gradient(135deg, ${segment.color}, rgba(14,165,233,.78)); flex:${Math.max(segment.duration, 1)}">
                <p class="font-semibold">${segment.id}</p>
                <p class="text-xs">${isVisible ? `${segment.start}-${segment.end} ms` : "queued"}</p>
            </div>
        `;
        }).join("");
    }

    setText("cpuProcess", state.activeProcess || "Idle");
    setText("avgWaiting", `${state.stats.avgWaiting} ms`);
    setText("avgTurnaround", `${state.stats.avgTurnaround} ms`);
}

export function renderEventLog(steps) {
    const target = document.getElementById("eventLog");
    if (!target) return;
    target.innerHTML = steps.map(step => `<li>${escapeHtml(step)}</li>`).join("");
}

export function setTutorNarration(text, shouldSpeak = true) {
    const target = document.getElementById("tutorAnswer");
    if (target) target.textContent = text;
    const sceneLesson = document.getElementById("sceneLesson");
    if (sceneLesson) sceneLesson.textContent = text;
    if (shouldSpeak) speak(text);
}

export function toggleVoiceNarration() {
    voiceEnabled = !voiceEnabled;
    const button = document.getElementById("memoryVoiceBtn");
    if (button) {
        button.textContent = voiceEnabled ? "Voice On" : "Voice Off";
        button.setAttribute("aria-pressed", String(voiceEnabled));
    }
    if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (voiceEnabled) speak(document.getElementById("tutorAnswer")?.textContent || "Voice narration enabled.");
}

export function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 260));
    utterance.rate = 0.95;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
}

export function renderProgress(progress) {
    const level = Math.floor(progress.xp / 100) + 1;
    const percent = progress.xp % 100;
    setText("levelText", `Lv ${level}`);
    setText("xpText", progress.xp);
    setText("quizScore", `${progress.quizCorrect}/${progress.quizAnswered}`);
    setText("actionCount", progress.actions);
    setWidth("xpBar", `${percent}%`);

    toggleBadge("badgeStack", progress.stackOps >= 3);
    toggleBadge("badgeHeap", progress.heapOps >= 3);
    toggleBadge("badgeCpu", progress.cpuRuns >= 1);
    toggleBadge("badgeQuiz", progress.quizCorrect >= 3);
}

export function renderQuiz(progress) {
    const item = quizQuestions[quizIndex];
    setText("quizCounter", `Question ${quizIndex + 1} of ${quizQuestions.length}`);
    setText("quizQuestion", item.question);
    setText("quizFeedback", "");
    const options = document.getElementById("quizOptions");
    if (!options) return;
    options.innerHTML = item.options.map(option => `
        <button type="button" class="quiz-option rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10"
            data-action="answer-quiz" data-answer="${escapeHtml(option)}">${option}</button>
    `).join("");
    renderProgress(progress);
}

export function handleQuizAnswer(answer, progress) {
    const item = quizQuestions[quizIndex];
    const isCorrect = answer === item.answer;
    document.querySelectorAll(".quiz-option").forEach(button => {
        button.disabled = true;
        if (button.dataset.answer === item.answer) button.classList.add("correct");
        if (button.dataset.answer === answer && !isCorrect) button.classList.add("wrong");
    });
    setText("quizFeedback", isCorrect ? item.detail : `Not quite. ${item.detail}`);
    window.setTimeout(() => {
        quizIndex = (quizIndex + 1) % quizQuestions.length;
        renderQuiz(progress);
    }, 1100);
    return isCorrect;
}

export function initCharts() {
    if (!window.Chart) return;
    const memoryCanvas = document.getElementById("memoryUsageChart");
    const cpuCanvas = document.getElementById("cpuUsageChart");
    if (memoryCanvas) {
        memoryChart = new Chart(memoryCanvas, {
            type: "doughnut",
            data: { labels: ["Stack", "Heap", "RAM Used", "RAM Free"], datasets: [{ data: [0, 0, 0, 10], backgroundColor: ["#a855f7", "#ec4899", "#0ea5e9", "#334155"], borderWidth: 0 }] },
            options: chartOptions()
        });
    }
    if (cpuCanvas) {
        cpuChart = new Chart(cpuCanvas, {
            type: "bar",
            data: { labels: ["CPU Usage", "Avg Waiting", "Avg Turnaround"], datasets: [{ data: [0, 0, 0], backgroundColor: ["#22c55e", "#a855f7", "#ec4899"], borderRadius: 8 }] },
            options: { ...chartOptions(), scales: { x: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.06)" } }, y: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.06)" }, beginAtZero: true } } }
        });
    }
}

export function renderCharts(state) {
    if (memoryChart) {
        const ramUsed = state.ram.filter(cell => cell.type === "used").length;
        const ramFree = state.ram.length - ramUsed;
        memoryChart.data.datasets[0].data = [state.stack.length, state.heap.length, ramUsed, ramFree];
        memoryChart.update();
    }
    if (cpuChart) {
        cpuChart.data.datasets[0].data = [state.stats.cpuUsage, state.stats.avgWaiting, state.stats.avgTurnaround];
        cpuChart.update();
    }
}

export function showToast(message, type = "info") {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = `toast rounded-2xl px-4 py-3 text-sm text-white ${type === "success" ? "border-green-400/40" : ""}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
}

export function switchTab(tab, button) {
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));
    document.getElementById(`${tab}Tab`)?.classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    button?.classList.add("active");
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#cbd5e1" } } }
    };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setWidth(id, value) {
    const element = document.getElementById(id);
    if (element) element.style.width = value;
}

function toggleBadge(id, unlocked) {
    document.getElementById(id)?.classList.toggle("unlocked", unlocked);
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

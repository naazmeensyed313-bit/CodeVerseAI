import { lessons } from "./memory-data.js";
import { answerMemoryQuestion } from "./memory-ai.js";
import { MemoryEngine } from "./memory-engine.js";
import {
    handleQuizAnswer,
    initCharts,
    renderAll,
    renderEventLog,
    renderQuiz,
    setTutorNarration,
    showToast,
    switchTab,
    toggleVoiceNarration
} from "./memory-ui.js";
import { initMemoryScene, playSceneAction, pulseTransfer, setCameraMode, syncMemoryScene } from "./memory-3d.js";

const engine = new MemoryEngine();
const progress = {
    xp: 0,
    actions: 0,
    stackOps: 0,
    heapOps: 0,
    cpuRuns: 0,
    quizAnswered: 0,
    quizCorrect: 0
};

let schedulerTimer = null;

document.addEventListener("DOMContentLoaded", boot);

function boot() {
    bindActions();
    initCharts();
    initMemoryScene();
    renderQuiz(progress);
    if (localStorage.getItem("codeverseMemoryTutorialDone") === "yes") {
        document.getElementById("tutorialOverlay")?.classList.add("hidden");
    }
    commit(engine.snapshot(), 0);
    showToast("Memory & CPU simulator ready", "success");
}

function bindActions() {
    document.addEventListener("click", event => {
        const control = event.target.closest("[data-action]");
        if (!control) return;
        const action = control.dataset.action;
        if (control.matches("button")) control.blur();

        if (action === "switch-tab") return switchTab(control.dataset.tab, control);
        if (action === "camera-mode") return setCameraMode(control.dataset.camera);
        if (action === "close-tutorial") return closeTutorial();
        if (action === "toggle-voice") return toggleVoiceNarration();
        if (action === "push-stack") return applyEngine(engine.pushStack(), "stack", action);
        if (action === "pop-stack") return applyEngine(engine.popStack(), "stack", action);
        if (action === "allocate-memory") return applyEngine(engine.allocateMemory(), "heap", action);
        if (action === "free-memory") return applyEngine(engine.freeMemory(), "heap", action);
        if (action === "garbage-collect") return applyEngine(engine.garbageCollect(), "heap", action);
        if (action === "fragment-memory") return applyEngine(engine.fragmentMemory(), "memory", action);
        if (action === "shuffle-processes") return applyEngine(engine.shuffleProcesses(), "cpu", action);
        if (action === "step-scheduling") return stepScheduling();
        if (action === "start-scheduling") return startScheduling();
        if (action === "reset-simulation") return resetSimulation();
        if (action === "ask-tutor") return askTutor();
        if (action === "answer-quiz") return answerQuiz(control.dataset.answer);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Enter" && document.activeElement?.id === "tutorInput") askTutor();
    });

    document.querySelectorAll("[data-concept-card]").forEach(card => {
        card.addEventListener("click", () => {
            const concept = card.dataset.conceptCard;
            document.getElementById("tutorAnswer").textContent = lessons[concept];
            showToast(`${concept.toUpperCase()} concept loaded`, "info");
        });
    });
}

function applyEngine(result, pulseKind, action) {
    progress.actions += 1;
    progress.xp += result.xp || 0;
    if (pulseKind === "stack") progress.stackOps += 1;
    if (pulseKind === "heap") progress.heapOps += 1;
    commit(result.state, result.xp || 0);
    playSceneAction(result.overflow ? "stack-overflow" : action, result.state);
    explainAction(result.overflow ? "stack-overflow" : action, result.state);
    pulseTransfer(pulseKind);
    showToast(result.state.event, result.overflow ? "error" : "info");
}

function stepScheduling() {
    const algorithm = document.getElementById("scheduleAlgorithm")?.value || "fcfs";
    if (!engine.schedule.length) engine.buildSchedule(algorithm);
    const result = engine.stepSchedule();
    progress.actions += 1;
    progress.xp += result.xp;
    progress.cpuRuns += 1;
    commit(result.state, result.xp);
    playSceneAction("step-scheduling", result.state);
    explainAction("step-scheduling", result.state);
    pulseTransfer("cpu");
}

function startScheduling() {
    window.clearInterval(schedulerTimer);
    const algorithm = document.getElementById("scheduleAlgorithm")?.value || "fcfs";
    let result = engine.buildSchedule(algorithm);
    progress.actions += 1;
    progress.cpuRuns += 1;
    progress.xp += result.xp;
    commit(result.state, result.xp);
    playSceneAction("start-scheduling", result.state);
    explainAction("start-scheduling", result.state);
    pulseTransfer("cpu");

    schedulerTimer = window.setInterval(() => {
        const next = engine.stepSchedule();
        progress.xp += next.xp;
        commit(next.state, next.xp);
        playSceneAction("step-scheduling", next.state);
        explainAction("step-scheduling", next.state);
        pulseTransfer("cpu");
        if (next.state.scheduleCursor >= next.state.schedule.length - 1) {
            window.clearInterval(schedulerTimer);
            showToast("Scheduling run completed", "success");
        }
    }, 850);
}

function closeTutorial() {
    document.getElementById("tutorialOverlay")?.classList.add("hidden");
    localStorage.setItem("codeverseMemoryTutorialDone", "yes");
    showToast("Guided lab unlocked", "success");
}

function resetSimulation() {
    window.clearInterval(schedulerTimer);
    progress.xp = 0;
    progress.actions = 0;
    progress.stackOps = 0;
    progress.heapOps = 0;
    progress.cpuRuns = 0;
    progress.quizAnswered = 0;
    progress.quizCorrect = 0;
    commit(engine.reset(), 0);
    renderQuiz(progress);
    renderEventLog(["System reset", "Stack cleared", "Heap cleared", "CPU scheduler returned to idle"]);
    setTutorNarration("System reset. Memory regions are clear and the CPU is idle.", true);
    showToast("Simulation reset", "info");
}

async function askTutor() {
    const input = document.getElementById("tutorInput");
    const answer = await answerMemoryQuestion(input?.value || "");
    setTutorNarration(answer, true);
    progress.xp += 4;
    commit(engine.snapshot(), 4);
}

function explainAction(action, state) {
    const algorithm = document.getElementById("scheduleAlgorithm")?.value || "fcfs";
    const active = state.activeProcess || "next process";
    const frame = state.stack[state.stack.length - 1];
    const object = state.heap[state.heap.length - 1];
    const explanations = {
        "push-stack": {
            text: `Function entered stack: ${frame?.label || "function"} became the active frame.`,
            steps: ["Function call created", "Stack pointer moved upward", "New frame stored local variables", "Active frame glows green"]
        },
        "pop-stack": {
            text: "Returning from function: the top stack frame is removed.",
            steps: ["Return instruction reached", "Top frame selected", "Local variables released", "Stack pointer moved downward"]
        },
        "stack-overflow": {
            text: "Stack overflow occurred because the stack limit was exceeded.",
            steps: ["Another function call tried to enter", "No stack slot was available", "Overflow warning fired", "Program would stop or throw an error"]
        },
        "allocate-memory": {
            text: `Heap allocation created ${object?.name || "an object"} and connected it to RAM.`,
            steps: ["Allocation request received", "Heap block reserved", "RAM cell mapped", "Blue transfer beam shows data movement"]
        },
        "free-memory": {
            text: "Freeing heap memory removes the object but leaves a visible hole.",
            steps: ["Object reference released", "Heap block removed", "Empty hole remains", "Fragmentation can increase"]
        },
        "garbage-collect": {
            text: "Garbage collection cleans unreachable objects and compacts memory.",
            steps: ["Heap scanned for references", "Unreachable blocks faded out", "Cleanup particles reclaimed memory", "RAM grid compacted"]
        },
        "fragment-memory": {
            text: "Fragmentation creates scattered gaps that make allocation harder.",
            steps: ["Memory map split into used and free cells", "Holes appear between blocks", "Fragmentation meter rises", "Large contiguous allocation becomes harder"]
        },
        "start-scheduling": {
            text: `${labelAlgorithm(algorithm)} scheduling started. Processes enter the ready queue.`,
            steps: ["Processes entered ready queue", "Scheduler selected an ordering rule", "Timeline prepared", "CPU waits for the first process"]
        },
        "step-scheduling": {
            text: `${active} is executing on the CPU. Green means active, yellow means waiting, blue means completed.`,
            steps: ["Scheduler dispatches a ready process", `${active} moves into CPU core`, "CPU pulse shows execution", "Completed work appears on the timeline"]
        }
    };
    const payload = explanations[action] || { text: state.event, steps: [state.event] };
    setTutorNarration(payload.text, true);
    renderEventLog(payload.steps);
}

function labelAlgorithm(value) {
    return { fcfs: "FCFS", sjf: "SJF", roundRobin: "Round Robin", priority: "Priority" }[value] || "FCFS";
}

function answerQuiz(answer) {
    const wasCorrect = handleQuizAnswer(answer, progress);
    progress.quizAnswered += 1;
    if (wasCorrect) {
        progress.quizCorrect += 1;
        progress.xp += 20;
        showToast("Quiz answer correct", "success");
    } else {
        progress.xp += 5;
        showToast("Good attempt. Review the explanation.", "info");
    }
    commit(engine.snapshot(), 0);
}

function commit(state) {
    renderAll(state, progress);
    syncMemoryScene(state);
    document.getElementById("sceneStatus").textContent = state.activeProcess
        ? `CPU executing ${state.activeProcess}`
        : `${state.stack.length} stack frames, ${state.heap.length} heap objects, ${state.fragmentation}% fragmentation`;
}

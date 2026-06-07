import { initScene, drawBlocks, animate, cinematicCamera, blocks, setBlockColor, addComparisonBeam, spawnSwapParticles, swapBlocksAnimation, updateMergedBlock, toggleBlockSelection, clearSelection, selectedIndices } from './algorithms-3d.js';
import { algorithmIntros, algorithmDetails, colors, quizQuestions, algorithmChallenges } from './algorithms-data.js';
import { ui, updateStats, updateStatus, renderArrayValues, renderExecutionFlow, updateComplexity, renderAlgorithmCards, updateProgressUI, loadQuizQuestion, speakText, explainCurrentCounters, localDoubtAnswer, renderChallenge, showChallengeFeedback } from './algorithms-ui.js';

let values = [], originalValues = [], comparisons = 0, swaps = 0, isSorting = false, isPaused = false, stepMode = false, stepRequested = false, stepCount = 0, voiceMode = false, sortCancelled = false, currentQuiz = 0;
let isPracticeMode = false;
const progress = JSON.parse(localStorage.getItem("algorithmProgress")) || { runs: 0, correct: 0, attempted: 0, algorithms: [], streak: 0 };

function boot() {
    initScene(() => { if (!isSorting) draw(); });
    renderAlgorithmCards(selectAlgorithm);
    generate();
    updateProgressUI(progress);
    updateAlgoInfo(false);
    loadQuiz();
    animate();
    bindEvents();
}

function bindEvents() {
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    bind("generateBtn", generate);
    bind("pracGenerateBtn", generate);
    bind("startBtn", start);
    bind("pracStartBtn", start);
    bind("pauseBtn", togglePause);
    bind("pracPauseBtn", togglePause);
    bind("nextBtn", next);
    bind("pracNextBtn", next);
    bind("resetBtn", reset);
    bind("pracResetBtn", reset);
    bind("voiceBtn", toggleVoice);
    bind("askDoubtBtn", answerDoubt);
    
    bind("pracCompareBtn", () => manualAction("compare"));
    bind("pracSwapBtn", () => manualAction("swap"));

    window.onBlockClick = (index) => {
        if (isPracticeMode) toggleBlockSelection(index);
    };

    document.getElementById("algorithm").onchange = () => updateAlgoInfo();
    document.getElementById("doubtInput").onkeydown = (e) => { if(e.key === 'Enter') answerDoubt(); };

    // Global handlers for remaining inline HTML attributes
    window.switchAlgorithmTab = (tab, btn) => {
        // UI switching
        const panels = ["visualizer", "learn", "practice"];
        panels.forEach(p => {
            const el = document.getElementById(`${p}Tab`);
            if (el) el.classList.add("hidden");
        });
        const targetPanel = document.getElementById(`${tab}Tab`);
        if (targetPanel) targetPanel.classList.remove("hidden");

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        if (btn) btn.classList.add("active");

        isPracticeMode = (tab === "practice");
        if (isPracticeMode) {
            stopCurrentSort();
            values = [...originalValues];
            draw();
            clearSelection();
            updateStatus("Practice Mode: Select blocks in the 3D scene to manually Compare or Swap.");
        }

        if (tab === "visualizer") cinematicCamera(0, 8.2, 16.5);
        else if (tab === "learn") cinematicCamera(0, 9, 18);
        else if (tab === "practice") loadChallenge();
    };
    window.updateArraySizeLabel = () => { document.getElementById("arraySizeLabel").innerText = document.getElementById("arraySize").value; };
    window.generateArray = generate;
}

function stopCurrentSort() {
    sortCancelled = true;
    isSorting = false;
    isPaused = false;
    clearSelection();
}

function generate() {
    if (isSorting) return;
    values = [];
    const size = Number(document.getElementById("arraySize").value);
    for (let i = 0; i < size; i++) values.push(Math.floor(Math.random() * 85) + 15);
    originalValues = [...values];
    comparisons = 0; swaps = 0; stepCount = 0;
    updateStats(0, 0, 0);
    draw();
    updateStatus("Array generated");
}

function draw() {
    const spacing = window.innerWidth < 768 ? 1.15 : 1.55;
    drawBlocks(values, spacing);
    renderArrayValues(values);
}

async function start() {
    if (isSorting) return;
    isSorting = true; sortCancelled = false; stepCount = 0;
    const algo = document.getElementById("algorithm").value;
    updateStatus(`Running ${algo}`);

    try {
        if (algo === "Bubble Sort") await bubbleSort();
        else if (algo === "Selection Sort") await selectionSort();
        else if (algo === "Insertion Sort") await insertionSort();
        else if (algo === "Quick Sort") await quickSort(0, values.length - 1);
        else if (algo === "Merge Sort") await mergeSort(0, values.length - 1);

        blocks.forEach(b => setBlockColor(b, colors.sorted));
        updateStatus("Completed");
        progress.runs++;
        localStorage.setItem("algorithmProgress", JSON.stringify(progress));
        updateProgressUI(progress);
    } catch (e) { console.log("Sort stopped"); }
    finally { isSorting = false; }
}

async function bubbleSort() {
    for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values.length - i - 1; j++) {
            comparisons++; updateStats(comparisons, swaps, stepCount);
            setBlockColor(blocks[j], colors.compare);
            setBlockColor(blocks[j + 1], colors.compare);
            addComparisonBeam(j, j + 1, colors.compare);
            await tutorStep("Compare", `Checking ${values[j]} vs ${values[j+1]}`);
            if (values[j] > values[j + 1]) {
                swaps++; spawnSwapParticles(j, j + 1);
                await swapBlocksAnimation(j, j + 1, values, getSpeed(), () => renderArrayValues(values));
            }
            setBlockColor(blocks[j], colors.normal);
            setBlockColor(blocks[j + 1], colors.normal);
        }
        setBlockColor(blocks[values.length - i - 1], colors.sorted);
    }
}

async function selectionSort() {
    for (let i = 0; i < values.length; i++) {
        let min = i; setBlockColor(blocks[min], colors.min);
        for (let j = i + 1; j < values.length; j++) {
            comparisons++; updateStats(comparisons, swaps, stepCount);
            setBlockColor(blocks[j], colors.compare);
            await tutorStep("Scan", `Checking if ${values[j]} is smaller than ${values[min]}`);
            if (values[j] < values[min]) {
                setBlockColor(blocks[min], colors.normal);
                min = j; setBlockColor(blocks[min], colors.min);
            } else setBlockColor(blocks[j], colors.normal);
        }
        if (min !== i) {
            swaps++; await swapBlocksAnimation(i, min, values, getSpeed(), () => renderArrayValues(values));
        }
        setBlockColor(blocks[i], colors.sorted);
    }
}

async function insertionSort() {
    if (blocks.length > 0) setBlockColor(blocks[0], colors.sorted);
    for (let i = 1; i < values.length; i++) {
        let current = i;
        setBlockColor(blocks[current], colors.compare);
        await tutorStep("Insert", `Taking ${values[current]} and inserting into sorted part.`);
        while (current > 0 && values[current - 1] > values[current]) {
            comparisons++; swaps++; updateStats(comparisons, swaps, stepCount);
            await swapBlocksAnimation(current - 1, current, values, getSpeed(), () => renderArrayValues(values));
            current--;
        }
        for (let k = 0; k <= i; k++) setBlockColor(blocks[k], colors.sorted);
    }
}

async function quickSort(low, high) {
    if (low >= high) {
        if (low >= 0 && low < blocks.length) setBlockColor(blocks[low], colors.sorted);
        return;
    }
    const pivotIdx = await partition(low, high);
    setBlockColor(blocks[pivotIdx], colors.sorted);
    await quickSort(low, pivotIdx - 1);
    await quickSort(pivotIdx + 1, high);
}

async function partition(low, high) {
    const pivotVal = values[high];
    let smallerIdx = low - 1;
    setBlockColor(blocks[high], colors.min);
    await tutorStep("Pivot", `Using ${pivotVal} as pivot to partition.`);
    for (let i = low; i < high; i++) {
        comparisons++; updateStats(comparisons, swaps, stepCount);
        setBlockColor(blocks[i], colors.compare);
        if (values[i] < pivotVal) {
            smallerIdx++;
            if (smallerIdx !== i) {
                swaps++; await swapBlocksAnimation(smallerIdx, i, values, getSpeed(), () => renderArrayValues(values));
            }
        }
        setBlockColor(blocks[i], colors.normal);
    }
    const finalPivot = smallerIdx + 1;
    if (finalPivot !== high) {
        swaps++; await swapBlocksAnimation(finalPivot, high, values, getSpeed(), () => renderArrayValues(values));
    }
    return finalPivot;
}

async function mergeSort(l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    await mergeSort(l, m);
    await mergeSort(m + 1, r);
    await merge(l, m, r);
}

async function merge(l, m, r) {
    const leftSide = values.slice(l, m + 1);
    const rightSide = values.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    await tutorStep("Merge", `Merging segments ${l+1}-${m+1} and ${m+2}-${r+1}.`);
    while (i < leftSide.length && j < rightSide.length) {
        comparisons++; updateStats(comparisons, swaps, stepCount);
        if (leftSide[i] <= rightSide[j]) {
            values[k] = leftSide[i]; i++;
        } else {
            values[k] = rightSide[j]; j++;
        }
        await updateMergedBlock(k, values[k], () => renderArrayValues(values));
        await waitForStep();
        k++;
    }
    while (i < leftSide.length) {
        values[k] = leftSide[i]; i++;
        await updateMergedBlock(k, values[k], () => renderArrayValues(values));
        await waitForStep();
        k++;
    }
    while (j < rightSide.length) {
        values[k] = rightSide[j]; j++;
        await updateMergedBlock(k, values[k], () => renderArrayValues(values));
        await waitForStep();
        k++;
    }
}

async function answerDoubt() {
    const input = document.getElementById("doubtInput");
    const question = input.value.trim();
    const algo = document.getElementById("algorithm").value;
    if (!question) return;

    ui.doubtAnswer.innerText = "Thinking...";
    try {
        const res = await fetch("/api/algorithm-tutor", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ algorithm: algo, question: question, currentStep: ui.explanation.innerText })
        });
        const data = await res.json();
        ui.doubtAnswer.innerText = data.answer;
    } catch (e) {
        ui.doubtAnswer.innerText = localDoubtAnswer(algo, question);
    }
}

function reset() {
    sortCancelled = true;
    isSorting = false;
    values = [...originalValues];
    draw();
    updateStatus("Reset complete");
}

async function tutorStep(action, detail) {
    stepCount++;
    const desc = `Step ${stepCount}: ${action}. ${detail}`;
    ui.explanation.innerText = desc;
    renderExecutionFlow([desc, explainCurrentCounters(comparisons, swaps)]);
    if (voiceMode) await speakText(desc, voiceMode);

    if (isSorting) {
        try {
            const res = await fetch("/api/algorithm-tutor", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ algorithm: document.getElementById("algorithm").value, question: "", currentStep: desc })
            });
            const data = await res.json();
            ui.doubtAnswer.innerText = data.answer;
        } catch (e) { ui.doubtAnswer.innerText = localDoubtAnswer(document.getElementById("algorithm").value, desc); }
    }
    await waitForStep();
}

async function waitForStep() {
    if (sortCancelled) throw new Error();
    if (stepMode) {
        while (!stepRequested && isSorting) await new Promise(r => setTimeout(r, 50));
        stepRequested = false;
    } else {
        while (isPaused && isSorting) await new Promise(r => setTimeout(r, 50));
        await new Promise(r => setTimeout(r, getSpeed()));
    }
}

function getSpeed() { return Number(document.getElementById("speed").value); }

function togglePause() { isPaused = !isPaused; document.getElementById("pauseBtn").innerText = isPaused ? "Resume" : "Pause"; }

function next() { stepMode = true; stepRequested = true; }

function toggleVoice() { voiceMode = !voiceMode; document.getElementById("voiceBtn").innerText = voiceMode ? "Voice On" : "Voice Off"; }

function selectAlgorithm(name) {
    document.getElementById("algorithm").value = name;
    updateAlgoInfo();
}

function updateAlgoInfo(shouldSpeak = true) {
    const algo = document.getElementById("algorithm").value;
    updateComplexity(algo);
    ui.explanation.innerText = algorithmIntros[algo];
    if (shouldSpeak) speakText(algorithmIntros[algo], voiceMode);
    if (isPracticeMode) updateStatus("Practice Mode: Click blocks to select.");
    loadChallenge();
}

async function manualAction(type) {
    if (!isPracticeMode || isSorting) return;
    if (selectedIndices.length !== 2) {
        updateStatus("⚠️ Click two blocks in the 3D scene first!");
        return;
    }

    const [idx1, idx2] = [...selectedIndices].sort((a, b) => a - b);

    if (type === "compare") {
        comparisons++;
        updateStats(comparisons, swaps, stepCount);
        addComparisonBeam(idx1, idx2, colors.compare);
        
        const val1 = values[idx1];
        const val2 = values[idx2];
        const resultText = val1 > val2 
            ? `Manual Check: ${val1} > ${val2}. Logic says: Swap them!`
            : `Manual Check: ${val1} ≤ ${val2}. Logic says: No swap needed.`;
            
        updateStatus(resultText);
    } else if (type === "swap") {
        spawnSwapParticles(idx1, idx2);
        await swapBlocksAnimation(idx1, idx2, values, getSpeed(), () => renderArrayValues(values));
        swaps++;
        updateStats(comparisons, swaps, stepCount);
        updateStatus(`Manually swapped index ${idx1} and ${idx2}. Keep going!`);

        // Check if the user successfully sorted the array manually
        let isSorted = true;
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] > values[i + 1]) isSorted = false;
        }

        if (isSorted) {
            updateStatus("🎉 Success! You manually sorted the array!");
            blocks.forEach(b => setBlockColor(b, colors.sorted));
            progress.runs++;
            updateProgressUI(progress);
            localStorage.setItem("algorithmProgress", JSON.stringify(progress));
        }
    }

    clearSelection();
}

function loadChallenge() {
    const algo = document.getElementById("algorithm").value;
    const challenge = algorithmChallenges.find(c => c.algorithm === algo);
    if (!challenge) return;
    renderChallenge(challenge, (idx) => {
        const isCorrect = idx === challenge.answer;
        if (isCorrect) {
            progress.correct++;
            if (!progress.algorithms.includes(algo)) progress.algorithms.push(algo);
            progress.streak++;
        } else {
            progress.streak = 0;
        }
        progress.attempted++;
        showChallengeFeedback(isCorrect, challenge.concept);
        updateProgressUI(progress);
        localStorage.setItem("algorithmProgress", JSON.stringify(progress));
    });
}

function loadQuiz() {
    loadQuizQuestion(currentQuiz, (idx) => {
        const correct = quizQuestions[currentQuiz].answer === idx;
        if (correct) progress.correct++;
        progress.attempted++;
        currentQuiz = (currentQuiz + 1) % quizQuestions.length;
        loadQuiz();
        updateProgressUI(progress);
    });
}

document.addEventListener("DOMContentLoaded", boot);
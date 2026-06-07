import { conceptCopy, explainLocally } from "./database.js";

let voiceEnabled = false;

export function setTutorText(text, shouldSpeak = true) {
    const target = document.getElementById("sqlExplanation");
    if (target) target.innerText = text;
    if (shouldSpeak) speakTutor(text);
}

export function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const button = document.getElementById("sqlVoiceBtn");
    if (button) {
        button.innerText = voiceEnabled ? "Voice On" : "Voice Off";
        button.setAttribute("aria-pressed", String(voiceEnabled));
    }
    if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (voiceEnabled) speakTutor(document.getElementById("sqlExplanation")?.innerText || "");
}

export async function askTutor({ action = "doubt", question = "", query = "", error = "", execution = null, challenge = null }) {
    try {
        const response = await fetch("/api/sql-tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action,
                question,
                query,
                error,
                executionSummary: execution?.summary || document.getElementById("sceneStatus")?.innerText || ""
            })
        });
        if (!response.ok) throw new Error(`Tutor request failed with ${response.status}`);
        const data = await response.json();
        if (data.answer) return data.answer;
    } catch (requestError) {
        console.info("SQL tutor fallback:", requestError);
    }
    return localTutor(action, question, query, error, execution, challenge);
}

export function localTutor(action, question, query, error, execution, challenge) {
    if (action === "explain") return explainLocally(query, execution, challenge, false);
    if (action === "fix") {
        return error
            ? `SQLite reported: ${error}. Check table and column names, quote text with single quotes, and make sure every JOIN has an ON condition.`
            : "Run the query first, then I can explain the exact SQLite error. A safe first step is SELECT * FROM students;";
    }
    if (action === "join") return conceptCopy["INNER JOIN"] + " " + conceptCopy["LEFT JOIN"];

    const lower = String(question || "").toLowerCase();
    const concept = Object.keys(conceptCopy).find(key => lower.includes(key.toLowerCase().split(" ")[0]));
    if (concept) return conceptCopy[concept];
    if (lower.includes("primary key")) return "A primary key uniquely identifies each row. Here, students.id, courses.id, and enrollments.id are primary keys.";
    if (lower.includes("foreign key")) return "A foreign key links one table to another. Here, students.course_id connects students to courses.id.";
    if (lower.includes("having")) return "HAVING filters grouped results after GROUP BY. WHERE filters individual rows before grouping.";
    if (lower.includes("count")) return "COUNT counts rows. COUNT(*) counts every row; COUNT(column) ignores NULL values in that column.";
    if (lower.includes("avg") || lower.includes("average")) return "AVG calculates the average of a numeric column, such as SELECT AVG(score) FROM students;";
    if (lower.includes("null")) return "NULL means missing or unknown data. LEFT JOIN often creates NULL values for unmatched right-side rows.";
    if (lower.includes("distinct")) return "DISTINCT removes duplicates. Example: SELECT DISTINCT city FROM students;";
    if (lower.includes("limit")) return "LIMIT caps how many rows are returned. Example: SELECT * FROM students LIMIT 3;";
    if (query) return explainLocally(query, execution, challenge, false);
    return "I can help with SQL concepts like SELECT, WHERE, JOIN, GROUP BY, COUNT, AVG, and query errors. Try asking one focused SQL question.";
}

function speakTutor(text) {
    if (!voiceEnabled || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 280));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

export const seedData = {
    students: [
        { id: 1, name: "Asha", course_id: 1, score: 92, city: "Pune" },
        { id: 2, name: "Ravi", course_id: 2, score: 76, city: "Delhi" },
        { id: 3, name: "Maya", course_id: 1, score: 84, city: "Mumbai" },
        { id: 4, name: "Kabir", course_id: 3, score: 68, city: "Jaipur" },
        { id: 5, name: "Nia", course_id: 2, score: 91, city: "Pune" }
    ],
    courses: [
        { id: 1, title: "Algorithms", level: "Core", credits: 4 },
        { id: 2, title: "Databases", level: "Core", credits: 3 },
        { id: 3, title: "Networks", level: "Advanced", credits: 4 },
        { id: 4, title: "AI Basics", level: "Beginner", credits: 2 }
    ],
    enrollments: [
        { id: 1, student_id: 1, course_id: 1, status: "active" },
        { id: 2, student_id: 2, course_id: 2, status: "active" },
        { id: 3, student_id: 3, course_id: 1, status: "completed" },
        { id: 4, student_id: 4, course_id: 3, status: "active" },
        { id: 5, student_id: 5, course_id: 2, status: "completed" }
    ]
};

let SQL;
let db;

export const challenges = [
    {
        concept: "SELECT",
        text: "Show every student's name and score.",
        query: "SELECT name, score FROM students",
        chart: null
    },
    {
        concept: "WHERE",
        text: "Show students with score above 80.",
        query: "SELECT name, score FROM students WHERE score > 80",
        chart: { label: "Score", key: "score" }
    },
    {
        concept: "ORDER BY",
        text: "Sort students from highest score to lowest score.",
        query: "SELECT name, score FROM students ORDER BY score DESC",
        chart: { label: "Score", key: "score" }
    },
    {
        concept: "GROUP BY",
        text: "Group students by city and count them.",
        query: "SELECT city, COUNT(*) AS total FROM students GROUP BY city",
        chart: { label: "Students", key: "total" }
    },
    {
        concept: "COUNT",
        text: "Count how many students are in the students table.",
        query: "SELECT COUNT(*) AS total_students FROM students",
        chart: { label: "Total Students", key: "total_students" }
    },
    {
        concept: "AVG",
        text: "Find the average score for each course.",
        query: "SELECT course_id, AVG(score) AS average_score FROM students GROUP BY course_id",
        chart: { label: "Average Score", key: "average_score" }
    },
    {
        concept: "INNER JOIN",
        text: "Show every enrolled student's course title.",
        query: "SELECT name, title FROM students INNER JOIN courses ON students.course_id = courses.id",
        chart: null
    },
    {
        concept: "LEFT JOIN",
        text: "Show all courses and any matching student names.",
        query: "SELECT title, name FROM courses LEFT JOIN students ON courses.id = students.course_id",
        chart: null
    },
    {
        concept: "INSERT",
        text: "Add a new student record.",
        query: "INSERT INTO students (id, name, course_id, score, city) VALUES (6, 'Zara', 4, 88, 'Goa')",
        verifyQuery: "SELECT name, score, city FROM students WHERE id = 6",
        chart: null
    },
    {
        concept: "UPDATE",
        text: "Update Ravi's score to 82.",
        query: "UPDATE students SET score = 82 WHERE name = 'Ravi'",
        verifyQuery: "SELECT name, score FROM students WHERE name = 'Ravi'",
        chart: null
    },
    {
        concept: "DELETE",
        text: "Delete completed enrollments.",
        query: "DELETE FROM enrollments WHERE status = 'completed'",
        verifyQuery: "SELECT COUNT(*) AS completed_left FROM enrollments WHERE status = 'completed'",
        chart: null
    }
];

export const conceptCopy = {
    "SELECT": "SELECT tells SQL which columns should appear in the final result.",
    "WHERE": "WHERE checks each row against a condition and keeps only rows that match.",
    "ORDER BY": "ORDER BY sorts the final rows after filtering and selection.",
    "GROUP BY": "GROUP BY combines rows that share the same value so aggregate functions can summarize them.",
    "COUNT": "COUNT returns how many rows exist in each group or result.",
    "AVG": "AVG adds numeric values and divides by the number of matching rows.",
    "INNER JOIN": "INNER JOIN returns only rows where keys match in both tables.",
    "LEFT JOIN": "LEFT JOIN keeps every row from the left table, even when the right table has no match.",
    "INSERT": "INSERT adds a new row into a table.",
    "UPDATE": "UPDATE changes existing rows, usually protected by a WHERE clause.",
    "DELETE": "DELETE removes rows. A WHERE clause prevents deleting more data than intended."
};

export async function initDatabase() {
    if (db) return db;
    if (!window.initSqlJs) {
        throw new Error("sql.js did not load. Check the CDN script before sql-main.js.");
    }
    SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    db = createSeededDatabase();
    return db;
}

export function resetDatabase() {
    if (db) db.close();
    db = createSeededDatabase();
    return db;
}

export function executeQuery(query, targetDb = db) {
    if (!targetDb) throw new Error("Database is not initialized yet.");
    const started = performance.now();
    const trimmed = String(query || "").trim();
    if (!trimmed) throw new Error("Write a SQL query before running.");

    const resultSets = targetDb.exec(trimmed);
    const rows = resultSets.flatMap(set => rowsFromResultSet(set));
    const rowsModified = typeof targetDb.getRowsModified === "function" ? targetDb.getRowsModified() : 0;
    const elapsedMs = Math.max(1, Math.round(performance.now() - started));
    const statementType = getStatementType(trimmed);

    return {
        query: trimmed,
        statementType,
        columns: resultSets[0]?.columns || [],
        rows,
        rowsModified,
        elapsedMs,
        summary: summarizeExecution(statementType, rows, rowsModified, elapsedMs)
    };
}

export function validateAgainstChallenge(userQuery, challenge) {
    const expectedDb = createSeededDatabase();
    const userDb = createSeededDatabase();
    try {
        const expectedRun = executeQuery(challenge.query, expectedDb);
        const userRun = executeQuery(userQuery, userDb);
        const verifyQuery = challenge.verifyQuery || null;
        const expectedRows = verifyQuery ? executeQuery(verifyQuery, expectedDb).rows : expectedRun.rows;
        const userRows = verifyQuery ? executeQuery(verifyQuery, userDb).rows : userRun.rows;
        const isCorrect = sameRows(expectedRows, userRows);

        return {
            isCorrect,
            expectedRows,
            userRows,
            message: isCorrect
                ? "Your query produced the expected database result."
                : "The query ran, but the result does not match this challenge yet."
        };
    } finally {
        expectedDb.close();
        userDb.close();
    }
}

export function getTablePreview(tableName, limit = 8) {
    const safeTable = ["students", "courses", "enrollments"].includes(tableName) ? tableName : "students";
    return executeQuery(`SELECT * FROM ${safeTable} LIMIT ${Number(limit) || 8}`).rows;
}

export function inferChart(rows, preferredConfig = null) {
    if (!rows.length) return null;
    if (preferredConfig && rows.some(row => Number.isFinite(Number(row[preferredConfig.key])))) return preferredConfig;
    const keys = Object.keys(rows[0]);
    const numericKey = keys.find(key => rows.every(row => row[key] === null || row[key] === "" || Number.isFinite(Number(row[key]))));
    if (!numericKey) return null;
    return { label: numericKey, key: numericKey };
}

export function tablesFromQuery(query) {
    const lower = String(query || "").toLowerCase();
    return ["students", "courses", "enrollments"].filter(table => new RegExp(`\\b${table}\\b`).test(lower));
}

export function buildExecutionSteps(query) {
    const lower = String(query || "").toLowerCase();
    const steps = [];
    if (/^\s*insert\b/.test(lower)) steps.push("Preparing INSERT", "Writing row");
    else if (/^\s*update\b/.test(lower)) steps.push("Scanning table", "Applying WHERE", "Updating rows");
    else if (/^\s*delete\b/.test(lower)) steps.push("Scanning table", "Applying WHERE", "Deleting rows");
    else steps.push("Scanning table");
    if (lower.includes("join")) steps.push("JOIN matching");
    if (lower.includes("where") && !steps.includes("Applying WHERE")) steps.push("Applying WHERE");
    if (lower.includes("where")) steps.push("Filtering rows");
    if (lower.includes("group by")) steps.push("Grouping rows");
    if (lower.includes("count") || lower.includes("avg")) steps.push("Calculating aggregates");
    if (lower.includes("order by")) steps.push("Sorting result");
    steps.push("Selecting columns", "Returning result");
    return steps;
}

export function explainLocally(query, execution, challenge = null, success = false) {
    const lower = String(query || "").toLowerCase();
    const pieces = [];
    if (lower.includes("join")) pieces.push("SQL builds a working row set by matching table keys in the JOIN.");
    else pieces.push(`SQL scans ${tablesFromQuery(query)[0] || "the selected table"} row by row.`);
    if (lower.includes("where")) pieces.push("WHERE removes rows that do not pass the condition.");
    if (lower.includes("group by")) pieces.push("GROUP BY collects matching values so aggregates can summarize them.");
    if (lower.includes("count")) pieces.push("COUNT measures how many rows are in the result or group.");
    if (lower.includes("avg")) pieces.push("AVG totals numeric values and divides by the matching row count.");
    if (lower.includes("order by")) pieces.push("ORDER BY sorts the rows before display.");
    if (/^\s*insert\b/.test(lower)) pieces.push("INSERT changed the in-browser SQLite database.");
    if (/^\s*update\b/.test(lower)) pieces.push("UPDATE changed matching rows in the in-browser SQLite database.");
    if (/^\s*delete\b/.test(lower)) pieces.push("DELETE removed matching rows in the in-browser SQLite database.");
    pieces.push(execution?.summary || "The SQL engine returned a live result.");

    const prefix = success ? "Correct. " : challenge ? "Good run. " : "";
    return `${prefix}${pieces.join(" ")}`;
}

function createSeededDatabase() {
    const nextDb = new SQL.Database();
    nextDb.run(`
        CREATE TABLE students (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            course_id INTEGER,
            score INTEGER,
            city TEXT
        );
        CREATE TABLE courses (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            level TEXT,
            credits INTEGER
        );
        CREATE TABLE enrollments (
            id INTEGER PRIMARY KEY,
            student_id INTEGER,
            course_id INTEGER,
            status TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(course_id) REFERENCES courses(id)
        );
    `);
    insertRows(nextDb, "students", ["id", "name", "course_id", "score", "city"], seedData.students);
    insertRows(nextDb, "courses", ["id", "title", "level", "credits"], seedData.courses);
    insertRows(nextDb, "enrollments", ["id", "student_id", "course_id", "status"], seedData.enrollments);
    return nextDb;
}

function insertRows(targetDb, table, columns, rows) {
    const placeholders = columns.map(() => "?").join(", ");
    const statement = targetDb.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
    rows.forEach(row => statement.run(columns.map(column => row[column])));
    statement.free();
}

function rowsFromResultSet(set) {
    return set.values.map(values => Object.fromEntries(set.columns.map((column, index) => [column, values[index]])));
}

function sameRows(a, b) {
    return JSON.stringify(canonicalizeRows(a)) === JSON.stringify(canonicalizeRows(b));
}

function canonicalizeRows(rows) {
    return rows.map(row => Object.fromEntries(
        Object.keys(row).sort().map(key => [key, normalizeValue(row[key])])
    ));
}

function normalizeValue(value) {
    return typeof value === "number" ? Number(value.toFixed(4)) : value;
}

function getStatementType(query) {
    return query.split(/\s+/)[0]?.toUpperCase() || "SQL";
}

function summarizeExecution(type, rows, rowsModified, elapsedMs) {
    if (type === "SELECT") return `${rows.length} row${rows.length === 1 ? "" : "s"} returned in ${elapsedMs} ms.`;
    return `${rowsModified} row${rowsModified === 1 ? "" : "s"} changed in ${elapsedMs} ms.`;
}

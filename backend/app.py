import json
import os
import re
import urllib.error
import urllib.request

from flask import Flask, render_template, request, jsonify

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(
    __name__,
    template_folder=os.path.join(FRONTEND_DIR, "templates"),
    static_folder=os.path.join(FRONTEND_DIR, "static"),
)


def load_local_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_local_env()


ALGORITHM_NOTES = {
    "Bubble Sort": "Bubble Sort compares two neighboring blocks at a time. If the left block is larger, they swap, so larger values slowly move to the end after repeated passes. It is primarily used for teaching adjacent comparisons and simple swap logic.",
    "Selection Sort": "Selection Sort looks through the unsorted part to find the smallest block. It then places that smallest value at the front of the unsorted section. This algorithm is useful when swaps are expensive because it minimizes writes.",
    "Insertion Sort": "Insertion Sort treats the left side as sorted. It picks the next block and shifts it left until it fits in the correct position. It performs well on small or nearly sorted lists, and is suitable for online insertion workflows.",
    "Quick Sort": "Quick Sort chooses a pivot block. Values smaller than the pivot move to the left, larger values stay to the right, and the same idea repeats on each side. It is known for fast in-memory sorting and helps in understanding partition-based reasoning.",
    "Merge Sort": "Merge Sort splits the array into smaller parts until each part is easy to sort. Then it merges those parts back together by repeatedly choosing the smaller front value. This is a stable sorting algorithm, often used for linked lists and external sorting.",
}

ALGORITHM_ALIASES = {
    "bubble": "Bubble Sort",
    "selection": "Selection Sort",
    "insertion": "Insertion Sort",
    "quick": "Quick Sort",
    "merge": "Merge Sort",
}


def resolve_target_algorithm(question, selected_algorithm):
    """Read algorithm name from the question; otherwise use dropdown."""
    normalized = question.lower()

    for name in sorted(ALGORITHM_NOTES, key=len, reverse=True):
        if name.lower() in normalized:
            return name

    for alias, name in ALGORITHM_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", normalized):
            return name

    selected = (selected_algorithm or "Bubble Sort").strip()
    return selected if selected in ALGORITHM_NOTES else "Bubble Sort"


def local_algorithm_answer(selected_algorithm, question, current_step=""):
    algorithm = resolve_target_algorithm(question, selected_algorithm)

    if not question and current_step:
        step_lower = current_step.lower()
        if "compare" in step_lower:
            return "The algorithm is comparing two values to check their order."
        if "swap" in step_lower:
            return "Swapping elements that were in the wrong positions."
        return f"Executing the next step of {algorithm}."

    normalized = question.lower()
    if "complex" in normalized or "time" in normalized or "space" in normalized:
        return (
            f"{algorithm} complexity depends on the method: Bubble, Selection, and Insertion are usually O(n^2); "
            "Quick and Merge are usually O(n log n). Merge Sort uses extra space because it builds temporary merged parts."
        )
    if "swap" in normalized:
        return "A swap happens when two values are in the wrong relative order. The visualizer highlights those blocks, then moves them so the array gets closer to sorted order."
    if "compare" in normalized:
        return "A comparison checks two values to decide which one should come first. Every highlighted comparison is one decision the algorithm makes."
    if "pivot" in normalized:
        return "A pivot is the value Quick Sort uses to split the array. Smaller values move to the left of the pivot, and larger values stay on the right."
    if re.search(r"\bmerge\b", normalized) and algorithm == "Merge Sort":
        return "Merge Sort first divides the array into small pieces. During merge, it compares the first available value from each piece and writes the smaller one back."
    if "challenge" in normalized or "practice" in normalized:
        return (
            f"In {algorithm} practice mode, try to predict which blocks will swap next. "
            "Bubble sort looks at neighbors, while Selection sort looks for the global minimum in the unsorted section."
        )

    return ALGORITHM_NOTES.get(algorithm, ALGORITHM_NOTES["Bubble Sort"])


def extract_gemini_text(payload):
    try:
        candidates = payload.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        texts = []
        for part in parts:
            if isinstance(part, dict) and "text" in part:
                texts.append(part["text"])
        combined = "".join(texts).strip()
        return combined or None
    except (AttributeError, TypeError, IndexError, KeyError):
        return None


def get_gemini_api_key():
    return os.getenv("GEMINI_API_KEY")


def get_gemini_model():
    return os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"



def _send_gemini_request(req):
    import time, json, urllib.error
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
                return extract_gemini_text(payload)
        except urllib.error.HTTPError as e:
            if e.code in (503, 429) and attempt < 2:
                time.sleep(2)
                continue
            raise
        except (TimeoutError, urllib.error.URLError) as e:
            if attempt < 2:
                time.sleep(2)
                continue
            raise
    return None

def ask_gemini_tutor(selected_algorithm, question, current_step):
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    target_algorithm = resolve_target_algorithm(question, selected_algorithm)

    if not question.strip() and current_step.strip():
        user_task = f"Live Commentary: Briefly explain this visualization step: '{current_step}'"
    else:
        user_task = f"Student Question: {question}\n\nCurrent Visualization Context: {current_step}"

    prompt = f"""
You are an expert Data Structures and Algorithms tutor inside a professional 3D learning platform.

Your job is to answer student questions ACCURATELY and clearly.

STRICT RULES:
- Answer ONLY based on the user's actual question.
- Do NOT explain Bubble Sort unless user asks about Bubble Sort.
- If user asks about Selection Sort, answer ONLY about Selection Sort.
- Keep answers beginner friendly.
- Use simple and correct technical explanations.
- If in 'Live Commentary' mode, keep the explanation very short (1-2 sentences).
- Keep answers short but meaningful.
- If asked about complexity, explain time and space complexity clearly.
- Never give unrelated algorithm explanations.

Selected Algorithm:
{target_algorithm}

{user_task}
"""

    model = get_gemini_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}],
        }],
        "systemInstruction": {
            "parts": [{"text": "You are a helpful DSA tutor."}]
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    return _send_gemini_request(req)


@app.route("/")
def home():
    return render_template("home/index.html")


@app.route("/algorithms")
def algorithms():
    return render_template("algorithms/index.html")


@app.route("/api/algorithm-tutor", methods=["POST"])
def algorithm_tutor():
    data = request.get_json(silent=True) or {}
    selected_algorithm = data.get("algorithm", "Bubble Sort")
    question = data.get("question", "").strip()
    current_step = data.get("currentStep", "").strip()
    target_algorithm = resolve_target_algorithm(question, selected_algorithm)

    if not question and not current_step:
        return jsonify({"answer": "Ask me a doubt about the current algorithm, comparison, swap, or complexity."})

    try:
        answer = ask_gemini_tutor(selected_algorithm, question, current_step)
    except urllib.error.HTTPError as exc:
        app.logger.warning(
            "Gemini algorithm tutor HTTP error %s: %s",
            exc.code,
            exc.read().decode("utf-8", errors="ignore")[:500],
        )
        answer = None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        app.logger.warning("Gemini algorithm tutor unavailable: %s", exc)
        answer = None

    return jsonify({
        "answer": answer or local_algorithm_answer(selected_algorithm, question, current_step),
        "source": "gemini" if answer else "local",
        "algorithm": target_algorithm,
    })


@app.route("/memory")
def memory():
    return render_template("memory/index.html")


@app.route("/sql")
def sql():
    return render_template("sql/index.html")


# ── SQL Playground tutor ──────────────────────────────────────────────────────

SQL_SCHEMA = """
Sample SQLite schema (CodeVerse SQL Playground):
- students(id INTEGER, name TEXT, course_id INTEGER, score INTEGER, city TEXT)
- courses(id INTEGER, title TEXT, level TEXT, credits INTEGER)
- enrollments(id INTEGER, student_id INTEGER, course_id INTEGER, status TEXT)
"""


def local_sql_tutor(action, question, query, error_message, execution_summary):
    q = (query or "").strip()
    err = (error_message or "").strip()
    summ = (execution_summary or "").strip()

    if action == "explain":
        return (
            "Here is a simple read of your query: SQL usually runs FROM/JOIN first to build rows, "
            "then WHERE to filter, GROUP BY to bucket, HAVING to filter groups, ORDER BY to sort, "
            "and finally SELECT to choose columns. If you share a specific clause, I can zoom in."
            + (f"\n\nYour query:\n{q}" if q else "")
        )

    if action == "fix":
        if err:
            return (
                f"I could not reach the cloud tutor, but here is a quick hint for: {err}\n"
                "Check table names (students, courses, enrollments), pair every JOIN with ON, "
                "and make sure string literals use single quotes."
                + (f"\n\nYour query:\n{q}" if q else "")
            )
        return "Add a valid FROM clause, match parentheses and quotes, and try running a smaller SELECT first."

    if action == "similar":
        return (
            "Try a variation like:\n"
            "SELECT name, score FROM students WHERE score >= 80 ORDER BY score DESC;\n"
            "or join courses:\n"
            "SELECT s.name, c.title FROM students s JOIN courses c ON s.course_id = c.id;"
        )

    if action == "join":
        return (
            "INNER JOIN keeps only rows where the join condition matches in both tables. "
            "LEFT JOIN keeps every row from the left table and puts NULL in right columns when there is no match. "
            "In this playground, students.course_id usually matches courses.id."
        )

    if not (question or "").strip():
        return "Ask a specific doubt, for example: What does WHERE do? or Why is my JOIN empty?"

    nq = question.lower()
    if "primary key" in nq:
        return "A primary key uniquely identifies each row. Here, students.id, courses.id, and enrollments.id are primary keys."
    if "foreign key" in nq:
        return "A foreign key points to another table. Here, students.course_id connects a student to courses.id."
    if "schema" in nq or "tables" in nq or "columns" in nq:
        return SQL_SCHEMA.strip()
    if "select" in nq:
        return "SELECT chooses the columns that appear in the result. Example: SELECT name, score FROM students;"
    if "from" in nq:
        return "FROM tells SQL which table to read first. Example: FROM students reads rows from the students table."
    if "where" in nq:
        return "WHERE filters rows after the FROM/JOIN step. Only rows that pass the condition appear in the result."
    if "join" in nq or "inner" in nq or "left" in nq:
        return local_sql_tutor("join", "", "", "", "")
    if "group" in nq:
        return "GROUP BY collapses rows that share the same grouping keys. Use aggregates like COUNT(*) or AVG(score) in SELECT."
    if "order" in nq:
        return "ORDER BY sorts the final result set. DESC means largest first; ASC is the default."
    if "having" in nq:
        return "HAVING filters grouped results after GROUP BY. WHERE filters individual rows before grouping."
    if "count" in nq:
        return "COUNT counts rows. COUNT(*) counts every row, while COUNT(column) ignores NULL values in that column."
    if "avg" in nq or "average" in nq:
        return "AVG calculates the average of a numeric column. Example: SELECT AVG(score) AS average_score FROM students;"
    if "null" in nq:
        return "NULL means missing or unknown data. In a LEFT JOIN, unmatched right-table columns show as NULL."
    if "alias" in nq or " as " in f" {nq} ":
        return "An alias gives a column or table a clearer temporary name. Example: SELECT AVG(score) AS average_score FROM students;"
    if "distinct" in nq:
        return "DISTINCT removes duplicate values. Example: SELECT DISTINCT city FROM students;"
    if "limit" in nq:
        return "LIMIT restricts how many rows are returned. Example: SELECT * FROM students LIMIT 3;"
    if "insert" in nq or "update" in nq or "delete" in nq:
        return "INSERT adds rows, UPDATE changes existing rows (often with WHERE), DELETE removes rows (almost always with WHERE in real apps)."

    return (
        "I can answer this from the SQL playground schema. "
        + SQL_SCHEMA.strip()
        + (f"\n\nContext — last execution summary:\n{summ}" if summ else "")
        + (f"\n\nCurrent editor query:\n{q}" if q else "")
    )


def ask_gemini_sql_tutor(action, question, query, error_message, execution_summary):
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    action = (action or "doubt").strip().lower()
    question = (question or "").strip()
    query = (query or "").strip()
    error_message = (error_message or "").strip()
    execution_summary = (execution_summary or "").strip()

    if action == "explain":
        user_task = f"Explain this SQL query step by step for a beginner.\nQuery:\n{query}"
    elif action == "fix":
        user_task = (
            f"Fix this SQL query. Database error or validation issue:\n{error_message}\n\n"
            f"Broken query:\n{query}\n\nReturn the corrected SQL first, then one short sentence why it was wrong."
        )
    elif action == "similar":
        user_task = (
            "Generate one new practice query that teaches the SAME concept as the query below "
            "but changes columns, thresholds, or ORDER BY. Only output the SQL on its own lines.\n\n"
            f"Reference query:\n{query}"
        )
    elif action == "join":
        user_task = (
            "Explain INNER JOIN vs LEFT JOIN using the students and courses tables from the schema. "
            "Mention unmatched rows and NULLs. Keep it beginner friendly."
        )
    else:
        user_task = (
            f"Student question:\n{question}\n\n"
            f"Current SQL in editor (may be empty):\n{query or '(empty)'}\n\n"
            f"Optional execution summary:\n{execution_summary or '(none)'}"
        )

    prompt = f"""
You are an expert SQL tutor inside CodeVerse AI, a futuristic interactive learning app.

{SQL_SCHEMA}

Rules:
- Be accurate for SQLite-style SQL.
- Keep answers concise and friendly.
- Prefer short paragraphs or bullet steps.
- When you show SQL, use plain SQL without markdown code fences if possible.

Action type from UI: {action}

{user_task}
"""

    model = get_gemini_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}],
        }],
        "systemInstruction": {
            "parts": [{"text": "You are an expert SQL tutor."}]
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    return _send_gemini_request(req)


@app.route("/api/sql-tutor", methods=["POST"])
def sql_tutor():
    data = request.get_json(silent=True) or {}
    action = (data.get("action") or "doubt").strip().lower()
    question = (data.get("question") or "").strip()
    query = (data.get("query") or "").strip()
    error_message = (data.get("error") or "").strip()
    execution_summary = (data.get("executionSummary") or "").strip()

    if action not in ("doubt", "explain", "fix", "similar", "join"):
        action = "doubt"

    if action == "doubt" and not question:
        return jsonify({
            "answer": "Ask a SQL doubt, or use the Explain / Fix buttons with a query in the editor.",
            "source": "local",
        })

    try:
        answer = ask_gemini_sql_tutor(action, question, query, error_message, execution_summary)
    except urllib.error.HTTPError as exc:
        app.logger.warning(
            "Gemini SQL tutor HTTP error %s: %s",
            exc.code,
            exc.read().decode("utf-8", errors="ignore")[:500],
        )
        answer = None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        app.logger.warning("Gemini SQL tutor unavailable: %s", exc)
        answer = None

    return jsonify({
        "answer": answer or local_sql_tutor(action, question, query, error_message, execution_summary),
        "source": "gemini" if answer else "local",
    })


# ── Memory Simulator tutor ────────────────────────────────────────────────────

def ask_gemini_memory_tutor(question):
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    prompt = f"""
You are an expert Operating Systems and Memory Management tutor inside CodeVerse AI.
Answer the student's question about Stack, Heap, RAM, CPU Scheduling, or Memory Management.

Rules:
- Be technically precise but beginner-friendly.
- Explain the 'Why' behind concepts (e.g., why Fragmentation happens).
- Keep answers under 3-4 sentences.
- If the question is not about OS/Memory, politely guide them back to the topic.

Student Question: {question}
"""

    model = get_gemini_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}],
        }],
        "systemInstruction": {
            "parts": [{"text": "You are a helpful OS tutor."}]
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    return _send_gemini_request(req)


@app.route("/api/memory-tutor", methods=["POST"])
def memory_tutor():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"answer": "Ask me about the stack, heap, or how the CPU schedules processes."})

    try:
        answer = ask_gemini_memory_tutor(question)
    except Exception as exc:
        app.logger.warning("Gemini memory tutor error: %s", exc)
        answer = None

    return jsonify({
        "answer": answer,
        "source": "gemini" if answer else "local",
    })



def ask_gemini_dashboard_insight(algo_pct, mem_pct, sql_pct, streak):
    import json, urllib.request
    api_key = get_gemini_api_key()
    if not api_key: return None
    
    prompt = f'''
You are the CodeVerse AI Mentor.
The user has the following progress:
- Algorithm Visualizer: {algo_pct}%
- Memory Simulator: {mem_pct}%
- SQL Playground: {sql_pct}%
Current Learning Streak: {streak} days.

Give a short, motivating, and personalized insight.
Return EXACTLY a JSON object with two keys: "main" and "tip".
"main": A 2-sentence insight about their progress (use <span class="ai-highlight"> to highlight the module name they should focus on or are doing great at).
"tip": A 1-sentence actionable tip.
Do not wrap it in markdown block. Just raw JSON.
'''
    model = get_gemini_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": "You are a friendly AI mentor."}]}
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    return _send_gemini_request(req)

@app.route("/api/dashboard-insight", methods=["POST"])
def dashboard_insight():
    import json
    data = request.get_json(silent=True) or {}
    algo = data.get("algorithms", 0)
    mem = data.get("memory", 0)
    sql = data.get("sql", 0)
    streak = data.get("streak", 0)
    
    try:
        answer = ask_gemini_dashboard_insight(algo, mem, sql, streak)
        if answer:
            try:
                if answer.startswith("```json"):
                    answer = answer[7:]
                if answer.endswith("```"):
                    answer = answer[:-3]
                parsed = json.loads(answer.strip())
                if "main" in parsed and "tip" in parsed:
                    return jsonify(parsed)
            except Exception:
                pass
    except Exception as exc:
        app.logger.warning("Gemini dashboard insight error: %s", exc)
        
    return jsonify({
        "main": f"You are making progress! Focus on building your skills to improve your stats.",
        "tip": "Keep learning consistently every day."
    })

if __name__ == "__main__":
    app.run(debug=True)

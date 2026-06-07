export const lessons = {
    stack: "Stack memory is a fast last-in-first-out region. Every function call creates a frame, and returning from the function pops that frame away.",
    heap: "Heap memory stores dynamic objects whose lifetime is controlled by allocation, references, and garbage collection.",
    ram: "RAM is the volatile working memory used by currently running programs. CPU instructions constantly read and write RAM.",
    cpu: "The CPU executes one process at a time per core. A scheduler chooses which ready process runs next."
};

export const processTemplates = [
    [
        { id: "P1", burst: 6, arrival: 0, priority: 2, color: "#a855f7" },
        { id: "P2", burst: 3, arrival: 1, priority: 1, color: "#ec4899" },
        { id: "P3", burst: 8, arrival: 2, priority: 4, color: "#0ea5e9" },
        { id: "P4", burst: 4, arrival: 3, priority: 3, color: "#22c55e" }
    ],
    [
        { id: "P1", burst: 4, arrival: 0, priority: 3, color: "#a855f7" },
        { id: "P2", burst: 7, arrival: 0, priority: 2, color: "#ec4899" },
        { id: "P3", burst: 2, arrival: 1, priority: 1, color: "#0ea5e9" },
        { id: "P4", burst: 5, arrival: 3, priority: 4, color: "#22c55e" }
    ],
    [
        { id: "P1", burst: 9, arrival: 0, priority: 4, color: "#a855f7" },
        { id: "P2", burst: 2, arrival: 2, priority: 1, color: "#ec4899" },
        { id: "P3", burst: 5, arrival: 3, priority: 2, color: "#0ea5e9" },
        { id: "P4", burst: 3, arrival: 4, priority: 3, color: "#22c55e" }
    ]
];

export const quizQuestions = [
    {
        question: "Which memory region usually stores function calls?",
        options: ["Stack", "Heap", "ROM", "Disk cache"],
        answer: "Stack",
        detail: "Correct. Function calls create stack frames and return by popping those frames."
    },
    {
        question: "What does Round Robin scheduling add to CPU execution?",
        options: ["A time quantum", "A fixed priority only", "No waiting queue", "Permanent CPU ownership"],
        answer: "A time quantum",
        detail: "Correct. Round Robin gives each ready process a small time slice before rotating it back into the queue."
    },
    {
        question: "What is memory fragmentation?",
        options: ["Free memory split into small holes", "A faster CPU clock", "A stack return value", "A ROM boot sector"],
        answer: "Free memory split into small holes",
        detail: "Correct. Fragmentation means enough total memory may exist, but it is scattered into separated pieces."
    },
    {
        question: "Why can stack overflow happen?",
        options: ["Too many nested frames", "Too many deleted files", "A table has no primary key", "The CPU has no cache"],
        answer: "Too many nested frames",
        detail: "Correct. Deep or infinite recursion can keep pushing frames until the stack limit is exhausted."
    }
];

export const tutorFallback = "I can explain stack overflow, heap allocation, garbage collection, RAM vs ROM, fragmentation, FCFS, SJF, Round Robin, priority scheduling, waiting time, and turnaround time.";

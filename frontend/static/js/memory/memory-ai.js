import { lessons, tutorFallback } from "./memory-data.js";

export async function answerMemoryQuestion(question) {
    const text = question.trim().toLowerCase();
    if (!text) return "Ask about stack overflow, heap allocation, RAM, fragmentation, or CPU scheduling and I will explain it locally.";

    try {
        const response = await fetch("/api/memory-tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.answer) return data.answer;
        }
    } catch (e) {
        console.info("Memory tutor fallback:", e);
    }

    if (text.includes("stack overflow")) {
        return "Stack overflow happens when a program keeps adding stack frames until the reserved stack space is exhausted. The classic cause is infinite or very deep recursion. Each call keeps return addresses and local variables, so the stack grows until the runtime stops the program.";
    }
    if (text.includes("stack")) return lessons.stack + " A push means a function starts; a pop means it returns.";
    if (text.includes("heap") || text.includes("allocate")) {
        return "Heap allocation reserves memory for dynamic objects at runtime. Unlike stack frames, heap objects can outlive the function that created them, so references and garbage collection matter.";
    }
    if (text.includes("garbage") || text.includes("gc")) {
        return "Garbage collection finds heap objects that are no longer reachable from active references. It frees those objects so memory can be reused without manual deallocation.";
    }
    if (text.includes("ram") && text.includes("rom")) {
        return "RAM is volatile working memory used while programs run. ROM is non-volatile firmware storage, commonly used for boot instructions and device-level code.";
    }
    if (text.includes("ram")) return lessons.ram;
    if (text.includes("rom")) return "ROM is read-mostly non-volatile memory. It keeps firmware or boot code even when power is removed.";
    if (text.includes("fragment")) {
        return "Fragmentation occurs when free memory is split into many small gaps. A program may have enough total free memory, but not enough contiguous space for one larger allocation.";
    }
    if (text.includes("fcfs") || text.includes("first come")) {
        return "FCFS runs processes in arrival order. It is simple and fair by arrival time, but one long job can make every shorter job wait behind it.";
    }
    if (text.includes("sjf") || text.includes("shortest")) {
        return "SJF chooses the process with the smallest burst time first. It usually reduces average waiting time, but long processes can starve if short jobs keep arriving.";
    }
    if (text.includes("round robin") || text.includes("quantum")) {
        return "Round Robin gives each process a fixed time quantum, then rotates it to the back of the ready queue if it still needs CPU time. This is good for interactive systems.";
    }
    if (text.includes("priority")) {
        return "Priority scheduling runs the highest-priority ready process first. It is useful for urgent work, but low-priority jobs may starve unless the OS uses aging.";
    }
    if (text.includes("waiting")) {
        return "Waiting time is how long a process spends ready but not executing. Lower average waiting time usually means the scheduler is giving processes CPU access efficiently.";
    }
    if (text.includes("turnaround")) {
        return "Turnaround time is completion time minus arrival time. It measures the total time a process spends in the system from arrival to finish.";
    }
    if (text.includes("queue")) {
        return "The ready queue contains processes waiting for CPU time. Scheduling algorithms decide which queued process is dispatched next.";
    }

    return tutorFallback;
}

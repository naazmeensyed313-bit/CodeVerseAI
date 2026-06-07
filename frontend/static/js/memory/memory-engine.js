import { processTemplates } from "./memory-data.js";

const stackLimit = 6;
const ramSlots = 10;
const functionNames = ["main()", "calculate()", "loginUser()", "fetchProfile()", "renderDashboard()", "saveResult()"];
const heapNames = ["UserSession", "ProfileCache", "ImageBuffer", "QueryResult", "TokenStore", "RenderNode"];

export class MemoryEngine {
    constructor() {
        this.templateIndex = 0;
        this.reset();
    }

    reset() {
        this.stack = [];
        this.heap = [];
        this.ram = Array.from({ length: ramSlots }, (_, index) => ({ id: `R${index + 1}`, type: "free", size: 16 }));
        this.processes = cloneProcesses(processTemplates[this.templateIndex]);
        this.schedule = [];
        this.scheduleCursor = -1;
        this.activeProcess = null;
        this.event = "System reset. Stack, heap, RAM, and CPU are ready.";
        this.fragmentation = 0;
        return this.snapshot();
    }

    pushStack() {
        if (this.stack.length >= stackLimit) {
            this.event = "Stack overflow detected. The call stack reached its configured limit, similar to runaway recursion.";
            return { state: this.snapshot(), overflow: true, xp: 8 };
        }
        const name = functionNames[this.stack.length % functionNames.length];
        const frame = { id: `F${this.stack.length + 1}`, label: name, local: `local_${this.stack.length + 1}`, size: 8 + this.stack.length * 2 };
        this.stack.push(frame);
        this.event = `${frame.label} pushed onto the stack. New function calls grow the stack until they return.`;
        return { state: this.snapshot(), xp: 10 };
    }

    popStack() {
        const frame = this.stack.pop();
        this.event = frame
            ? `${frame.label} returned and its stack frame was released automatically.`
            : "The stack is already empty. There is no function frame to pop.";
        return { state: this.snapshot(), xp: frame ? 8 : 0 };
    }

    allocateMemory() {
        const size = randomInt(12, 48);
        const object = { id: `O${this.heap.length + 1}`, name: heapNames[this.heap.length % heapNames.length], size, refs: randomInt(0, 3) };
        this.heap.push(object);

        const slot = this.ram.find(cell => cell.type === "free" || cell.type === "hole");
        if (slot) {
            slot.type = "used";
            slot.label = object.id;
            slot.size = size;
        }
        this.updateFragmentation();
        this.event = `${object.id} allocated ${size} KB on the heap and mapped into an available RAM slot.`;
        return { state: this.snapshot(), xp: 12 };
    }

    freeMemory() {
        const object = this.heap.shift();
        if (!object) {
            this.event = "No heap objects are currently allocated.";
            return { state: this.snapshot(), xp: 0 };
        }
        const slot = this.ram.find(cell => cell.label === object.id);
        if (slot) {
            slot.type = "hole";
            slot.label = "hole";
        }
        this.updateFragmentation();
        this.event = `${object.id} was freed. The RAM slot becomes a hole, which can contribute to fragmentation.`;
        return { state: this.snapshot(), xp: 10 };
    }

    garbageCollect() {
        const before = this.heap.length;
        const removed = this.heap.filter(object => object.refs === 0);
        this.heap = this.heap.filter(object => object.refs > 0);
        const liveIds = new Set(this.heap.map(object => object.id));
        const liveSlots = this.ram
            .filter(slot => slot.type === "used" && liveIds.has(slot.label))
            .map(slot => ({ ...slot }));
        this.ram = Array.from({ length: ramSlots }, (_, index) => {
            const liveSlot = liveSlots[index];
            return liveSlot || { id: `R${index + 1}`, type: "free", size: 16 };
        });
        this.updateFragmentation();
        this.event = removed.length
            ? `Garbage collector removed ${removed.length} unreachable object${removed.length > 1 ? "s" : ""} and compacted RAM.`
            : "Garbage collector scanned the heap. Every object still has an active reference.";
        return { state: this.snapshot(), xp: before !== this.heap.length ? 16 : 5 };
    }

    fragmentMemory() {
        this.ram.forEach((slot, index) => {
            if (index % 3 === 1) {
                slot.type = "hole";
                slot.label = "hole";
                slot.size = randomInt(8, 24);
            } else if (slot.type === "free") {
                slot.type = "used";
                slot.label = `P${index + 1}`;
                slot.size = randomInt(12, 36);
            }
        });
        this.updateFragmentation();
        this.event = "RAM was intentionally fragmented. Notice how free space is split into smaller holes.";
        return { state: this.snapshot(), xp: 14 };
    }

    shuffleProcesses() {
        this.templateIndex = (this.templateIndex + 1) % processTemplates.length;
        this.processes = cloneProcesses(processTemplates[this.templateIndex]);
        this.schedule = [];
        this.scheduleCursor = -1;
        this.activeProcess = null;
        this.event = "Loaded a fresh process queue with new burst times and priorities.";
        return { state: this.snapshot(), xp: 4 };
    }

    buildSchedule(algorithm) {
        this.schedule = scheduleProcesses(this.processes, algorithm);
        this.scheduleCursor = -1;
        this.activeProcess = null;
        this.event = `Generated ${labelAlgorithm(algorithm)} timeline. Step through CPU ticks or run the full animation.`;
        return { state: this.snapshot(), xp: 14 };
    }

    stepSchedule() {
        if (!this.schedule.length) this.buildSchedule("fcfs");
        this.scheduleCursor = Math.min(this.scheduleCursor + 1, this.schedule.length - 1);
        const segment = this.schedule[this.scheduleCursor];
        this.activeProcess = segment?.id || null;
        this.event = segment
            ? `CPU executed ${segment.id} from ${segment.start} ms to ${segment.end} ms.`
            : "CPU is idle.";
        return { state: this.snapshot(), xp: segment ? 6 : 0 };
    }

    updateFragmentation() {
        const holes = this.ram.filter(cell => cell.type === "hole").length;
        const free = this.ram.filter(cell => cell.type === "free").length;
        this.fragmentation = Math.round((holes / Math.max(1, holes + free)) * 100);
    }

    snapshot() {
        return {
            stack: structuredCloneSafe(this.stack),
            heap: structuredCloneSafe(this.heap),
            ram: structuredCloneSafe(this.ram),
            processes: structuredCloneSafe(this.processes),
            schedule: structuredCloneSafe(this.schedule),
            scheduleCursor: this.scheduleCursor,
            activeProcess: this.activeProcess,
            event: this.event,
            fragmentation: this.fragmentation,
            stats: computeStats(this.processes, this.schedule)
        };
    }
}

export function scheduleProcesses(processes, algorithm) {
    if (algorithm === "roundRobin") return roundRobin(processes, 3);
    const ordered = [...processes].sort((a, b) => {
        if (algorithm === "sjf") return a.burst - b.burst || a.arrival - b.arrival;
        if (algorithm === "priority") return a.priority - b.priority || a.arrival - b.arrival;
        return a.arrival - b.arrival;
    });

    let time = 0;
    return ordered.map(process => {
        time = Math.max(time, process.arrival);
        const start = time;
        const end = start + process.burst;
        time = end;
        return { id: process.id, start, end, duration: end - start, color: process.color };
    });
}

function roundRobin(processes, quantum) {
    const remaining = processes.map(process => ({ ...process, remaining: process.burst }));
    const timeline = [];
    let time = 0;
    let guard = 0;

    while (remaining.some(process => process.remaining > 0) && guard < 80) {
        for (const process of remaining) {
            if (process.remaining <= 0 || process.arrival > time) continue;
            const duration = Math.min(quantum, process.remaining);
            timeline.push({ id: process.id, start: time, end: time + duration, duration, color: process.color });
            process.remaining -= duration;
            time += duration;
        }
        if (!timeline.length || remaining.every(process => process.arrival > time || process.remaining <= 0)) time++;
        guard++;
    }
    return timeline;
}

function computeStats(processes, schedule) {
    if (!schedule.length) return { avgWaiting: 0, avgTurnaround: 0, cpuUsage: 0 };
    const completion = new Map();
    schedule.forEach(segment => completion.set(segment.id, segment.end));
    const totals = processes.map(process => {
        const doneAt = completion.get(process.id) || 0;
        const turnaround = Math.max(0, doneAt - process.arrival);
        const waiting = Math.max(0, turnaround - process.burst);
        return { waiting, turnaround };
    });
    const avgWaiting = average(totals.map(item => item.waiting));
    const avgTurnaround = average(totals.map(item => item.turnaround));
    const busy = schedule.reduce((sum, segment) => sum + segment.duration, 0);
    const end = Math.max(...schedule.map(segment => segment.end), 1);
    return { avgWaiting, avgTurnaround, cpuUsage: Math.round((busy / end) * 100) };
}

function cloneProcesses(processes) {
    return processes.map(process => ({ ...process }));
}

function average(values) {
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
}

function labelAlgorithm(value) {
    return { fcfs: "FCFS", sjf: "SJF", roundRobin: "Round Robin", priority: "Priority Scheduling" }[value] || "FCFS";
}

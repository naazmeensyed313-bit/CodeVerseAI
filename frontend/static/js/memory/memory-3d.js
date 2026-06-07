let scene;
let camera;
let renderer;
let lab;
let raycaster;
let mouse;
let hostElement;
let hoverables = [];
let busParticles = [];
let lastState = null;
let cameraMode = "overview";
let cpuCoreMesh = null;

const cameraViews = {
    overview: { position: { x: 0, y: 4.8, z: 9.8 }, target: { x: 0, y: -0.35, z: 0 } },
    stack: { position: { x: -5.7, y: 3.4, z: 5.8 }, target: { x: -4.8, y: 0.2, z: 0 } },
    cpu: { position: { x: 0, y: 3.2, z: 5.4 }, target: { x: 0, y: 0.45, z: 0 } },
    heap: { position: { x: 5.4, y: 3.4, z: 5.8 }, target: { x: 4.15, y: 0.1, z: 0 } }
};

const zones = {
    stack: { x: -4.8, y: -1.65, z: 0 },
    cpu: { x: 0, y: 0.35, z: 0 },
    heap: { x: 4.05, y: -1.1, z: 0 },
    ram: { x: 0, y: -3.15, z: 0 },
    queue: { x: -2.8, y: 2.45, z: 0 },
    done: { x: 2.8, y: 2.45, z: 0 }
};

export function initMemoryScene() {
    hostElement = document.getElementById("memoryScene");
    if (!hostElement || !window.THREE) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090914, 0.045);
    camera = new THREE.PerspectiveCamera(46, hostElement.clientWidth / hostElement.clientHeight, 0.1, 1000);
    camera.position.set(cameraViews.overview.position.x, cameraViews.overview.position.y, cameraViews.overview.position.z);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(hostElement.clientWidth, hostElement.clientHeight);
    hostElement.innerHTML = "";
    hostElement.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    lab = new THREE.Group();
    scene.add(lab);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    addLight(0xa855f7, -5, 5, 4, 1.7);
    addLight(0x38bdf8, 0, 5, 5, 1.5);
    addLight(0xec4899, 5, 5, 4, 1.6);

    buildEducationalLab();
    bindSceneHover();
    animate();
    window.addEventListener("resize", resizeScene);
}

export function syncMemoryScene(state) {
    if (!lab || !window.THREE) return;
    clearDynamic();
    hoverables = [];

    renderStackTower(state);
    renderHeapGrid(state);
    renderRamBus(state);
    renderCpuScheduling(state);
    renderFragmentationGauge(state);
    lastState = state;
}

export function playSceneAction(action, state) {
    if (!lab || !window.THREE) return;
    const lesson = lessonForAction(action, state);
    setSceneLesson(lesson);

    if (action === "push-stack") animateFunctionCall(state);
    if (action === "pop-stack") animateStackReturn();
    if (action === "stack-overflow") animateOverflow();
    if (action === "allocate-memory") animateHeapAllocation(state);
    if (action === "free-memory") animateFreeMemory();
    if (action === "garbage-collect") animateGarbageCollection();
    if (action === "fragment-memory") animateFragmentation();
    if (action === "start-scheduling") animateSchedulingIntro(state);
    if (action === "step-scheduling") animateCpuStep(state);
}

export function pulseTransfer(kind = "memory") {
    if (!lab || !window.THREE) return;
    const color = kind === "cpu" ? 0x22c55e : kind === "heap" ? 0xec4899 : 0x38bdf8;
    for (let i = 0; i < 18; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 10, 10),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
        );
        particle.position.set(-4 + i * 0.47, -3.08 + Math.sin(i) * 0.08, 0.18);
        particle.userData = { dynamic: true, busParticle: true, life: 1, speed: 0.035 + Math.random() * 0.025 };
        busParticles.push(particle);
        lab.add(particle);
    }
}

export function setCameraMode(mode) {
    cameraMode = cameraViews[mode] ? mode : "overview";
    const view = cameraViews[cameraMode];
    animateObject(camera.position, view.position, 0.8);
    document.querySelectorAll(".camera-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.camera === cameraMode);
    });
}

function buildEducationalLab() {
    addGridFloor();
    addZoneFrame("STACK TOWER", zones.stack.x, -0.15, 0x8b5cf6, 1.6, 4.2);
    addZoneFrame("CPU CORE", zones.cpu.x, zones.cpu.y, 0x22c55e, 2.15, 2.15, true);
    addZoneFrame("HEAP GRID", zones.heap.x, -0.15, 0xec4899, 2.8, 4.2);
    addRamRail();
    addQueueRail();
    addStaticLabel("function calls push upward", -4.8, 2.65, 0, "#c4b5fd", 0.58);
    addStaticLabel("queue -> CPU -> completed", 0, 2.95, 0, "#fde68a", 0.62);
    addStaticLabel("RAM memory bus", 0, -3.72, 0, "#7dd3fc", 0.6);
}

function addGridFloor() {
    const grid = new THREE.GridHelper(13, 26, 0x38bdf8, 0x1e293b);
    grid.position.y = -3.85;
    grid.material.transparent = true;
    grid.material.opacity = 0.34;
    grid.userData.gridFloor = true;
    lab.add(grid);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(13.5, 8),
        new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.38 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.9;
    lab.add(floor);

    const starsGeometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 120; i++) {
        positions.push((Math.random() - 0.5) * 12, Math.random() * 5 - 0.5, -1.8 - Math.random() * 2.8);
    }
    starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.026, transparent: true, opacity: 0.58 }));
    stars.userData.starField = true;
    lab.add(stars);
}

function addZoneFrame(label, x, y, color, width, height, circular = false) {
    const base = circular
        ? new THREE.RingGeometry(0.92, 1.12, 64)
        : new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, 0.06));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
    const frame = circular ? new THREE.Mesh(base, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.2 })) : new THREE.LineSegments(base, material);
    frame.position.set(x, y, -0.04);
    frame.userData.staticSpin = circular;
    lab.add(frame);

    if (circular) {
        const core = new THREE.Mesh(
            new THREE.CylinderGeometry(0.68, 0.68, 0.18, 64),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.48, metalness: 0.45, roughness: 0.28 })
        );
        core.rotation.x = Math.PI / 2;
        core.position.set(x, y, 0);
        core.userData.staticSpin = true;
        core.userData.cpuCore = true;
        cpuCoreMesh = core;
        lab.add(core);
    }

    addStaticLabel(label, x, y + height / 2 + 0.38, 0, colorToCss(color), 0.72);
}

function addRamRail() {
    const rail = new THREE.Mesh(
        new THREE.BoxGeometry(9.6, 0.16, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.36 })
    );
    rail.position.set(0, -3.12, 0);
    lab.add(rail);
}

function addQueueRail() {
    addPathLine([[-3.4, 2.25, 0], [-1.1, 2.25, 0], [-0.45, 0.75, 0]], 0xfacc15, "WAITING QUEUE");
    addPathLine([[0.45, 0.75, 0], [1.3, 2.25, 0], [3.35, 2.25, 0]], 0x22c55e, "COMPLETED");
}

function renderStackTower(state) {
    state.stack.forEach((frame, index) => {
        const y = zones.stack.y + index * 0.56;
        const isActive = index === state.stack.length - 1;
        const mesh = createBox(1.32, 0.42, 0.52, isActive ? 0x22c55e : 0x8b5cf6, {
            kind: "Stack frame",
            title: frame.label,
            address: `0x7FF${(index * 32 + 16).toString(16).toUpperCase()}`,
            size: `${frame.size} KB`,
            owner: isActive ? "Stack pointer points here" : "Current call stack"
        });
        mesh.position.set(zones.stack.x, y, 0);
        mesh.userData.dynamic = true;
        mesh.userData.float = isActive;
        lab.add(mesh);
        hoverables.push(mesh);
        addDynamicLabel(`${frame.label}\n${frame.local || `local_${index + 1}`}\n${frame.size} KB`, zones.stack.x, y + 0.02, 0.32, "#ffffff", 0.34);
    });

    if (state.stack.length) {
        const pointerY = zones.stack.y + (state.stack.length - 1) * 0.56;
        const pointer = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.42, 4),
            new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.6 })
        );
        pointer.rotation.z = -Math.PI / 2;
        pointer.position.set(zones.stack.x - 1.15, pointerY, 0.4);
        pointer.userData.dynamic = true;
        pointer.userData.float = true;
        lab.add(pointer);
        addDynamicLabel("SP", zones.stack.x - 1.55, pointerY, 0.38, "#bbf7d0", 0.34);
    }
}

function renderHeapGrid(state) {
    const cells = state.ram.slice(0, 8);
    const objectsById = new Map(state.heap.map(object => [object.id, object]));
    cells.forEach((cell, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = zones.heap.x - 0.48 + col * 0.96;
        const y = zones.heap.y + row * 0.68;
        const isHole = cell.type === "hole";
        const isUsed = cell.type === "used";
        const color = isHole ? 0x334155 : isUsed ? 0xec4899 : 0x111827;
        const object = objectsById.get(cell.label);
        const mesh = createBox(0.76, 0.48, 0.48, color, {
            kind: isHole ? "Heap hole" : isUsed ? "Heap object" : "Free heap cell",
            title: isUsed ? `${object?.name || "HeapObject"} (${cell.label})` : isHole ? "fragmented hole" : "available",
            address: `0xH${(index * 64 + 128).toString(16).toUpperCase()}`,
            size: `${cell.size} KB`,
            owner: isUsed ? "allocated" : isHole ? "free hole" : "free"
        }, isHole);
        mesh.position.set(x, y, 0);
        mesh.userData.dynamic = true;
        lab.add(mesh);
        hoverables.push(mesh);
        addDynamicLabel(isUsed ? `${object?.name || cell.label}\n${cell.size} KB` : isHole ? "HOLE" : "free", x, y, 0.32, isHole ? "#94a3b8" : "#ffffff", 0.32);
        if (isUsed) {
            addPathLine([[x, y - 0.24, 0], [x - 1.2, -3.12, 0]], 0x38bdf8, "", true);
            if (index === cells.findIndex(item => item.type === "used")) {
                spawnTravelParticles({ x, y: y - 0.24, z: 0.35 }, { x: x - 1.2, y: -3.12, z: 0.35 }, 0x38bdf8, 6);
            }
        }
    });
}

function renderRamBus(state) {
    state.ram.forEach((cell, index) => {
        const x = -4.35 + index * 0.96;
        const color = cell.type === "used" ? 0x0ea5e9 : cell.type === "hole" ? 0xf43f5e : 0x1f2937;
        const mesh = createBox(0.58, 0.34, 0.34, color, {
            kind: "RAM slot",
            title: cell.type === "used" ? cell.label : cell.type,
            address: `0xR${(index * 16).toString(16).padStart(3, "0").toUpperCase()}`,
            size: `${cell.size} KB`,
            owner: cell.type === "used" ? "Active process/object" : "OS memory map"
        }, cell.type === "hole");
        mesh.position.set(x, zones.ram.y, 0.2);
        mesh.userData.dynamic = true;
        mesh.userData.float = cell.type === "used";
        lab.add(mesh);
        hoverables.push(mesh);
    });
}

function renderCpuScheduling(state) {
    const algorithm = document.getElementById("scheduleAlgorithm")?.value || "fcfs";
    const ordered = orderProcessesForDisplay(state.processes, algorithm);
    ordered.forEach((process, index) => {
        const active = state.activeProcess === process.id;
        const completed = hasProcessCompleted(process, state);
        const roundRobinWaiting = algorithm === "roundRobin" && !active && !completed;
        const angle = (index / Math.max(1, ordered.length)) * Math.PI * 2 + performance.now() * 0.0004;
        const x = active ? zones.cpu.x : completed ? zones.done.x + index * 0.38 : roundRobinWaiting ? zones.cpu.x + Math.cos(angle) * 1.45 : zones.queue.x + index * 0.46;
        const y = active ? zones.cpu.y : completed ? zones.done.y : roundRobinWaiting ? zones.cpu.y + Math.sin(angle) * 1.15 : zones.queue.y;
        const color = active ? 0x22c55e : completed ? 0x14b8a6 : process.priority === 1 ? 0xfacc15 : 0xf59e0b;
        const token = new THREE.Mesh(
            new THREE.SphereGeometry(active ? 0.22 : 0.18, 24, 24),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: active ? 0.6 : 0.28 })
        );
        token.position.set(x, y, active ? 0.62 : 0.18);
        token.userData = {
            dynamic: true,
            staticSpin: active,
            float: true,
            info: {
                kind: "Process",
                title: process.id,
                address: `PID-${process.id.replace("P", "")}`,
                size: `${process.burst} ms burst`,
                owner: `priority ${process.priority}, arrival ${process.arrival} ms`
            }
        };
        lab.add(token);
        hoverables.push(token);
        addDynamicLabel(process.id, x, y + 0.36, 0.25, active ? "#bbf7d0" : "#fde68a", 0.35);
    });
}

function orderProcessesForDisplay(processes, algorithm) {
    if (algorithm === "sjf") return [...processes].sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    if (algorithm === "priority") return [...processes].sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
    return processes;
}

function hasProcessCompleted(process, state) {
    if (!state.schedule.length || state.scheduleCursor < 0) return false;
    const elapsed = state.schedule
        .slice(0, state.scheduleCursor + 1)
        .filter(segment => segment.id === process.id)
        .reduce((sum, segment) => sum + segment.duration, 0);
    return elapsed >= process.burst;
}

function renderFragmentationGauge(state) {
    const width = 2.25;
    const fill = Math.max(0.04, state.fragmentation / 100) * width;
    const shell = createBox(width, 0.12, 0.08, 0x1f2937);
    shell.position.set(zones.heap.x, -2.75, 0);
    shell.userData.dynamic = true;
    lab.add(shell);
    const bar = createBox(fill, 0.13, 0.09, state.fragmentation > 45 ? 0xf43f5e : 0x22c55e);
    bar.position.set(zones.heap.x - width / 2 + fill / 2, -2.75, 0.08);
    bar.userData.dynamic = true;
    lab.add(bar);
    addDynamicLabel(`fragmentation ${state.fragmentation}%`, zones.heap.x, -2.45, 0, state.fragmentation > 45 ? "#fecaca" : "#bbf7d0", 0.38);
}

function animateFunctionCall(state) {
    const frame = state.stack[state.stack.length - 1];
    if (!frame) return;
    const targetY = zones.stack.y + (state.stack.length - 1) * 0.56;
    const ghost = createBox(1.32, 0.42, 0.52, 0xa855f7);
    ghost.position.set(-7, 2.75, 0.6);
    ghost.userData.dynamic = true;
    ghost.userData.float = true;
    lab.add(ghost);
    addDynamicLabel(`new call\n${frame.label}`, -7, 3.12, 0.7, "#ddd6fe", 0.34);
    spawnTravelParticles({ x: -6.8, y: 2.75, z: 0.8 }, { x: zones.stack.x, y: targetY, z: 0.8 }, 0xa855f7, 10);
    animateObject(ghost.position, { x: zones.stack.x, y: targetY, z: 0.72 }, 0.85, () => lab.remove(ghost));
}

function animateStackReturn() {
    const ghost = createBox(1.32, 0.42, 0.52, 0x8b5cf6);
    ghost.position.set(zones.stack.x, zones.stack.y + 2.8, 0.7);
    ghost.userData.dynamic = true;
    lab.add(ghost);
    spawnTravelParticles({ x: zones.stack.x, y: zones.stack.y + 2.8, z: 0.8 }, { x: -6.9, y: 3.1, z: 0.9 }, 0x22c55e, 8);
    animateObject(ghost.position, { x: -6.9, y: 3.1, z: 0.9 }, 0.65, () => lab.remove(ghost));
}

function animateOverflow() {
    const warning = document.getElementById("overflowWarning");
    warning?.classList.remove("hidden");
    window.setTimeout(() => warning?.classList.add("hidden"), 1450);
    shakeCamera();
    flashZone(zones.stack.x, 0, 0xf43f5e);
}

function animateHeapAllocation(state) {
    const object = state.heap[state.heap.length - 1];
    const ghost = createBox(0.76, 0.48, 0.48, 0xec4899);
    ghost.position.set(zones.cpu.x, zones.cpu.y, 0.7);
    ghost.userData.dynamic = true;
    lab.add(ghost);
    addDynamicLabel(`allocate\n${object?.name || "object"}\n${object?.size || 32} KB`, zones.cpu.x, zones.cpu.y + 0.56, 0.8, "#fbcfe8", 0.34);
    const heapTarget = { x: zones.heap.x + 0.48, y: zones.heap.y + 1.4, z: 0.75 };
    spawnTravelParticles({ x: zones.cpu.x, y: zones.cpu.y, z: 0.8 }, heapTarget, 0xec4899, 12);
    spawnTravelParticles(heapTarget, { x: zones.ram.x + 2.2, y: zones.ram.y, z: 0.45 }, 0x38bdf8, 14);
    animateObject(ghost.position, heapTarget, 0.85, () => lab.remove(ghost));
    pulseTransfer("heap");
}

function animateFreeMemory() {
    flashZone(zones.heap.x, 0, 0xf59e0b);
    burstParticles({ x: zones.heap.x, y: zones.heap.y + 1.1, z: 0.7 }, 0xf59e0b, 18);
    setSceneLesson("Freeing heap memory removes an object but leaves a visible hole that can fragment memory.");
}

function animateGarbageCollection() {
    flashZone(zones.heap.x, 0, 0x22c55e);
    for (let i = 0; i < 4; i++) {
        spawnTravelParticles({ x: zones.heap.x - 1.1 + i * 0.7, y: zones.heap.y + 2.1, z: 0.7 }, { x: zones.ram.x - 2 + i * 0.8, y: zones.ram.y, z: 0.45 }, 0x22c55e, 6);
    }
    setSceneLesson("Garbage collection scans unreachable heap objects, fades them out, then makes their RAM reusable.");
}

function animateFragmentation() {
    flashZone(zones.heap.x, 0, 0xf43f5e);
    shakeHeapBlocks();
    setSceneLesson("Fragmentation means memory has free space, but it is split into scattered holes.");
}

function animateSchedulingIntro(state) {
    const algorithm = document.getElementById("scheduleAlgorithm")?.value || "fcfs";
    setSceneLesson(schedulingLesson(algorithm));
    state.processes.forEach((process, index) => {
        const token = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 24, 24),
            new THREE.MeshStandardMaterial({ color: process.priority === 1 ? 0xfacc15 : 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.35 })
        );
        token.position.set(-5.9, 2.45, 0.45);
        token.userData.dynamic = true;
        lab.add(token);
        animateObject(token.position, { x: zones.queue.x + index * 0.46, y: zones.queue.y, z: 0.45 }, 0.5 + index * 0.12, () => lab.remove(token));
    });
}

function animateCpuStep(state) {
    const segment = state.schedule[state.scheduleCursor];
    if (!segment) return;
    const token = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.65 })
    );
    token.position.set(zones.queue.x, zones.queue.y, 0.8);
    token.userData.dynamic = true;
    lab.add(token);
    spawnTravelParticles({ x: zones.queue.x, y: zones.queue.y, z: 0.8 }, { x: zones.cpu.x, y: zones.cpu.y, z: 0.9 }, 0xfacc15, 10);
    animateObject(token.position, { x: zones.cpu.x, y: zones.cpu.y, z: 0.9 }, 0.45, () => {
        pulseCpu();
        spawnTravelParticles({ x: zones.cpu.x, y: zones.cpu.y, z: 0.9 }, { x: zones.done.x, y: zones.done.y, z: 0.55 }, 0x22c55e, 10);
        animateObject(token.position, { x: zones.done.x, y: zones.done.y, z: 0.55 }, 0.55, () => lab.remove(token));
    });
}

function schedulingLesson(algorithm) {
    const copy = {
        fcfs: "FCFS sends the earliest arriving process into the CPU first.",
        sjf: "SJF lets the shortest burst jump ahead to reduce average waiting time.",
        roundRobin: "Round Robin rotates processes through the CPU using equal time slices.",
        priority: "Priority scheduling makes urgent high-priority processes glow and run first."
    };
    return copy[algorithm] || copy.fcfs;
}

function lessonForAction(action, state) {
    const copy = {
        "push-stack": "Stack grows with function calls. The newest frame goes on top.",
        "pop-stack": "Returning from a function pops the top stack frame automatically.",
        "stack-overflow": "Stack overflow happens when too many frames exceed the stack limit.",
        "allocate-memory": "Heap allocation creates a dynamic object and links it to RAM.",
        "free-memory": "Freeing memory leaves an empty hole that can cause fragmentation.",
        "garbage-collect": "Garbage collection removes unreachable heap blocks and reclaims RAM.",
        "fragment-memory": "Fragmentation creates scattered holes that make large allocations harder.",
        "step-scheduling": state?.activeProcess ? `${state.activeProcess} is executing on the CPU now.` : "The CPU is ready for the next process."
    };
    return copy[action] || "Every object in this lab represents a real operating-system concept.";
}

function createBox(width, height, depth, color, info = null, wire = false) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: wire ? 0.08 : 0.25,
            transparent: true,
            opacity: wire ? 0.42 : 0.96,
            roughness: 0.35,
            metalness: 0.22,
            wireframe: wire
        })
    );
    if (info) mesh.userData.info = info;
    return mesh;
}

function addPathLine(points, color, label = "", dynamic = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.58 }));
    line.userData.dynamic = dynamic;
    lab.add(line);
    if (label) addStaticLabel(label, points[0][0], points[0][1] + 0.3, 0, colorToCss(color), 0.42);
}

function addStaticLabel(text, x, y, z, color, scale) {
    const sprite = createTextSprite(text, color);
    sprite.position.set(x, y, z);
    sprite.scale.set(scale * 2.8, scale, 1);
    lab.add(sprite);
}

function addDynamicLabel(text, x, y, z, color, scale) {
    const sprite = createTextSprite(text, color);
    sprite.position.set(x, y, z);
    sprite.scale.set(scale * 2.8, scale, 1);
    sprite.userData.dynamic = true;
    lab.add(sprite);
}

function createTextSprite(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "600 34px Poppins, Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    text.split("\n").forEach((line, index, lines) => {
        context.fillText(line, 256, 96 + (index - (lines.length - 1) / 2) * 38);
    });
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    return new THREE.Sprite(material);
}

function clearDynamic() {
    const removable = lab.children.filter(child => child.userData.dynamic);
    removable.forEach(child => {
        if (child.geometry) child.geometry.dispose?.();
        if (child.material) child.material.dispose?.();
        lab.remove(child);
    });
    busParticles = busParticles.filter(particle => !removable.includes(particle));
}

function bindSceneHover() {
    renderer.domElement.addEventListener("pointermove", event => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObjects(hoverables, false)[0];
        const tooltip = document.getElementById("blockTooltip");
        if (!tooltip) return;
        if (!hit?.object?.userData.info) {
            tooltip.classList.add("hidden");
            return;
        }
        const info = hit.object.userData.info;
        tooltip.innerHTML = `<strong>${info.kind}: ${info.title}</strong><br>Address: ${info.address}<br>Size: ${info.size}<br>Owner: ${info.owner}`;
        tooltip.style.left = `${event.clientX - rect.left + 16}px`;
        tooltip.style.top = `${event.clientY - rect.top + 16}px`;
        tooltip.classList.remove("hidden");
    });
    renderer.domElement.addEventListener("pointerleave", () => document.getElementById("blockTooltip")?.classList.add("hidden"));
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    lab.children.forEach(child => {
        if (child.userData.staticSpin) child.rotation.z += 0.008;
        if (child.userData.gridFloor) child.position.x = Math.sin(time * 0.18) * 0.12;
        if (child.userData.starField) child.rotation.z += 0.0008;
        if (child.userData.float) {
            if (child.userData.baseZ === undefined) child.userData.baseZ = child.position.z;
            child.position.z = child.userData.baseZ + Math.sin(time * 2.4 + child.position.x) * 0.035;
        }
    });
    lab.position.y = Math.sin(time * 0.7) * 0.035;
    busParticles = busParticles.filter(particle => {
        particle.position.x += particle.userData.speed;
        particle.position.y = -3.08 + Math.sin(time * 5 + particle.position.x) * 0.08;
        particle.userData.life -= 0.01;
        particle.material.opacity = Math.max(0, particle.userData.life);
        if (particle.position.x > 5 || particle.userData.life <= 0) {
            lab.remove(particle);
            return false;
        }
        return true;
    });
    const view = cameraViews[cameraMode] || cameraViews.overview;
    camera?.lookAt(view.target.x, view.target.y, view.target.z);
    renderer?.render(scene, camera);
}

function pulseCpu() {
    flashZone(zones.cpu.x, zones.cpu.y, 0x22c55e);
    if (cpuCoreMesh && window.gsap) {
        gsap.fromTo(cpuCoreMesh.scale, { x: 1, y: 1, z: 1 }, { x: 1.28, y: 1.28, z: 1.28, duration: 0.18, yoyo: true, repeat: 3, ease: "power2.out" });
    }
}

function flashZone(x, y, color) {
    const pulse = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 1.35, 64),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.58 })
    );
    pulse.position.set(x, y, 0.82);
    pulse.userData.dynamic = true;
    lab.add(pulse);
    animateObject(pulse.scale, { x: 1.9, y: 1.9, z: 1 }, 0.65, () => lab.remove(pulse));
}

function shakeCamera() {
    const base = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    if (window.gsap) {
        gsap.to(camera.position, { x: base.x + 0.18, y: base.y + 0.08, duration: 0.05, yoyo: true, repeat: 9, onComplete: () => camera.position.set(base.x, base.y, base.z) });
    }
}

function shakeHeapBlocks() {
    if (!window.gsap) return;
    lab.children
        .filter(child => child.userData.dynamic && child.position.x > zones.heap.x - 1.6 && child.position.x < zones.heap.x + 1.6)
        .forEach((child, index) => {
            gsap.to(child.position, { x: child.position.x + (index % 2 ? 0.18 : -0.18), duration: 0.12, yoyo: true, repeat: 5 });
        });
}

function spawnTravelParticles(start, end, color, count = 8) {
    if (!window.THREE || !lab) return;
    for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 10, 10),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 })
        );
        particle.position.set(start.x, start.y, start.z);
        particle.userData.dynamic = true;
        lab.add(particle);
        animateObject(particle.position, {
            x: end.x + (Math.random() - 0.5) * 0.18,
            y: end.y + (Math.random() - 0.5) * 0.18,
            z: end.z
        }, 0.42 + i * 0.035, () => lab.remove(particle));
    }
}

function burstParticles(origin, color, count = 14) {
    if (!window.THREE || !lab) return;
    for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 })
        );
        particle.position.set(origin.x, origin.y, origin.z);
        particle.userData.dynamic = true;
        lab.add(particle);
        animateObject(particle.position, {
            x: origin.x + (Math.random() - 0.5) * 1.3,
            y: origin.y + (Math.random() - 0.5) * 1.0,
            z: origin.z + Math.random() * 0.7
        }, 0.55, () => lab.remove(particle));
    }
}

function animateObject(target, values, duration, onComplete) {
    if (window.gsap) {
        gsap.to(target, { ...values, duration, ease: "power2.out", onComplete });
        return;
    }
    Object.assign(target, values);
    if (onComplete) window.setTimeout(onComplete, duration * 1000);
}

function setSceneLesson(text) {
    const target = document.getElementById("sceneLesson");
    if (target) target.textContent = text;
    const tutor = document.getElementById("tutorAnswer");
    if (tutor) tutor.textContent = text;
}

function addLight(color, x, y, z, intensity) {
    const light = new THREE.PointLight(color, intensity, 70);
    light.position.set(x, y, z);
    scene.add(light);
}

function resizeScene() {
    if (!hostElement || !renderer || !camera) return;
    camera.aspect = hostElement.clientWidth / hostElement.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(hostElement.clientWidth, hostElement.clientHeight);
}

function colorToCss(color) {
    return `#${color.toString(16).padStart(6, "0")}`;
}

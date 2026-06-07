import { buildExecutionSteps, tablesFromQuery } from "./database.js";

let scene;
let camera;
let renderer;
let scannerOrb;
let dataPacket;
let animationId = null;
let container;
let tableMeshes = {};
let tableRows = {};
let resultSetGroup;
let connectionLines = [];
let particleGroup;
let resizeHandler = null;

export function initScene() {
    container = document.getElementById("dbScene");
    if (!container || !window.THREE) return;
    disposeScene();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 1000);
    camera.position.set(0, 1.15, 8.2);
    camera.lookAt(0, -0.25, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    addLight(THREE.DirectionalLight, 0xffffff, 1.5, [5, 10, 7]);
    addLight(THREE.PointLight, 0x8b5cf6, 2.5, [-5, 5, 5]);
    addLight(THREE.PointLight, 0xec4899, 2.0, [4, 3, 3]);

    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(9.5, 0.14, 4.8),
        new THREE.MeshStandardMaterial({ color: 0x141421, roughness: 0.35, metalness: 0.25 })
    );
    floor.position.set(0, -1.55, -0.15);
    scene.add(floor);

    // Add holographic grid for visual depth
    const grid = new THREE.GridHelper(10, 20, 0x8b5cf6, 0x1e1e2e);
    grid.position.set(0, -1.42, 0);
    scene.add(grid);

    createTableMesh("students", -3, 0.45, 0, 0x8b5cf6, ["Asha 92", "Ravi 76", "Maya 84", "Kabir 68"]);
    createTableMesh("courses", 3, 0.45, 0, 0xec4899, ["Algorithms", "Databases", "Networks", "AI Basics"]);
    createTableMesh("enrollments", 0, -1.05, 0.05, 0x38bdf8, ["student_id", "course_id", "status"]);
    createConnection("students", "courses");
    createConnection("students", "enrollments");
    createConnection("courses", "enrollments");

    resultSetGroup = new THREE.Group();
    resultSetGroup.position.set(0, 2.2, -1.2);
    scene.add(resultSetGroup);

    scannerOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2 })
    );
    scannerOrb.visible = false;
    scene.add(scannerOrb);

    dataPacket = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 2 })
    );
    dataPacket.visible = false;
    scene.add(dataPacket);

    particleGroup = new THREE.Group();
    scene.add(particleGroup);
    createParticles();
    layoutDatabaseScene();

    resizeHandler = () => {
        if (!renderer || !camera || !container) return;
        camera.aspect = getAspect();
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        layoutDatabaseScene();
    };
    window.addEventListener("resize", resizeHandler);
    animateScene();
}

export function disposeScene() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
    if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
    }
    scene = null;
    camera = null;
    renderer = null;
    scannerOrb = null;
    dataPacket = null;
    particleGroup = null;
    tableMeshes = {};
    tableRows = {};
    connectionLines = [];
}

export function highlightTables(names) {
    Object.entries(tableMeshes).forEach(([name, group]) => {
        const active = names.includes(name);
        group.userData.targetScale = active ? 1.08 : 1;
        group.userData.targetZ = active ? 0.8 : 0; 
        group.userData.targetRotationX = active ? -0.15 : 0;
        group.children[0].material.emissiveIntensity = active ? 1.5 : 0.14;

        (tableRows[name] || []).forEach(row => {
            // Full reset for all rows to ensure they are visible and in position
            row.material.opacity = active ? 0.9 : 0.28;
            row.material.emissiveIntensity = active ? 0.7 : 0.1;
            row.material.color.setHex(0xffffff);
            row.position.set(0, row.userData.originalY, 0.27);
            row.rotation.set(0, 0, 0);
            // Maintain target scale for lerping in loop
            row.userData.targetScale = 1;
            row.visible = true;
        });
    });
    
    if (names.length > 0 && window.gsap) {
        const firstTable = tableMeshes[names[0]];
        gsap.to(camera.position, {
            x: firstTable.position.x * 0.2,
            z: 7.5, // Zoom in slightly
            duration: 1.2,
            ease: "expo.out"
        });
    }
}

export function clearResultSet() {
    if (!resultSetGroup) return;
    resultSetGroup.children.forEach(child => {
        child.geometry?.dispose();
        child.material?.dispose();
    });
    resultSetGroup.clear();
}

async function gsapAnimate(target, vars) {
    return new Promise(resolve => {
        if (window.gsap) {
            window.gsap.to(target, { ...vars, onComplete: resolve });
        } else {
            Object.assign(target, vars);
            setTimeout(resolve, (vars.duration || 0) * 1000);
        }
    });
}

async function animateScan(tableName) {
    const group = tableMeshes[tableName];
    const rows = tableRows[tableName];
    if (!group || !rows || !scannerOrb) return;
    scannerOrb.visible = true;

    // Mechanical "Lead-in"
    await gsapAnimate(scannerOrb.position, {
        x: group.position.x + 1.3,
        y: group.position.y + 0.8,
        z: group.position.z + 0.6,
        duration: 0.4,
        ease: "back.out(1.4)"
    });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const worldPos = new THREE.Vector3();
        row.getWorldPosition(worldPos);
        
        gsapAnimate(scannerOrb.position, {
            y: worldPos.y,
            z: worldPos.z + 0.35,
            duration: 0.12,
            ease: "none"
        });
        
        await gsapAnimate(row.position, { z: 0.6, duration: 0.08, ease: "power2.out" });
        row.material.emissiveIntensity = 4.0;
        row.scale.set(1.2, 1.4, 1.2);
        
        await wait(60);
        
        gsapAnimate(row.position, { z: 0.27, duration: 0.12 });
        row.material.emissiveIntensity = 0.9;
        row.scale.set(1, 1, 1);
    }
    
    gsapAnimate(scannerOrb.material, { opacity: 0, duration: 0.3 }).then(() => scannerOrb.visible = false);
}

async function animateWhere(tableName) {
    const rows = tableRows[tableName];
    if (!rows) return;
    
    const mid = Math.ceil(rows.length / 2);
    const validRows = rows.slice(0, mid);
    const discardRows = rows.slice(mid);

    // Valid rows move forward to the "Active Pipeline"
    validRows.forEach(row => {
        gsapAnimate(row.position, { z: 0.65, duration: 0.5, ease: "power2.out" });
        row.material.emissiveIntensity = 1.5;
        row.material.color.setHex(0x38bdf8);
    });

    // Discarded rows tumble and fall
    await Promise.all(discardRows.map(async (row) => {
        row.material.color.setHex(0xf43f5e); 
        row.material.emissiveIntensity = 2.5;
        
        gsapAnimate(row.rotation, { 
            x: (Math.random() - 0.5) * 4, 
            y: (Math.random() - 0.5) * 4, 
            z: (Math.random() - 0.5) * 4, 
            duration: 0.8 
        });

        await gsapAnimate(row.position, { 
            y: -8,
            z: -4,
            duration: 0.9, 
            ease: "power3.in" 
        });
        row.material.opacity = 0;
    }));
}

async function animateJoin(tableA, tableB) {
    const meshA = tableMeshes[tableA];
    const meshB = tableMeshes[tableB];
    if (!meshA || !meshB) return;

    // Physical "Strain": Tables lean and matched rows move toward center
    gsapAnimate(meshA.rotation, { z: 0.2, duration: 0.6, ease: "power2.inOut" });
    gsapAnimate(meshB.rotation, { z: -0.2, duration: 0.6, ease: "power2.inOut" });

    // Trigger targeted particle stream
    const startPos = new THREE.Vector3().copy(meshA.position);
    const endPos = new THREE.Vector3().copy(meshB.position);
    setParticlesVisible(true, startPos, endPos);

    const rowsA = tableRows[tableA] || [];
    const rowsB = tableRows[tableB] || [];
    if (rowsA[0]) gsapAnimate(rowsA[0].position, { x: 0.4, duration: 0.5 });
    if (rowsB[0]) gsapAnimate(rowsB[0].position, { x: -0.4, duration: 0.5 });

    const beamGeom = new THREE.BufferGeometry().setFromPoints([meshA.position, meshB.position]);
    const beamMat = new THREE.LineBasicMaterial({ 
        color: 0x38bdf8, 
        transparent: true, 
        opacity: 0,
        linewidth: 2
    });
    const beam = new THREE.Line(beamGeom, beamMat);
    scene.add(beam);
    
    await gsapAnimate(beamMat, { opacity: 1, duration: 0.4 });
    
    if (dataPacket) {
        dataPacket.visible = true;
        dataPacket.scale.setScalar(3);
        dataPacket.position.copy(meshA.position);
        
        await gsapAnimate(dataPacket.position, {
            x: meshB.position.x,
            y: meshB.position.y,
            duration: 0.8,
            ease: "power4.inOut"
        });
    }

    gsapAnimate(meshA.rotation, { z: 0, duration: 0.6 });
    gsapAnimate(meshB.rotation, { z: 0, duration: 0.6 });
    if (rowsA[0]) gsapAnimate(rowsA[0].position, { x: 0, duration: 0.4 });
    if (rowsB[0]) gsapAnimate(rowsB[0].position, { x: 0, duration: 0.4 });

    await gsapAnimate(beamMat, { opacity: 0, duration: 0.5 });
    scene.remove(beam);
    setParticlesVisible(false);
}

async function animateSelect(tableName) {
    const table = tableMeshes[tableName];
    const rows = tableRows[tableName];
    if (!table || !rows || rows.length === 0) return;

    // Visual "Detach": Pulse the source row before cloning the result slab
    const sourceRow = rows[0];
    sourceRow.material.emissiveIntensity = 4.0;
    gsapAnimate(sourceRow.scale, { x: 1.15, duration: 0.2, yoyo: true, repeat: 1 });

    const packet = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.25, 0.15),
        new THREE.MeshStandardMaterial({ 
            color: 0x22c55e, 
            emissive: 0x22c55e, 
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 1 
        })
    );
    
    const worldPos = new THREE.Vector3();
    sourceRow.getWorldPosition(worldPos);
    packet.position.copy(worldPos);
    packet.scale.set(0.1, 0.1, 0.1); // Start small for "pop out" effect
    scene.add(packet);

    const rowOffset = resultSetGroup.children.length * 0.25;
    
    // Pipeline flow: Detach -> Arc -> Dock
    await gsapAnimate(packet.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "back.out(1.7)" });
    await gsapAnimate(packet.position, {
        x: (worldPos.x + resultSetGroup.position.x) / 2,
        y: Math.max(worldPos.y, resultSetGroup.position.y) + 2.5,
        z: 1.5,
        duration: 0.5,
        ease: "power2.out"
    });

    await gsapAnimate(packet.position, {
        x: resultSetGroup.position.x,
        y: resultSetGroup.position.y - rowOffset,
        z: resultSetGroup.position.z,
        duration: 0.6,
        ease: "bounce.out"
    });
    
    scene.remove(packet);
    resultSetGroup.add(packet);
    packet.position.set(0, -rowOffset, 0);
}

async function animateGroupBy(tableName) {
    const rows = tableRows[tableName];
    if (!rows) return;
    
    // Elastic "Magnet" effect
    await Promise.all(rows.map(row => 
        gsapAnimate(row.position, { 
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2, 
            z: 0.6, 
            scaleX: 0.8,
            duration: 0.6, 
            ease: "elastic.out(1, 0.5)" 
        })
    ));
    await wait(200);
    // Spread them back slightly
    await Promise.all(rows.map((row, i) => 
        gsapAnimate(row.position, { 
            y: 0.36 - i * 0.23, 
            z: 0.27, 
            duration: 0.4 
        })
    ));
}

async function animateOrderBy(tableName) {
    const rows = tableRows[tableName];
    if (!rows) return;
    // Physically "shuffle" and re-sort the blocks in the stack
    const originalPositions = rows.map(r => r.position.y);
    const shuffled = [...originalPositions].sort(() => Math.random() - 0.5);
    
    await Promise.all(rows.map((row, i) => 
        gsapAnimate(row.position, { y: shuffled[i], duration: 0.4, ease: "power2.inOut" })
    ));
    await wait(150);
    await Promise.all(rows.map((row, i) => 
        gsapAnimate(row.position, { y: originalPositions[i], duration: 0.4, ease: "back.out(1.2)" })
    ));
}

async function animateAggregates(tableName) {
    const rows = tableRows[tableName];
    if (!rows || !scannerOrb) return;
    
    // Orb pulses at the top of the table to signify "calculation"
    const group = tableMeshes[tableName];
    await gsapAnimate(scannerOrb.position, {
        x: group.position.x,
        y: group.position.y + 1.2,
        z: group.position.z + 0.5,
        duration: 0.3
    });

    await Promise.all([
        gsapAnimate(scannerOrb.scale, { x: 2, y: 2, z: 2, duration: 0.4, yoyo: true, repeat: 1 }),
        ...rows.map(row => gsapAnimate(row.material, { emissiveIntensity: 2, duration: 0.3, yoyo: true, repeat: 1 }))
    ]);
}

export async function animateExecution(query) {
    const steps = buildExecutionSteps(query);
    renderExecutionSteps(steps);
    const tables = tablesFromQuery(query);
    
    // Stop any current data packet movements
    if (dataPacket) {
        dataPacket.visible = false;
        if (window.gsap) gsap.killTweensOf(dataPacket.position);
    }

    clearResultSet();
    highlightTables(tables);

    for (let index = 0; index < steps.length; index += 1) {
        const stepItems = document.querySelectorAll(".execution-step");
        if (stepItems[index]) stepItems[index].classList.add("active");

        setSceneStatus(steps[index]);
        
        const stepText = steps[index];
        if (stepText.includes("Scanning")) {
            await animateScan(tables[0] || "students");
        } else if (stepText.includes("JOIN")) {
            pulseConnections(true);
            await animateJoin(tables[0], tables[1]);
            pulseConnections(false);
        } else if (stepText.includes("WHERE") || stepText.includes("Filtering")) {
            await animateWhere(tables[0] || "students");
        } else if (stepText.includes("Grouping")) {
            await animateGroupBy(tables[0] || "students");
        } else if (stepText.includes("Calculating")) {
            await animateAggregates(tables[0] || "students");
        } else if (stepText.includes("Sorting")) {
            await animateOrderBy(tables[0] || "students");
        } else if (stepText.includes("Selecting")) {
            await animateSelect(tables[0] || "students");
        } else {
            await wait(400);
        }
    }
}

export function renderExecutionSteps(steps) {
    const target = document.getElementById("executionSteps");
    if (!target) return;
    if (!steps.length) {
        target.innerHTML = `<div class="execution-step rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">Run a query to watch SQL execution.</div>`;
        return;
    }
    target.innerHTML = steps.map((step, index) => `
        <div class="execution-step rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
            <span class="mr-2 text-purple-200">${index + 1}.</span>${step}
        </div>
    `).join("");
}

function createTableMesh(name, x, y, z, color, rows) {
    const group = new THREE.Group();
    group.userData.baseScale = 1;
    group.userData.targetScale = 1;
    const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.82,
        roughness: 0.25,
        metalness: 0.35,
        emissive: color,
        emissiveIntensity: 0.18
    });
    group.add(new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.25, 0.25), material));
    group.add(createLabelMesh(name));

    tableRows[name] = [];
    rows.forEach((row, index) => {
        const rowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.68, 0.13, 0.13),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, emissive: color, emissiveIntensity: 0.1 })
        );
        const rowY = 0.36 - index * 0.23;
        rowMesh.position.set(0, rowY, 0.27);
        rowMesh.userData.originalY = rowY;
        group.add(rowMesh);
        tableRows[name].push(rowMesh);
    });

    group.position.set(x, y, z);
    scene.add(group);
    tableMeshes[name] = group;
}

function createLabelMesh(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(10,10,18,0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Poppins, Arial";
    ctx.fillText(name, 44, 78);
    ctx.fillStyle = "#d1d5db";
    ctx.font = "26px Poppins, Arial";
    ctx.fillText(name === "students" ? "id  name  score" : name === "courses" ? "id  title  level" : "student_id  course_id", 44, 140);
    const texture = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
    mesh.position.z = 0.16;
    return mesh;
}

function createConnection(a, b) {
    const line = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24 })
    );
    scene.add(line);
    const connection = { line, from: a, to: b };
    connectionLines.push(connection);
    updateConnectionLine(connection);
}

function createParticles() {
    for (let index = 0; index < 20; index += 1) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 2, transparent: true, opacity: 0 })
        );
        particle.userData.offset = index / 20;
        particle.userData.speed = 0.5 + Math.random() * 0.5;
        particleGroup.add(particle);
    }
}

function layoutDatabaseScene() {
    if (!container || !tableMeshes.students) return;
    const compact = container.clientWidth < 560;
    const positions = compact
        ? { students: [-1.45, 0.78, 0], courses: [1.45, 0.78, 0], enrollments: [0, -0.88, 0.05] }
        : { students: [-3, 0.45, 0], courses: [3, 0.45, 0], enrollments: [0, -1.05, 0.05] };

    Object.entries(positions).forEach(([name, position]) => {
        tableMeshes[name].position.set(position[0], position[1], position[2]);
        tableMeshes[name].userData.baseScale = compact ? 0.74 : 1;
        tableMeshes[name].scale.setScalar(tableMeshes[name].userData.baseScale);
    });
    camera.position.set(0, compact ? 1.35 : 1.15, compact ? 7.4 : 8.2);
    camera.lookAt(0, -0.25, 0);
    connectionLines.forEach(updateConnectionLine);
}

function animateScene() {
    animationId = requestAnimationFrame(animateScene);
    if (!renderer || !scene || !camera) return;
    const time = Date.now() * 0.001;
    Object.values(tableMeshes).forEach((group, index) => {
        const base = group.userData.baseScale || 1;
        const target = (group.userData.targetScale || 1) * base;
        group.scale.lerp(new THREE.Vector3(target, target, target), 0.08);
        // Increased floating and tilting intensity for better visibility
        group.position.z = THREE.MathUtils.lerp(group.position.z, group.userData.targetZ || 0, 0.1);
        group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, group.userData.targetRotationX || 0, 0.1);
        group.rotation.y = Math.sin(time * 1.0 + index) * 0.15; // More pronounced rotation
        // Use absolute positioning for floating to avoid drift
        const baseY = (container.clientWidth < 560) ? (index === 2 ? -0.88 : 0.78) : (index === 2 ? -1.05 : 0.45);
        group.position.y = baseY + Math.sin(time * 1.5 + index) * 0.08; // Higher float range
    });
    
    connectionLines.forEach(updateConnectionLine);
    if (scannerOrb) scannerOrb.scale.setScalar(1 + Math.sin(time * 5) * 0.22);
    
    animateParticles(time);
    renderer.render(scene, camera);
}

function animateParticles(time) {
    if (!particleGroup) return;
    const path = particleGroup.userData.path;
    particleGroup.children.forEach(particle => {
        if (particle.material.opacity <= 0) return;
        const t = (time * particle.userData.speed + particle.userData.offset) % 1;
        
        if (path) {
            // Flow between specific points
            particle.position.lerpVectors(path.start, path.end, t);
            particle.position.y += Math.sin(t * Math.PI) * 0.5; // Arched path
            particle.position.z = 0.8;
        } else {
            // Default idle flow
            particle.position.set(-2.6 + t * 5.2, 0.46 + Math.sin(t * Math.PI) * 0.35, 0.86);
        }
    });
}

function setParticlesVisible(visible, start = null, end = null) {
    if (!particleGroup) return;
    if (visible && start && end) {
        particleGroup.userData.path = { start, end };
    } else {
        particleGroup.userData.path = null;
    }

    particleGroup.children.forEach(particle => {
        gsapAnimate(particle.material, { opacity: visible ? 0.8 : 0, duration: 0.3 });
    });
}

function pulseConnections(active) {
    connectionLines.forEach(connection => {
        connection.line.material.opacity = active ? 0.82 : 0.24;
    });
}

function updateConnectionLine(connection) {
    const from = tableMeshes[connection.from];
    const to = tableMeshes[connection.to];
    if (!from || !to) return;
    
    const start = new THREE.Vector3().setFromMatrixPosition(from.matrixWorld);
    const end = new THREE.Vector3().setFromMatrixPosition(to.matrixWorld);
    connection.line.geometry.setFromPoints([start, end]);
}

function addLight(LightClass, color, intensity, position) {
    const light = new LightClass(color, intensity, 24);
    light.position.set(position[0], position[1], position[2]);
    scene.add(light);
}

function setSceneStatus(text) {
    const status = document.getElementById("sceneStatus");
    if (status) status.innerText = text;
}

function getAspect() {
    return Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
}

function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

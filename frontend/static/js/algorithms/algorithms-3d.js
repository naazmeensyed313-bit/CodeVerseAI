import { colors } from './algorithms-data.js';

export let scene, camera, renderer, blocks = [], labels = [], sceneParticles = [], comparisonBeams = [], selectedIndices = [];
const sceneContainer = document.getElementById("scene");

export function initScene(onResizeCallback) {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.035);

    camera = new THREE.PerspectiveCamera(45, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    setResponsiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    sceneContainer.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 8);
    scene.add(keyLight);

    const purpleLight = new THREE.PointLight(0xd946ef, 1.5, 26);
    purpleLight.position.set(-6, 7, 6);
    scene.add(purpleLight);

    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.16, 7),
        new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.35, metalness: 0.25 })
    );
    floor.position.y = -0.1;
    scene.add(floor);

    const grid = new THREE.GridHelper(18, 28, 0x38bdf8, 0x2a2240);
    grid.position.y = 0.02;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("mousedown", (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(blocks);

        if (intersects.length > 0) {
            const index = intersects[0].object.userData.index;
            if (window.onBlockClick) window.onBlockClick(index);
        }
    });

    window.addEventListener("resize", () => {
        camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
        setResponsiveCamera();
        camera.updateProjectionMatrix();
        renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
        if (onResizeCallback) onResizeCallback();
    });
}

export function setResponsiveCamera() {
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth < 1024;
    const distance = isMobile ? 24 : isTablet ? 21 : 18;
    const height = isMobile ? 10 : 9;
    camera.position.set(0, height, distance);
    camera.lookAt(0, 2.5, 0);
}

export function clearSceneEffects() {
    [...sceneParticles, ...comparisonBeams].forEach(effect => scene.remove(effect));
    sceneParticles = [];
    comparisonBeams = [];
}

export function drawBlocks(values, spacing) {
    blocks.forEach(block => scene.remove(block));
    labels.forEach(label => scene.remove(label));
    clearSceneEffects();
    blocks = [];
    labels = [];

    const startX = -((values.length - 1) * spacing) / 2;
    values.forEach((value, index) => {
        const height = value / 14;
        const geometry = new THREE.BoxGeometry(1, height, 1);
        const material = new THREE.MeshStandardMaterial({
            color: colors.normal, roughness: 0.28, metalness: 0.35, emissive: 0x2b0638, emissiveIntensity: 0.28
        });

        const block = new THREE.Mesh(geometry, material);
        block.position.set(startX + index * spacing, height / 2, 0);
        block.userData.index = index;
        scene.add(block);
        blocks.push(block);

        const label = createValueLabel(value);
        label.position.set(block.position.x, height + 0.65, 0);
        scene.add(label);
        labels.push(label);
    });
}

function createValueLabel(value) {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(10, 10, 18, 0.82)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "bold 34px Poppins, Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(value, 64, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(1.15, 0.58, 1);
    return sprite;
}

export function toggleBlockSelection(index) {
    const idx = selectedIndices.indexOf(index);
    if (!blocks[index]) return;

    if (idx > -1) {
        selectedIndices.splice(idx, 1);
        setBlockColor(blocks[index], colors.normal);
    } else {
        if (selectedIndices.length >= 2) {
            // Auto-deselect oldest if trying to select a 3rd one
            const oldest = selectedIndices.shift();
            setBlockColor(blocks[oldest], colors.normal);
        }
        selectedIndices.push(index);
        setBlockColor(blocks[index], colors.min);
    }
}

export function clearSelection() {
    selectedIndices.forEach(idx => setBlockColor(blocks[idx], colors.normal));
    selectedIndices = [];
}

export function setBlockColor(block, color) {
    if (!block) return;
    block.material.color.setHex(color);
    block.material.emissive.setHex(color);
    block.material.emissiveIntensity = color === colors.normal ? 0.18 : 0.42;
}

export function addComparisonBeam(firstIndex, secondIndex, color) {
    if (!blocks[firstIndex] || !blocks[secondIndex]) return;
    const first = blocks[firstIndex].position;
    const second = blocks[secondIndex].position;
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(first.x, first.y + 0.8, 0),
        new THREE.Vector3(second.x, second.y + 0.8, 0)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    scene.add(line);
    comparisonBeams.push(line);
    setTimeout(() => { scene.remove(line); geometry.dispose(); }, 420);
}

export function spawnSwapParticles(firstIndex, secondIndex) {
    if (!blocks[firstIndex] || !blocks[secondIndex]) return;
    const first = blocks[firstIndex].position;
    const second = blocks[secondIndex].position;
    for (let i = 0; i < 12; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 10, 10),
            new THREE.MeshBasicMaterial({ color: i % 2 ? colors.compare : colors.min, transparent: true, opacity: 0.9 })
        );
        particle.position.set(i % 2 ? first.x : second.x, Math.max(first.y, second.y) + 0.8, 0.2);
        scene.add(particle);
        sceneParticles.push(particle);
        const target = i % 2 ? second : first;
        gsap.to(particle.position, {
            x: target.x + (Math.random() - 0.5) * 0.4,
            y: target.y + 1.2 + Math.random() * 0.8,
            z: (Math.random() - 0.5) * 1.2,
            duration: 0.45, ease: "power2.out", onComplete: () => scene.remove(particle)
        });
    }
}

export async function swapBlocksAnimation(firstIndex, secondIndex, values, speed, onSync) {
    const firstBlock = blocks[firstIndex];
    const secondBlock = blocks[secondIndex];
    const firstLabel = labels[firstIndex];
    const secondLabel = labels[secondIndex];

    // 1. Instantly update internal references to prevent race conditions
    [blocks[firstIndex], blocks[secondIndex]] = [blocks[secondIndex], blocks[firstIndex]];
    [labels[firstIndex], labels[secondIndex]] = [labels[secondIndex], labels[firstIndex]];
    [values[firstIndex], values[secondIndex]] = [values[secondIndex], values[firstIndex]];

    // 2. Sync Metadata
    if (blocks[firstIndex]) blocks[firstIndex].userData.index = firstIndex;
    if (blocks[secondIndex]) blocks[secondIndex].userData.index = secondIndex;

    // 3. Perform GSAP Animation
    const duration = Math.max(0.2, speed / 1000);
    
    return new Promise(resolve => {
        const tl = gsap.timeline({ onComplete: () => {
            onSync();
            resolve();
        }});

        // Animate blocks in an arc
        tl.to(firstBlock.position, { x: secondBlock.position.x, z: 1.2, duration: duration / 2, ease: "power1.out" }, 0);
        tl.to(firstBlock.position, { z: 0, duration: duration / 2, ease: "power1.in" }, duration / 2);
        
        tl.to(secondBlock.position, { x: firstBlock.position.x, z: -1.2, duration: duration / 2, ease: "power1.out" }, 0);
        tl.to(secondBlock.position, { z: 0, duration: duration / 2, ease: "power1.in" }, duration / 2);

        // Labels follow the blocks
        tl.to(firstLabel.position, { x: secondBlock.position.x, duration: duration, ease: "power1.inOut" }, 0);
        tl.to(secondLabel.position, { x: firstBlock.position.x, duration: duration, ease: "power1.inOut" }, 0);
    });
}

export function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    scene.rotation.y = Math.sin(time * 0.35) * 0.055;
    sceneParticles = sceneParticles.filter(particle => {
        if (!particle.parent) return false;
        particle.material.opacity = Math.max(0, particle.material.opacity - 0.015);
        return particle.material.opacity > 0.02;
    });
    camera.lookAt(0, 2.5 + Math.sin(time * 0.8) * 0.14, 0);
    renderer.render(scene, camera);
}

export function cinematicCamera(x, y, z) {
    gsap.to(camera.position, { x, y, z, duration: 0.8, ease: "power2.out" });
}

export async function updateMergedBlock(index, value, arraySyncCallback) {
    const height = value / 14;
    const block = blocks[index];
    const oldLabel = labels[index];

    return new Promise(resolve => {
        // Create new label for the new value
        const newLabel = createValueLabel(value);
        newLabel.position.copy(oldLabel.position);
        newLabel.material.opacity = 0;
        scene.add(newLabel);
        
        const tl = gsap.timeline({ onComplete: () => {
            scene.remove(oldLabel);
            labels[index] = newLabel;
            arraySyncCallback();
            resolve();
        }});

        // Animate geometry change via scale and position
        tl.to(block.scale, { y: height / (block.geometry.parameters.height || 1), duration: 0.4, ease: "back.out(1.7)" }, 0);
        tl.to(block.position, { y: height / 2, duration: 0.4, ease: "back.out(1.7)" }, 0);
        
        // Fade labels
        tl.to(oldLabel.material, { opacity: 0, duration: 0.2 }, 0);
        tl.to(newLabel.material, { opacity: 1, duration: 0.2 }, 0.2);
        tl.to(newLabel.position, { y: height + 0.65, duration: 0.4 }, 0);
    });
}
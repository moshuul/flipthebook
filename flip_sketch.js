// ink% — flip_sketch.js (NO Web Serial)
// - Controls via sliders + buttons + keyboard
// - Data presets & formats from window.inkData
// - Mounts canvas into #canvasHost

let handpose;
let video;
let predictions = [];

let ellipses = [];
let ellipseX, ellipseY, ellipseWidth, ellipseHeight, ellipseAngle;
let textIndex = 0;
let paragraph = `Taking myself to stages illuminated by varying lights and digital effects, I immersed myself in a dynamic landscape of artistic, technological, and entrepreneurial. Believing in design’s power to bridge science, technology, and business, I leveraged user experience principles, behavioral economics, and technological feasibility to create solutions that resonate both artistically and commercially, ensuring creativity translates into tangible value across industries.`;

let textArray;
let waveAmount = 4;   // slider default
let blurAmount = 0;   // slider default
let fontSize = 18;    // slider default

let yOffset = 0; // canvas visually inset by CSS

// DOM refs
let $font, $wave, $blur, $save, $download, $reset, $input;
let $formatSel, $presetSel;
let hostEl;

function setup() {
    hostEl = document.getElementById("canvasHost");
    const { w, h } = hostSize();
    const c = createCanvas(w, h);
    c.parent("canvasHost");

    textFont("Courier New");
    textSize(fontSize);
    textAlign(CENTER, CENTER);

    setupDOM();
    wireControls();
    initDataMenus();      // <- 预设 & 版式

    // Camera & handpose
    video = createCapture(VIDEO, () => video.size(width, height));
    video.hide();
    handpose = ml5.handpose(video, () => console.log("Handpose model ready"));
    handpose.on("predict", (results) => (predictions = results));

    textArray = paragraph.split("");
}

function setupDOM() {
    $font = document.getElementById("fontSlider");
    $wave = document.getElementById("waveSlider");
    $blur = document.getElementById("blurSlider");
    $save = document.getElementById("saveBtn");
    $download = document.getElementById("downloadBtn");
    $reset = document.getElementById("resetBtn");
    $input = document.getElementById("inputBox");
    $formatSel = document.getElementById("formatSelect");
    $presetSel = document.getElementById("presetSelect");
}

function wireControls() {
    if ($font) {
        $font.value = String(fontSize);
        $font.addEventListener("input", (e) => {
            fontSize = clampInt(parseInt(e.target.value, 10), 8, 72);
            textSize(fontSize);
        });
    }
    if ($wave) {
        $wave.value = String(waveAmount);
        $wave.addEventListener("input", (e) => {
            waveAmount = clampInt(parseInt(e.target.value, 10), 0, 50);
        });
    }
    if ($blur) {
        $blur.value = String(blurAmount);
        $blur.addEventListener("input", (e) => {
            blurAmount = clampInt(parseInt(e.target.value, 10), 0, 50);
        });
    }

    if ($save) $save.addEventListener("click", saveCurrentEllipse);
    if ($download) $download.addEventListener("click", () => saveCanvas("ink-%", "png"));
    if ($reset) $reset.addEventListener("click", resetAll);

    if ($input) {
        $input.value = paragraph;
        $input.addEventListener("input", () => {
            paragraph = $input.value;
            textArray = paragraph.split("");
            textIndex = 0;
            // 让已保存圈渐隐（可选）
            for (let e of ellipses) { e.opacity = 255; e.fade = true; }
        });
    }

    // keyboard shortcuts
    window.addEventListener("keydown", (e) => {
        if (e.repeat) return;
        switch (e.key) {
            case "s": case "S": e.preventDefault(); saveCurrentEllipse(); break;
            case "d": case "D": e.preventDefault(); saveCanvas("ink-%", "png"); break;
            case "r": case "R": e.preventDefault(); resetAll(); break;
            case "[": fontSize = clampInt(fontSize - 1, 8, 72); textSize(fontSize); syncSlider($font, fontSize); break;
            case "]": fontSize = clampInt(fontSize + 1, 8, 72); textSize(fontSize); syncSlider($font, fontSize); break;
            case "1": waveAmount = clampInt(waveAmount - 1, 0, 50); syncSlider($wave, waveAmount); break;
            case "2": waveAmount = clampInt(waveAmount + 1, 0, 50); syncSlider($wave, waveAmount); break;
            case "3": blurAmount = clampInt(blurAmount - 1, 0, 50); syncSlider($blur, blurAmount); break;
            case "4": blurAmount = clampInt(blurAmount + 1, 0, 50); syncSlider($blur, blurAmount); break;
        }
    });
}

function initDataMenus() {
    // Format
    if ($formatSel && window.inkData?.formats) {
        $formatSel.innerHTML = "";
        Object.entries(window.inkData.formats).forEach(([key, f]) => {
            const opt = document.createElement("option");
            opt.value = key; opt.textContent = f.label || key;
            $formatSel.appendChild(opt);
        });
        $formatSel.addEventListener("change", () => applyFormat($formatSel.value));
    }

    // Preset
    if ($presetSel && window.inkData?.presets) {
        $presetSel.innerHTML = "";
        window.inkData.presets.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id; opt.textContent = p.label || p.id;
            $presetSel.appendChild(opt);
        });
        $presetSel.addEventListener("change", () => applyPreset($presetSel.value));
    }

    // 默认：优先预设
    if ($presetSel?.options.length) {
        $presetSel.selectedIndex = 0;
        applyPreset($presetSel.value);
    } else if ($formatSel?.value) {
        applyFormat($formatSel.value);
    }
}

function applyPreset(presetId) {
    const preset = window.inkData.presets.find(p => p.id === presetId);
    if (!preset) return;

    // 1) 版式
    applyFormat(preset.format);

    // 2) 文段
    const passage = window.inkData.passages.find(x => x.id === preset.passage);
    if (passage) {
        paragraph = passage.text;
        textArray = paragraph.split("");
        textIndex = 0;
        if ($input) $input.value = paragraph;
        const infoTitle = document.getElementById("info-title");
        if (infoTitle) infoTitle.textContent = passage.title || "Title";
    }

    // 3) 参数
    if (preset.params) {
        if (typeof preset.params.fontSize === "number") { fontSize = preset.params.fontSize; textSize(fontSize); syncSlider($font, fontSize); }
        if (typeof preset.params.wave === "number") { waveAmount = preset.params.wave; syncSlider($wave, waveAmount); }
        if (typeof preset.params.blur === "number") { blurAmount = preset.params.blur; syncSlider($blur, blurAmount); }
    }

    // 清空历史圈
    ellipses = []; textIndex = 0;
}

function applyFormat(formatKey) {
    const f = window.inkData.formats?.[formatKey];
    if (!f) return;

    const spread = document.getElementById("community");
    const rightPage = document.querySelector(".right-page");
    if (spread) {
        spread.classList.toggle("is-single", f.pages === "single");
        spread.classList.toggle("is-spread", f.pages !== "single");
    }
    if (rightPage) rightPage.style.display = (f.pages === "single") ? "none" : "";

    enforceAspectOnHost(f.aspect);
}

function enforceAspectOnHost(targetAspect = 1) {
    const host = document.getElementById("canvasHost");
    if (!host) return;
    host.style.aspectRatio = String(targetAspect);
    requestAnimationFrame(() => {
        const w = host.clientWidth || 600;
        const h = Math.round(w / targetAspect);
        resizeCanvas(w, h);
        if (video) video.size(w, h);
    });
}

function draw() {
    background(255);
    const time = millis() / 2000;
    const time2 = time + 5;

    if (predictions.length > 0) {
        updateControlledEllipse();
        drawControlledEllipse(time, time2);
        drawMirroredEllipse(time, time2);
    }

    drawAllEllipses(time, time2);
    textSize(fontSize);
}

function updateControlledEllipse() {
    const landmarks = predictions[0].landmarks;
    let sumX = 0, sumY = 0;
    for (let pt of landmarks) { sumX += pt[0]; sumY += pt[1]; }
    const cx = sumX / landmarks.length;
    const cy = sumY / landmarks.length;
    ellipseX = lerp(ellipseX || cx, cx, 0.2);
    ellipseY = lerp(ellipseY || cy + yOffset, cy + yOffset, 0.2);

    let maxX = 0, maxY = 0;
    for (let i = 0; i < landmarks.length; i++) {
        for (let j = i + 1; j < landmarks.length; j++) {
            maxX = max(maxX, abs(landmarks[i][0] - landmarks[j][0]));
            maxY = max(maxY, abs(landmarks[i][1] - landmarks[j][1]));
        }
    }
    ellipseWidth = lerp(ellipseWidth || 100, maxX, 0.2);
    ellipseHeight = lerp(ellipseHeight || 100, maxY, 0.2);

    const dx = landmarks[4][0] - landmarks[8][0];
    const dy = landmarks[4][1] - landmarks[8][1];
    const angle = atan2(dy, dx);
    ellipseAngle = lerp(ellipseAngle || angle, angle, 0.2);
}

function drawControlledEllipse(time, time2) {
    drawEllipseWithText(ellipseX, ellipseY, ellipseWidth, ellipseHeight, ellipseAngle, textIndex, false, time, time2);
}
function drawMirroredEllipse(time, time2) {
    drawEllipseWithText(width - ellipseX, ellipseY, ellipseWidth, ellipseHeight, PI - ellipseAngle, textIndex, true, time, time2);
}
function drawAllEllipses(time, time2) {
    for (let e of ellipses) {
        if (e.fade && e.opacity > 0) e.opacity -= 2;
        drawFixedTextEllipse(e.x, e.y, e.w, e.h, e.angle, e.text, false, e.opacity, time, time2);
        drawFixedTextEllipse(width - e.x, e.y, e.w, e.h, PI - e.angle, e.text, true, e.opacity, time, time2);
    }
}

function drawEllipseWithText(cx, cy, w, h, angle, startIndex, mirrored, time, time2) {
    push(); translate(cx, cy); rotate(angle); noFill(); noStroke(); ellipse(0, 0, w, h);
    const steps = max(8, floor((PI * (w + h) / 2) / max(8, fontSize)));
    const count = min(textArray.length - startIndex, steps);
    const step = TWO_PI / steps;
    for (let i = 0; i < count; i++) {
        const idx = startIndex + i;
        let a = -PI / 2 + i * step; if (mirrored) a *= -1;
        const x = (w / 2) * cos(a); const y = (h / 2) * sin(a);
        const yN = noise(x / 100, y / 100, time);
        const aN = noise(x / 50 + 5, y / 50 + 5, time2);
        const yJitter = yN * waveAmount - waveAmount / 2;
        const angleOffset = aN * waveAmount / 25 - waveAmount / 50;
        push(); translate(x, y + yJitter); rotate(a + HALF_PI + angleOffset);
        fill(0, map(blurAmount, 0, 50, 255, 100)); noStroke();
        drawingContext.shadowColor = "black"; drawingContext.shadowBlur = blurAmount;
        text(textArray[idx], 0, 0); pop();
    }
    pop();
}

function drawFixedTextEllipse(cx, cy, w, h, angle, fixedText, mirrored, opacity = 255, time, time2) {
    push(); translate(cx, cy); rotate(angle); noFill(); noStroke(); ellipse(0, 0, w, h);
    const steps = max(8, floor((PI * (w + h) / 2) / max(8, fontSize)));
    const count = min(fixedText.length, steps);
    const step = TWO_PI / steps;
    for (let i = 0; i < count; i++) {
        let a = -PI / 2 + i * step; if (mirrored) a *= -1;
        const x = (w / 2) * cos(a); const y = (h / 2) * sin(a);
        const yN = noise(x / 100, y / 100, time);
        const aN = noise(x / 50 + 5, y / 50 + 5, time2);
        const yJitter = yN * waveAmount - waveAmount / 2;
        const angleOffset = aN * waveAmount / 25 - waveAmount / 50;
        push(); translate(x, y + yJitter); rotate(a + HALF_PI + angleOffset);
        fill(0, opacity); noStroke();
        drawingContext.shadowColor = "black"; drawingContext.shadowBlur = blurAmount;
        text(fixedText[i], 0, 0); pop();
    }
    pop();
}

function saveCurrentEllipse() {
    const charsPerCircle = max(1, floor((PI * (ellipseWidth + ellipseHeight) / 2) / max(8, fontSize)));
    const end = min(textIndex + charsPerCircle, textArray.length);
    const slice = textArray.slice(textIndex, end);
    ellipses.push({
        x: ellipseX || width / 2,
        y: ellipseY || height / 2,
        w: ellipseWidth || min(width, height) * 0.5,
        h: ellipseHeight || min(width, height) * 0.4,
        angle: ellipseAngle || 0,
        text: slice,
        fade: false,
        opacity: 255,
    });
    textIndex = end;
}

function resetAll() { ellipses = []; textIndex = 0; }

function windowResized() {
    const { w, h } = hostSize();
    resizeCanvas(w, h);
    if (video) video.size(w, h);
}

function hostSize() {
    const w = (hostEl && hostEl.clientWidth) || 600;
    const h = (hostEl && hostEl.clientHeight) || 600;
    return { w, h };
}

function clampInt(n, lo, hi) { return Math.max(lo, Math.min(hi, isNaN(n) ? lo : n)); }
function syncSlider(el, val) { if (el) el.value = String(val); }

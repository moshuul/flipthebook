let handpose, video, predictions = [];
let ellipses = [];
let ellipseX, ellipseY, ellipseWidth, ellipseHeight, ellipseAngle;
let textIndex = 0;

let paragraph = `Taking myself to stages illuminated by varying lights and digital effects, I immersed myself in a dynamic landscape of artistic, technological, and entrepreneurial. Believing in design’s power to bridge science, technology, and business, I leveraged user experience principles, behavioral economics, and technological feasibility to create solutions that resonate both artistically and commercially, ensuring creativity translates into tangible value across industries.`;

let textArray;
let waveAmount = 4;
let blurAmount = 0;
let fontSize = 18;
let alphaFill = 220;
let tracking = 1.2;
let yOffset = 220;

const $ = (s) => document.querySelector(s);
window.addEventListener('DOMContentLoaded', () => {
    $('#fontSlider')?.addEventListener('input', e => { fontSize = parseInt(e.target.value, 10); textSize(fontSize); });
    $('#waveSlider')?.addEventListener('input', e => waveAmount = parseInt(e.target.value, 10));
    $('#blurSlider')?.addEventListener('input', e => blurAmount = parseInt(e.target.value, 10));
    $('#saveBtn')?.addEventListener('click', saveCurrentEllipse);
    $('#downloadBtn')?.addEventListener('click', () => saveCanvas('ink-' + Date.now(), 'png'));
    $('#resetBtn')?.addEventListener('click', () => { ellipses = []; textIndex = 0; });

    // 不再使用输入框，直接用默认 paragraph
    textArray = paragraph.split('');
});

let canvasHost;
function setup() {
    canvasHost = document.getElementById('canvasHost');
    const s = Math.min(canvasHost.clientWidth, canvasHost.clientHeight);
    const cnv = createCanvas(s, s);
    cnv.parent(canvasHost);
    pixelDensity(window.devicePixelRatio || 1);

    textFont('Courier New');
    textSize(fontSize);
    textAlign(CENTER, CENTER);

    video = createCapture(VIDEO, () => { });
    video.size(width, height);
    video.hide();

    handpose = ml5.handpose(video, () => console.log('Handpose ready'));
    handpose.on('predict', r => { predictions = r; });

    if (!textArray) textArray = paragraph.split('');
}

function windowResized() {
    if (!canvasHost) return;
    const s = Math.min(canvasHost.clientWidth, canvasHost.clientHeight);
    resizeCanvas(s, s);
    video?.size(width, height);
}

function uprightAngle(theta) { return (Math.cos(theta) < 0) ? theta + Math.PI : theta; }

function draw() {
    clear(); background(255);
    const time = millis() / 2000, time2 = time + 5;

    if (predictions.length > 0) {
        updateControlledEllipse();
        drawControlledEllipse(time, time2);
        drawMirroredEllipse(time, time2);
    }
    drawAllEllipses(time, time2);
}

function updateControlledEllipse() {
    const lm = predictions[0]?.landmarks; if (!lm || !lm.length) return;
    let sumX = 0, sumY = 0; for (let i = 0; i < lm.length; i++) { sumX += lm[i][0]; sumY += lm[i][1]; }
    const cx = sumX / lm.length, cy = sumY / lm.length;
    ellipseX = lerp(ellipseX ?? cx, cx, 0.2);
    ellipseY = lerp(ellipseY ?? (cy + yOffset), cy + yOffset, 0.2);

    let maxX = 0, maxY = 0;
    for (let i = 0; i < lm.length; i++) for (let j = i + 1; j < lm.length; j++) {
        maxX = Math.max(maxX, Math.abs(lm[i][0] - lm[j][0]));
        maxY = Math.max(maxY, Math.abs(lm[i][1] - lm[j][1]));
    }
    ellipseWidth = lerp(ellipseWidth ?? 100, maxX, 0.2);
    ellipseHeight = lerp(ellipseHeight ?? 100, maxY, 0.2);

    if (lm[4] && lm[8]) {
        const dx = lm[4][0] - lm[8][0], dy = lm[4][1] - lm[8][1];
        const angle = Math.atan2(dy, dx);
        ellipseAngle = lerp(ellipseAngle ?? angle, angle, 0.2);
    }
}

function drawControlledEllipse(t1, t2) { drawEllipseWithText(ellipseX, ellipseY, ellipseWidth, ellipseHeight, ellipseAngle, textIndex, false, t1, t2); }
function drawMirroredEllipse(t1, t2) { drawEllipseWithText(width - (ellipseX ?? 0), ellipseY, ellipseWidth, ellipseHeight, Math.PI - (ellipseAngle ?? 0), textIndex, true, t1, t2); }

function drawAllEllipses(t1, t2) {
    for (let e of ellipses) {
        if (e.fade && e.opacity > 0) e.opacity = Math.max(0, e.opacity - 2);
        drawFixedTextEllipse(e.x, e.y, e.w, e.h, e.angle, e.text, false, e.opacity, t1, t2);
        drawFixedTextEllipse(width - e.x, e.y, e.w, e.h, Math.PI - e.angle, e.text, true, e.opacity, t1, t2);
    }
}

function drawEllipseWithText(cx, cy, w, h, angle, startIndex, mirrored, t1, t2) {
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
    push(); translate(cx, cy); rotate(angle); noFill(); noStroke(); ellipse(0, 0, w, h);
    const baseSteps = Math.max(1, Math.floor((Math.PI * (w + h) / 2) / Math.max(8, fontSize)));
    const steps = Math.max(1, Math.floor(baseSteps / tracking));
    const count = Math.min(textArray.length - startIndex, steps);
    const step = TWO_PI / steps;
    for (let i = 0; i < count; i++) {
        const idx = startIndex + i;
        let a = -PI / 2 + i * step;
        const x = (w / 2) * Math.cos(a), y = (h / 2) * Math.sin(a);
        const yOff = noise(x / 100, y / 100, t1) * waveAmount - waveAmount / 2;
        const angleOff = noise(x / 50 + 5, y / 50 + 5, t2) * waveAmount / 30 - waveAmount / 60;
        push();
        translate(x, y + yOff);
        const tangent = a + HALF_PI + angleOff;
        rotate(uprightAngle(tangent));
        fill(0, alphaFill); noStroke();
        drawingContext.shadowColor = 'black';
        drawingContext.shadowBlur = blurAmount;
        text(textArray[idx], 0, 0);
        pop();
    }
    pop();
}

function drawFixedTextEllipse(cx, cy, w, h, angle, fixedText, mirrored, opacity = 255, t1, t2) {
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
    push(); translate(cx, cy); rotate(angle); noFill(); noStroke(); ellipse(0, 0, w, h);
    const baseSteps = Math.max(1, Math.floor((Math.PI * (w + h) / 2) / Math.max(8, fontSize)));
    const steps = Math.max(1, Math.floor(baseSteps / tracking));
    const count = Math.min(fixedText.length, steps);
    const step = TWO_PI / steps;
    for (let i = 0; i < count; i++) {
        let a = -PI / 2 + i * step;
        const x = (w / 2) * Math.cos(a), y = (h / 2) * Math.sin(a);
        const yOff = noise(x / 100, y / 100, t1) * waveAmount - waveAmount / 2;
        const angleOff = noise(x / 50 + 5, y / 50 + 5, t2) * waveAmount / 30 - waveAmount / 60;
        push();
        translate(x, y + yOff);
        const tangent = a + HALF_PI + angleOff;
        rotate(uprightAngle(tangent));
        fill(0, opacity); noStroke();
        drawingContext.shadowColor = 'black';
        drawingContext.shadowBlur = blurAmount;
        text(fixedText[i], 0, 0);
        pop();
    }
    pop();
}

function saveCurrentEllipse() {
    const denom = Math.max(8, fontSize);
    const perim = Math.PI * ((ellipseWidth ?? 0) + (ellipseHeight ?? 0)) / 2;
    const base = Math.max(1, Math.floor(perim / denom));
    const charsPerCircle = Math.max(1, Math.floor(base / tracking));
    const end = Math.min(textIndex + charsPerCircle, textArray.length);
    const slice = textArray.slice(textIndex, end);
    ellipses.push({ x: ellipseX ?? width / 2, y: ellipseY ?? height / 2, w: ellipseWidth ?? 100, h: ellipseHeight ?? 100, angle: ellipseAngle ?? 0, text: slice, fade: false, opacity: 255 });
    textIndex = end;
}

function keyPressed() { if (key === 'a') saveCurrentEllipse(); }

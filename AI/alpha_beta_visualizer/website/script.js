/* ==================================================================
   ALPHA-BETA PRUNING — INTERACTIVE AI VISUALIZER (V2)
   Full engine: tree rendering, algorithms, animation, game, compare
   ================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_R = 20;

/* ===== DEFAULT TREE ===== */
const DEFAULT_TREE = {
    'A': ['B','C','D'], 'B': ['E','F'], 'C': ['G','H'],
    'D': ['I','J'], 'E': ['K','L'], 'F': ['M'],
    'G': ['N','O'], 'H': ['P'], 'I': ['Q'], 'J': ['R','S']
};
const DEFAULT_LEAVES = ['K','L','M','N','O','P','Q','R','S'];

/* ===== GLOBAL STATE ===== */
let currentTree = JSON.parse(JSON.stringify(DEFAULT_TREE));
let currentLeaves = [...DEFAULT_LEAVES];
let algorithm = 'alphabeta'; // 'alphabeta' | 'minimax'
let learningMode = 'beginner'; // 'beginner' | 'advanced'
let steps = [];
let currentStep = -1;
let isPlaying = false;
let playTimer = null;
let animSpeed = 400;
let perfChart = null;

// Game state
let gameTree = null;
let gameLeaves = null;
let gameCurrentNode = null;
let gameIsPlayerTurn = false;
let gamePath = [];
let gameValues = {};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    createLeafInputs('leafInputs', DEFAULT_LEAVES);
    createLeafInputs('compareInputs', DEFAULT_LEAVES, true);
    renderTreeSVG('treeSvg', DEFAULT_TREE, DEFAULT_LEAVES);
    loadPreset('default');
});

/* ===== PARTICLES ===== */
function createParticles() {
    const c = document.getElementById('bgParticles');
    const colors = ['#6366f1','#22d3ee','#a855f7','#34d399','#ec4899'];
    for (let i = 0; i < 35; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const s = 2 + Math.random() * 5;
        Object.assign(p.style, {
            width: s+'px', height: s+'px',
            left: Math.random()*100+'%', top: Math.random()*100+'%',
            background: colors[~~(Math.random()*colors.length)],
            animationDelay: Math.random()*14+'s',
            animationDuration: (8+Math.random()*10)+'s'
        });
        c.appendChild(p);
    }
}

/* ===== LEAF INPUT CREATION ===== */
function createLeafInputs(containerId, leaves, isRow) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    leaves.forEach(n => {
        const g = document.createElement('div');
        g.className = 'leaf-input-group';
        g.innerHTML = `<label for="${containerId}-${n}">${n}</label>
            <input type="number" id="${containerId}-${n}" placeholder="0">`;
        container.appendChild(g);
    });
}

/* ===== TAB SWITCHING ===== */
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === 'tab-' + tab));
}

/* ===== LEARNING MODE ===== */
function setLearningMode(mode) {
    learningMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

/* ===== ALGORITHM TOGGLE ===== */
function setAlgorithm(algo) {
    algorithm = algo;
    document.querySelectorAll('.algo-btn').forEach(b => b.classList.toggle('active', b.dataset.algo === algo));
}

/* ===== TREE POSITION CALCULATOR ===== */
function calcPositions(tree, root, leaves) {
    // Compute subtree leaf counts for layout
    const pos = {};
    const allNodes = new Set([root]);
    Object.keys(tree).forEach(k => { allNodes.add(k); tree[k].forEach(c => allNodes.add(c)); });

    // BFS to get levels
    const levels = {};
    const depth = {};
    const queue = [root];
    depth[root] = 0;
    while (queue.length) {
        const n = queue.shift();
        const d = depth[n];
        if (!levels[d]) levels[d] = [];
        levels[d].push(n);
        if (tree[n]) tree[n].forEach(c => { depth[c] = d + 1; queue.push(c); });
    }

    const maxDepth = Math.max(...Object.values(depth));
    const yGap = 400 / Math.max(maxDepth, 1);

    // Leaf ordering (left to right)
    function getLeafOrder(node) {
        if (!tree[node]) return [node];
        let result = [];
        tree[node].forEach(c => result.push(...getLeafOrder(c)));
        return result;
    }
    const leafOrder = getLeafOrder(root);
    const xGap = 1060 / Math.max(leafOrder.length - 1, 1);

    // Place leaves
    leafOrder.forEach((leaf, i) => {
        pos[leaf] = { x: 20 + i * xGap, y: 50 + maxDepth * yGap };
    });

    // Place internal nodes (center of children)
    function placeNode(node) {
        if (pos[node]) return pos[node];
        if (!tree[node]) return pos[node] || { x: 550, y: 50 + depth[node] * yGap };
        const children = tree[node].map(c => placeNode(c));
        const avgX = children.reduce((s, c) => s + c.x, 0) / children.length;
        pos[node] = { x: avgX, y: 50 + depth[node] * yGap };
        return pos[node];
    }
    placeNode(root);
    return { pos, depth, maxDepth };
}

/* ===== IS_MAX helper ===== */
function isMaxNode(depthMap, node) { return depthMap[node] % 2 === 0; }

/* ===== SVG TREE RENDERING ===== */
function renderTreeSVG(svgId, tree, leaves, values) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';

    const root = Object.keys(tree).find(k => {
        const allChildren = new Set();
        Object.values(tree).forEach(ch => ch.forEach(c => allChildren.add(c)));
        return !allChildren.has(k);
    }) || Object.keys(tree)[0];

    const { pos, depth: depthMap } = calcPositions(tree, root, leaves);

    // Draw edges
    Object.keys(tree).forEach(parent => {
        tree[parent].forEach(child => {
            if (pos[parent] && pos[child]) {
                const p = pos[parent], c = pos[child];
                const midY = (p.y + c.y) / 2;
                const path = document.createElementNS(SVG_NS, 'path');
                path.setAttribute('d', `M${p.x} ${p.y + NODE_R} C${p.x} ${midY},${c.x} ${midY},${c.x} ${c.y - NODE_R}`);
                path.classList.add('edge');
                path.id = `${svgId}-edge-${parent}-${child}`;
                svg.appendChild(path);
            }
        });
    });

    // Draw nodes
    Object.keys(pos).forEach(node => {
        const p = pos[node];
        const g = document.createElementNS(SVG_NS, 'g');
        g.id = `${svgId}-group-${node}`;

        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
        circle.setAttribute('r', NODE_R); circle.classList.add('node-bg');
        circle.id = `${svgId}-bg-${node}`;
        g.appendChild(circle);

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', p.x); label.setAttribute('y', p.y);
        label.classList.add('node-name'); label.textContent = node;
        g.appendChild(label);

        // Value
        const val = document.createElementNS(SVG_NS, 'text');
        val.setAttribute('x', p.x); val.setAttribute('y', p.y + NODE_R + 14);
        val.classList.add('node-val'); val.id = `${svgId}-val-${node}`;
        if (values && leaves.includes(node) && values[node] !== undefined) {
            val.textContent = `= ${values[node]}`; val.classList.add('show');
        }
        g.appendChild(val);

        // Alpha-Beta text
        const ab = document.createElementNS(SVG_NS, 'text');
        ab.setAttribute('x', p.x); ab.setAttribute('y', p.y - NODE_R - 8);
        ab.classList.add('node-ab'); ab.id = `${svgId}-ab-${node}`;
        g.appendChild(ab);

        // Badge
        const badge = document.createElementNS(SVG_NS, 'text');
        badge.setAttribute('x', p.x); badge.setAttribute('y', p.y - NODE_R - 22);
        badge.classList.add('node-badge'); badge.id = `${svgId}-badge-${node}`;
        if (leaves.includes(node)) {
            badge.setAttribute('fill', '#34d399'); badge.textContent = 'LEAF';
        } else if (isMaxNode(depthMap, node)) {
            badge.setAttribute('fill', '#22d3ee'); badge.textContent = 'MAX';
        } else {
            badge.setAttribute('fill', '#a855f7'); badge.textContent = 'MIN';
        }
        g.appendChild(badge);

        svg.appendChild(g);
    });

    return { pos, depthMap };
}

/* ==================================================================
   ALGORITHMS
   ================================================================== */

function runAlphaBetaAlgo(node, tree, values, alpha, beta, isMax, depth, stepsArr) {
    if (!tree[node]) {
        stepsArr.push({ type:'leaf', node, value:values[node], depth });
        return values[node];
    }
    stepsArr.push({ type:'visit', node, alpha, beta, isMax, depth });
    if (isMax) {
        let value = -Infinity;
        for (let i = 0; i < tree[node].length; i++) {
            const child = tree[node][i];
            const val = runAlphaBetaAlgo(child, tree, values, alpha, beta, false, depth+1, stepsArr);
            value = Math.max(value, val); alpha = Math.max(alpha, value);
            stepsArr.push({ type:'update', node, value, alpha, beta, isMax:true, depth });
            if (beta <= alpha) {
                stepsArr.push({ type:'prune', node, depth, prunedChildren: tree[node].slice(i+1) });
                break;
            }
        }
        return value;
    } else {
        let value = Infinity;
        for (let i = 0; i < tree[node].length; i++) {
            const child = tree[node][i];
            const val = runAlphaBetaAlgo(child, tree, values, alpha, beta, true, depth+1, stepsArr);
            value = Math.min(value, val); beta = Math.min(beta, value);
            stepsArr.push({ type:'update', node, value, alpha, beta, isMax:false, depth });
            if (beta <= alpha) {
                stepsArr.push({ type:'prune', node, depth, prunedChildren: tree[node].slice(i+1) });
                break;
            }
        }
        return value;
    }
}

function runMinimaxAlgo(node, tree, values, isMax, depth, stepsArr) {
    if (!tree[node]) {
        stepsArr.push({ type:'leaf', node, value:values[node], depth });
        return values[node];
    }
    stepsArr.push({ type:'visit', node, alpha:null, beta:null, isMax, depth });
    if (isMax) {
        let value = -Infinity;
        for (const child of tree[node]) {
            const val = runMinimaxAlgo(child, tree, values, false, depth+1, stepsArr);
            value = Math.max(value, val);
            stepsArr.push({ type:'update', node, value, alpha:null, beta:null, isMax:true, depth });
        }
        return value;
    } else {
        let value = Infinity;
        for (const child of tree[node]) {
            const val = runMinimaxAlgo(child, tree, values, true, depth+1, stepsArr);
            value = Math.min(value, val);
            stepsArr.push({ type:'update', node, value, alpha:null, beta:null, isMax:false, depth });
        }
        return value;
    }
}

/* ==================================================================
   VISUALIZER TAB
   ================================================================== */

function getLeafValues(prefix, leaves) {
    const vals = {};
    let ok = true;
    leaves.forEach(n => {
        const input = document.getElementById(`${prefix}-${n}`);
        if (!input) return;
        const v = parseInt(input.value);
        if (isNaN(v)) {
            input.style.borderColor = '#ef4444'; ok = false;
        } else {
            input.style.borderColor = ''; vals[n] = v;
        }
    });
    return ok ? vals : null;
}

function randomizeValues() {
    DEFAULT_LEAVES.forEach(n => {
        const inp = document.getElementById(`leafInputs-${n}`);
        if (inp) inp.value = ~~(Math.random() * 20) - 5;
    });
}

function runAlgorithm() {
    const values = getLeafValues('leafInputs', DEFAULT_LEAVES);
    if (!values) return;

    stopPlay();
    resetVisualization('treeSvg', DEFAULT_TREE, DEFAULT_LEAVES);
    steps = [];
    currentStep = -1;

    const root = 'A';
    let result;
    if (algorithm === 'alphabeta') {
        result = runAlphaBetaAlgo(root, DEFAULT_TREE, values, -Infinity, Infinity, true, 0, steps);
    } else {
        result = runMinimaxAlgo(root, DEFAULT_TREE, values, true, 0, steps);
    }
    steps.push({ type:'result', value: result });

    // Stats
    const visited = steps.filter(s => s.type === 'visit' || s.type === 'leaf').length;
    const pruned = steps.filter(s => s.type === 'prune').reduce((sum, s) => sum + (s.prunedChildren ? s.prunedChildren.length : 0), 0);
    const totalLeaves = DEFAULT_LEAVES.length;
    document.getElementById('statVisited').textContent = visited;
    document.getElementById('statPruned').textContent = pruned;
    document.getElementById('statEfficiency').textContent = pruned > 0 ? Math.round((pruned / (visited + pruned)) * 100) + '%' : '0%';

    // Show controls
    document.getElementById('playbackControls').classList.add('visible');
    updateStepInfo();

    // Clear logs
    document.getElementById('logBox').innerHTML = '';
    document.getElementById('explanationBox').innerHTML = '';
    document.getElementById('thinkingContent').innerHTML = '';
    document.getElementById('thinkingStatus').textContent = 'Processing...';
    document.getElementById('thinkingIndicator').classList.remove('hidden');

    togglePlay();
}

function resetAll() {
    stopPlay();
    steps = [];
    currentStep = -1;
    resetVisualization('treeSvg', DEFAULT_TREE, DEFAULT_LEAVES);
    document.getElementById('playbackControls').classList.remove('visible');
    document.getElementById('resultBanner').classList.remove('show');
    document.getElementById('logBox').innerHTML = '<p class="placeholder-text">Run the algorithm to see execution log...</p>';
    document.getElementById('explanationBox').innerHTML = '<p class="placeholder-text">Select a step to see detailed explanation...</p>';
    document.getElementById('thinkingContent').innerHTML = '<p class="thinking-placeholder">Run the algorithm to see AI\'s decision-making process...</p>';
    document.getElementById('thinkingStatus').textContent = 'Waiting to start...';
    document.getElementById('thinkingIndicator').classList.add('hidden');
    document.getElementById('statVisited').textContent = '—';
    document.getElementById('statPruned').textContent = '—';
    document.getElementById('statEfficiency').textContent = '—';
    DEFAULT_LEAVES.forEach(n => {
        const inp = document.getElementById(`leafInputs-${n}`);
        if (inp) { inp.value = ''; inp.style.borderColor = ''; }
    });
}

function resetVisualization(svgId, tree, leaves) {
    renderTreeSVG(svgId, tree, leaves);
    const banner = document.getElementById('resultBanner');
    if (banner) banner.classList.remove('show');
}

/* ===== PLAYBACK ===== */
function togglePlay() {
    if (isPlaying) { stopPlay(); } else {
        isPlaying = true;
        document.getElementById('btnPlayPause').textContent = '⏸';
        playTimer = setInterval(() => {
            if (currentStep < steps.length - 1) stepForward();
            else stopPlay();
        }, animSpeed);
    }
}
function stopPlay() {
    isPlaying = false;
    const btn = document.getElementById('btnPlayPause');
    if (btn) btn.textContent = '▶';
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
}
function stepForward() {
    if (currentStep >= steps.length - 1) return;
    currentStep++;
    applyStep(currentStep, 'treeSvg');
    updateStepInfo();
}
function stepBack() {
    if (currentStep < 0) return;
    const target = currentStep - 1;
    resetVisualization('treeSvg', DEFAULT_TREE, DEFAULT_LEAVES);
    document.getElementById('logBox').innerHTML = '';
    document.getElementById('thinkingContent').innerHTML = '';
    currentStep = -1;
    for (let i = 0; i <= target; i++) {
        currentStep = i;
        applyStep(i, 'treeSvg', true);
    }
    updateStepInfo();
}
function updateSpeed(v) {
    document.getElementById('speedSlider').title = v + 'x';
    animSpeed = Math.max(80, 800 - (v - 1) * 80);
    if (isPlaying) { stopPlay(); togglePlay(); }
}
function updateStepInfo() {
    const el = document.getElementById('stepInfo');
    if (el) el.textContent = `Step ${Math.max(0, currentStep + 1)} / ${steps.length}`;
}

/* ===== APPLY STEP ===== */
function applyStep(idx, svgId, silent) {
    const step = steps[idx];
    if (!step) return;

    // Clear active states
    document.querySelectorAll(`#${svgId} .node-bg.current`).forEach(e => e.classList.remove('current'));
    document.querySelectorAll(`#${svgId} .edge.active`).forEach(e => { e.classList.remove('active'); e.classList.add('visited'); });

    switch (step.type) {
        case 'visit': _visit(step, svgId); break;
        case 'leaf': _leaf(step, svgId); break;
        case 'update': _update(step, svgId); break;
        case 'prune': _prune(step, svgId); break;
        case 'result': _result(step, svgId); break;
    }
    if (!silent) {
        addLog(step);
        addThinking(step);
        addExplanation(step);
    } else {
        addLog(step, true);
    }
}

function _visit(step, svgId) {
    const bg = document.getElementById(`${svgId}-bg-${step.node}`);
    if (bg) bg.classList.add('current');
    const badge = document.getElementById(`${svgId}-badge-${step.node}`);
    if (badge) badge.classList.add('show');
    if (step.alpha !== null) {
        const ab = document.getElementById(`${svgId}-ab-${step.node}`);
        if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
    }
    highlightEdge(svgId, step.node);
}

function _leaf(step, svgId) {
    const bg = document.getElementById(`${svgId}-bg-${step.node}`);
    if (bg) { bg.classList.add('leaf-done', 'current'); }
    const badge = document.getElementById(`${svgId}-badge-${step.node}`);
    if (badge) badge.classList.add('show');
    const val = document.getElementById(`${svgId}-val-${step.node}`);
    if (val) { val.textContent = `= ${step.value}`; val.classList.add('show'); }
    highlightEdge(svgId, step.node);
}

function _update(step, svgId) {
    const bg = document.getElementById(`${svgId}-bg-${step.node}`);
    if (bg) { bg.classList.remove('current'); bg.classList.add(step.isMax ? 'max-done' : 'min-done'); }
    const val = document.getElementById(`${svgId}-val-${step.node}`);
    if (val) { val.textContent = `val=${step.value}`; val.classList.add('show'); }
    if (step.alpha !== null) {
        const ab = document.getElementById(`${svgId}-ab-${step.node}`);
        if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
    }
}

function _prune(step, svgId) {
    if (!step.prunedChildren) return;
    step.prunedChildren.forEach(child => {
        markPruned(svgId, step.node, child, currentTree || DEFAULT_TREE);
    });
}

function markPruned(svgId, parent, node, tree) {
    const bg = document.getElementById(`${svgId}-bg-${node}`);
    if (bg) bg.classList.add('pruned');
    const edge = document.getElementById(`${svgId}-edge-${parent}-${node}`);
    if (edge) edge.classList.add('pruned');

    // Add X marker
    const svg = document.getElementById(svgId);
    const { pos } = calcPositions(tree, 'A', currentLeaves || DEFAULT_LEAVES);
    if (pos[parent] && pos[node]) {
        const mx = (pos[parent].x + pos[node].x) / 2;
        const my = (pos[parent].y + pos[node].y) / 2;
        [[mx-7,my-7,mx+7,my+7],[mx+7,my-7,mx-7,my+7]].forEach(([x1,y1,x2,y2]) => {
            const l = document.createElementNS(SVG_NS, 'line');
            l.setAttribute('x1',x1); l.setAttribute('y1',y1);
            l.setAttribute('x2',x2); l.setAttribute('y2',y2);
            l.classList.add('prune-marker','show');
            svg.appendChild(l);
        });
    }
    // Recurse into subtree
    if (tree[node]) tree[node].forEach(c => markPruned(svgId, node, c, tree));
}

function _result(step, svgId) {
    const bg = document.getElementById(`${svgId}-bg-A`);
    if (bg) { bg.classList.remove('current'); bg.classList.add('max-done'); }
    const val = document.getElementById(`${svgId}-val-A`);
    if (val) { val.textContent = `= ${step.value}`; val.classList.add('show'); }
    const rv = document.getElementById('resultValue');
    if (rv) rv.textContent = step.value;
    const banner = document.getElementById('resultBanner');
    if (banner) banner.classList.add('show');
    document.getElementById('thinkingStatus').textContent = 'Complete!';
    document.getElementById('thinkingIndicator').classList.add('hidden');
}

function highlightEdge(svgId, node) {
    // Find parent
    const tree = currentTree || DEFAULT_TREE;
    for (const par of Object.keys(tree)) {
        if (tree[par] && tree[par].includes(node)) {
            const edge = document.getElementById(`${svgId}-edge-${par}-${node}`);
            if (edge) edge.classList.add('active');
            break;
        }
    }
}

/* ===== LOG ===== */
function addLog(step, instant) {
    const box = document.getElementById('logBox');
    const ph = box.querySelector('.placeholder-text');
    if (ph) ph.remove();
    const d = document.createElement('div');
    d.className = 'log-entry';
    if (instant) d.style.animation = 'none';
    const indent = step.depth ? `<span class="log-indent">${'│ '.repeat(step.depth)}</span>` : '';
    switch (step.type) {
        case 'visit': d.classList.add('visit'); d.innerHTML = `${indent}▸ Visit <b>${step.node}</b>${step.alpha!==null?` | α=${fmt(step.alpha)}, β=${fmt(step.beta)}`:''}`; break;
        case 'leaf': d.classList.add('leaf'); d.innerHTML = `${indent}🍃 Leaf <b>${step.node}</b> = ${step.value}`; break;
        case 'update': d.classList.add(step.isMax?'update-max':'update-min'); d.innerHTML = `${indent}↻ ${step.node} (${step.isMax?'MAX':'MIN'}): val=${step.value}${step.alpha!==null?`, α=${fmt(step.alpha)}, β=${fmt(step.beta)}`:''}`; break;
        case 'prune': d.classList.add('prune'); d.innerHTML = `${indent}✂️ PRUNED children of <b>${step.node}</b>`; break;
        case 'result': d.classList.add('result'); d.innerHTML = `✅ Result: <b>${step.value}</b>`; break;
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

/* ===== AI THINKING ===== */
function addThinking(step) {
    const box = document.getElementById('thinkingContent');
    const ph = box.querySelector('.thinking-placeholder');
    if (ph) ph.remove();
    const d = document.createElement('div');
    d.className = 'think-line';
    switch (step.type) {
        case 'visit':
            d.classList.add('explore');
            d.textContent = `🔍 Exploring node ${step.node} (${step.isMax?'Maximizing':'Minimizing'})...`;
            break;
        case 'leaf':
            d.classList.add('evaluate');
            d.textContent = `📊 Evaluated leaf ${step.node} → utility = ${step.value}`;
            break;
        case 'update':
            d.classList.add('evaluate');
            d.textContent = `⚡ ${step.node} updated: best value = ${step.value}`;
            break;
        case 'prune':
            d.classList.add('prune-think');
            d.textContent = `✂️ Pruning! No need to explore remaining children of ${step.node} (β ≤ α)`;
            break;
        case 'result':
            d.classList.add('decide');
            d.textContent = `🏆 Decision made: optimal value = ${step.value}`;
            break;
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

/* ===== EXPLANATION ===== */
function addExplanation(step) {
    const box = document.getElementById('explanationBox');
    const ph = box.querySelector('.placeholder-text');
    if (ph) ph.remove();
    box.innerHTML = ''; // Show only current step explanation

    const d = document.createElement('div');
    d.className = 'explain-text';

    if (learningMode === 'beginner') {
        switch (step.type) {
            case 'visit':
                d.innerHTML = `We're now looking at node <strong>${step.node}</strong>. ${step.isMax ? 'This is a <strong>MAX</strong> node — it wants the <strong>highest</strong> value.' : 'This is a <strong>MIN</strong> node — it wants the <strong>lowest</strong> value.'}`;
                break;
            case 'leaf':
                d.innerHTML = `Node <strong>${step.node}</strong> is a leaf with value <strong>${step.value}</strong>. This is a final score — no more moves to explore here.`;
                break;
            case 'update':
                d.innerHTML = `Node <strong>${step.node}</strong> found a ${step.isMax ? 'higher' : 'lower'} value: <strong>${step.value}</strong>. ${step.isMax ? 'As a MAX node, it keeps the best (highest) option.' : 'As a MIN node, it keeps the best (lowest) option.'}`;
                break;
            case 'prune':
                d.innerHTML = `✂️ <strong>Pruning!</strong> We can skip the remaining children of <strong>${step.node}</strong> because we already know they can't lead to a better outcome. This saves computation!`;
                break;
            case 'result':
                d.innerHTML = `🏆 <strong>Done!</strong> The optimal value at the root is <strong>${step.value}</strong>. This is the best outcome the maximizing player can guarantee.`;
                break;
        }
    } else {
        switch (step.type) {
            case 'visit':
                d.innerHTML = `Visiting <strong>${step.node}</strong> (${step.isMax?'MAX':'MIN'}, depth ${step.depth})${step.alpha!==null?`. α=${fmt(step.alpha)}, β=${fmt(step.beta)}. The search window is [${fmt(step.alpha)}, ${fmt(step.beta)}].`:''}`;
                break;
            case 'leaf':
                d.innerHTML = `Terminal node <strong>${step.node}</strong> returns utility <strong>${step.value}</strong>. This value propagates up to the parent node.`;
                break;
            case 'update':
                d.innerHTML = `<strong>${step.node}</strong> (${step.isMax?'MAX':'MIN'}): value ← ${step.isMax?'max':'min'}(value, child) = <strong>${step.value}</strong>.${step.alpha!==null?` Updated: α=${fmt(step.alpha)}, β=${fmt(step.beta)}.`:''}${step.alpha!==null && step.beta <= step.alpha ? ' <strong>⚠️ β ≤ α condition met!</strong>':''}`;
                break;
            case 'prune':
                d.innerHTML = `<strong>Alpha-Beta Cutoff</strong> at <strong>${step.node}</strong>: β ≤ α, so remaining children [${step.prunedChildren?.join(', ')}] are pruned. These subtrees cannot affect the final decision.`;
                break;
            case 'result':
                d.innerHTML = `Algorithm complete. Minimax value at root = <strong>${step.value}</strong>. This is the Nash equilibrium value assuming optimal play from both sides.`;
                break;
        }
    }
    box.appendChild(d);
}

/* ==================================================================
   COMPARE TAB
   ================================================================== */

function randomizeCompareValues() {
    DEFAULT_LEAVES.forEach(n => {
        const inp = document.getElementById(`compareInputs-${n}`);
        if (inp) inp.value = ~~(Math.random() * 20) - 5;
    });
}

function runComparison() {
    const values = getLeafValues('compareInputs', DEFAULT_LEAVES);
    if (!values) return;

    // Run Minimax
    const mmSteps = [];
    const mmResult = runMinimaxAlgo('A', DEFAULT_TREE, values, true, 0, mmSteps);
    const mmVisited = mmSteps.filter(s => s.type === 'visit' || s.type === 'leaf').length;

    // Run Alpha-Beta
    const abSteps = [];
    const abResult = runAlphaBetaAlgo('A', DEFAULT_TREE, values, -Infinity, Infinity, true, 0, abSteps);
    const abVisited = abSteps.filter(s => s.type === 'visit' || s.type === 'leaf').length;
    const abPruned = abSteps.filter(s => s.type === 'prune').reduce((sum, s) => sum + (s.prunedChildren ? s.prunedChildren.length : 0), 0);

    // Update stats
    document.getElementById('mmNodes').textContent = mmVisited;
    document.getElementById('mmResult').textContent = mmResult;
    document.getElementById('abNodes').textContent = abVisited;
    document.getElementById('abPruned').textContent = abPruned;
    document.getElementById('abResult').textContent = abResult;

    // Render trees with results
    renderCompareTree('minimaxSvg', mmSteps, values);
    renderCompareTree('abSvg', abSteps, values);

    // Render chart
    renderPerfChart(mmVisited, abVisited, abPruned);
}

function renderCompareTree(svgId, stepsArr, values) {
    renderTreeSVG(svgId, DEFAULT_TREE, DEFAULT_LEAVES, values);
    // Apply all steps instantly
    stepsArr.forEach(step => {
        if (!step) return;
        document.querySelectorAll(`#${svgId} .node-bg.current`).forEach(e => e.classList.remove('current'));
        switch (step.type) {
            case 'visit': {
                const bg = document.getElementById(`${svgId}-bg-${step.node}`);
                if (bg) bg.classList.add(step.isMax ? 'max-done' : 'min-done');
                const badge = document.getElementById(`${svgId}-badge-${step.node}`);
                if (badge) badge.classList.add('show');
                if (step.alpha !== null) {
                    const ab = document.getElementById(`${svgId}-ab-${step.node}`);
                    if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
                }
                break;
            }
            case 'leaf': {
                const bg = document.getElementById(`${svgId}-bg-${step.node}`);
                if (bg) bg.classList.add('leaf-done');
                const badge = document.getElementById(`${svgId}-badge-${step.node}`);
                if (badge) badge.classList.add('show');
                const edge2 = findParentEdge(svgId, step.node, DEFAULT_TREE);
                if (edge2) edge2.classList.add('visited');
                break;
            }
            case 'update': {
                const val = document.getElementById(`${svgId}-val-${step.node}`);
                if (val) { val.textContent = `val=${step.value}`; val.classList.add('show'); }
                if (step.alpha !== null) {
                    const ab = document.getElementById(`${svgId}-ab-${step.node}`);
                    if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
                }
                const edge3 = findParentEdge(svgId, step.node, DEFAULT_TREE);
                if (edge3) edge3.classList.add('visited');
                break;
            }
            case 'prune': {
                if (step.prunedChildren) {
                    step.prunedChildren.forEach(c => markPrunedCompare(svgId, step.node, c, DEFAULT_TREE));
                }
                break;
            }
        }
    });
}

function markPrunedCompare(svgId, parent, node, tree) {
    const bg = document.getElementById(`${svgId}-bg-${node}`);
    if (bg) bg.classList.add('pruned');
    const edge = document.getElementById(`${svgId}-edge-${parent}-${node}`);
    if (edge) edge.classList.add('pruned');
    if (tree[node]) tree[node].forEach(c => markPrunedCompare(svgId, node, c, tree));
}

function findParentEdge(svgId, node, tree) {
    for (const p of Object.keys(tree)) {
        if (tree[p] && tree[p].includes(node)) {
            return document.getElementById(`${svgId}-edge-${p}-${node}`);
        }
    }
    return null;
}

function renderPerfChart(mmVisited, abVisited, abPruned) {
    const ctx = document.getElementById('perfChart');
    if (!ctx) return;
    if (perfChart) perfChart.destroy();

    perfChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Nodes Visited', 'Nodes Pruned', 'Total Evaluations'],
            datasets: [
                {
                    label: 'Minimax',
                    data: [mmVisited, 0, mmVisited],
                    backgroundColor: ['rgba(249,115,22,.7)','rgba(249,115,22,.3)','rgba(249,115,22,.5)'],
                    borderColor: ['#f97316','#f97316','#f97316'],
                    borderWidth: 2, borderRadius: 6
                },
                {
                    label: 'Alpha-Beta',
                    data: [abVisited, abPruned, abVisited],
                    backgroundColor: ['rgba(34,211,238,.7)','rgba(239,68,68,.7)','rgba(34,211,238,.5)'],
                    borderColor: ['#22d3ee','#ef4444','#22d3ee'],
                    borderWidth: 2, borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

/* ==================================================================
   CUSTOM TREE TAB
   ================================================================== */

const PRESETS = {
    binary2: {
        tree: { 'A':['B','C'], 'B':['D','E'], 'C':['F','G'] },
        leaves: ['D','E','F','G']
    },
    binary3: {
        tree: { 'A':['B','C'], 'B':['D','E'], 'C':['F','G'], 'D':['H','I'], 'E':['J','K'], 'F':['L','M'], 'G':['N','O'] },
        leaves: ['H','I','J','K','L','M','N','O']
    },
    ternary2: {
        tree: { 'A':['B','C','D'], 'B':['E','F','G'], 'C':['H','I','J'], 'D':['K','L','M'] },
        leaves: ['E','F','G','H','I','J','K','L','M']
    },
    default: {
        tree: JSON.parse(JSON.stringify(DEFAULT_TREE)),
        leaves: [...DEFAULT_LEAVES]
    }
};

let customTree = null;
let customLeaves = null;

function loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    customTree = JSON.parse(JSON.stringify(preset.tree));
    customLeaves = [...preset.leaves];
    createLeafInputs('customLeafInputs', customLeaves);
    renderTreeSVG('customSvg', customTree, customLeaves);
    document.getElementById('customResult').innerHTML = '';
    document.getElementById('customResult').className = 'custom-result';
}

function randomizeCustomValues() {
    if (!customLeaves) return;
    customLeaves.forEach(n => {
        const inp = document.getElementById(`customLeafInputs-${n}`);
        if (inp) inp.value = ~~(Math.random() * 20) - 5;
    });
}

function runCustomAlgorithm() {
    if (!customTree || !customLeaves) return;
    const values = getLeafValues('customLeafInputs', customLeaves);
    if (!values) return;

    renderTreeSVG('customSvg', customTree, customLeaves, values);

    const root = Object.keys(customTree).find(k => {
        const allCh = new Set();
        Object.values(customTree).forEach(ch => ch.forEach(c => allCh.add(c)));
        return !allCh.has(k);
    });

    const stepsArr = [];
    const result = runAlphaBetaAlgo(root, customTree, values, -Infinity, Infinity, true, 0, stepsArr);

    // Apply all steps
    stepsArr.forEach(step => {
        document.querySelectorAll(`#customSvg .node-bg.current`).forEach(e => e.classList.remove('current'));
        switch (step.type) {
            case 'visit': {
                const bg = document.getElementById(`customSvg-bg-${step.node}`);
                if (bg) bg.classList.add(step.isMax ? 'max-done' : 'min-done');
                const badge = document.getElementById(`customSvg-badge-${step.node}`);
                if (badge) badge.classList.add('show');
                const ab = document.getElementById(`customSvg-ab-${step.node}`);
                if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
                break;
            }
            case 'leaf': {
                const bg = document.getElementById(`customSvg-bg-${step.node}`);
                if (bg) bg.classList.add('leaf-done');
                const badge = document.getElementById(`customSvg-badge-${step.node}`);
                if (badge) badge.classList.add('show');
                break;
            }
            case 'update': {
                const val = document.getElementById(`customSvg-val-${step.node}`);
                if (val) { val.textContent = `val=${step.value}`; val.classList.add('show'); }
                const ab = document.getElementById(`customSvg-ab-${step.node}`);
                if (ab) { ab.textContent = `α=${fmt(step.alpha)} β=${fmt(step.beta)}`; ab.classList.add('show'); }
                break;
            }
            case 'prune': {
                if (step.prunedChildren) step.prunedChildren.forEach(c => markPrunedCompare('customSvg', step.node, c, customTree));
                break;
            }
        }
    });

    const visited = stepsArr.filter(s => s.type === 'visit' || s.type === 'leaf').length;
    const pruned = stepsArr.filter(s => s.type === 'prune').reduce((sum,s) => sum + (s.prunedChildren ? s.prunedChildren.length : 0), 0);

    document.getElementById('customResult').className = 'custom-result success';
    document.getElementById('customResult').innerHTML = `✅ Result: <strong>${result}</strong> | Visited: ${visited} | Pruned: ${pruned}`;
}

function resetCustom() {
    if (customTree && customLeaves) {
        renderTreeSVG('customSvg', customTree, customLeaves);
        customLeaves.forEach(n => {
            const inp = document.getElementById(`customLeafInputs-${n}`);
            if (inp) { inp.value = ''; inp.style.borderColor = ''; }
        });
    }
    document.getElementById('customResult').innerHTML = '';
    document.getElementById('customResult').className = 'custom-result';
}

/* ==================================================================
   GAME TAB — AI vs HUMAN
   ================================================================== */

function generateGameTree() {
    // Simple binary tree depth 3
    const tree = {
        'R': ['A1','A2'],
        'A1': ['B1','B2'],
        'A2': ['B3','B4'],
        'B1': ['C1','C2'],
        'B2': ['C3','C4'],
        'B3': ['C5','C6'],
        'B4': ['C7','C8']
    };
    const leaves = ['C1','C2','C3','C4','C5','C6','C7','C8'];
    const values = {};
    leaves.forEach(l => { values[l] = ~~(Math.random() * 20) - 5; });
    return { tree, leaves, values };
}

function startNewGame() {
    const g = generateGameTree();
    gameTree = g.tree;
    gameLeaves = g.leaves;
    gameValues = g.values;
    gameCurrentNode = 'R';
    gamePath = ['R'];
    gameIsPlayerTurn = false; // Root is MAX (AI)

    renderTreeSVG('gameSvg', gameTree, gameLeaves, gameValues);
    document.getElementById('gameStatus').textContent = '🤖 AI is thinking...';
    document.getElementById('gameYourScore').textContent = '—';
    document.getElementById('gameAiScore').textContent = '—';
    document.getElementById('gameMovePrompt').style.display = 'none';
    document.getElementById('gameThinking').style.display = 'none';
    document.getElementById('btnShowAiThought').style.display = 'none';

    // AI makes first move (root is MAX = AI)
    setTimeout(() => aiMakeMove(), 800);
}

function aiMakeMove() {
    if (!gameTree[gameCurrentNode]) return finishGame();

    // Run alpha-beta to find best child
    const children = gameTree[gameCurrentNode];
    let bestChild = children[0];
    let bestVal = -Infinity;
    const thinkLines = [];

    thinkLines.push(`🔍 Analyzing ${children.length} possible moves from ${gameCurrentNode}...`);

    children.forEach(child => {
        const stepsArr = [];
        const val = evalGameNode(child, gameTree, gameValues, -Infinity, Infinity, false, 1, stepsArr);
        thinkLines.push(`📊 Move → ${child}: estimated value = ${val}`);
        if (val > bestVal) { bestVal = val; bestChild = child; }
    });

    thinkLines.push(`⚡ Best move: ${bestChild} (value = ${bestVal})`);

    // Show thinking
    const thinkContent = document.getElementById('gameThinkingContent');
    thinkContent.innerHTML = thinkLines.map(l => `<div class="think-line explore">${l}</div>`).join('');
    document.getElementById('btnShowAiThought').style.display = 'inline-flex';

    // Highlight AI's choice
    const bg = document.getElementById(`gameSvg-bg-${gameCurrentNode}`);
    if (bg) bg.classList.add('max-done');
    const edge = document.getElementById(`gameSvg-edge-${gameCurrentNode}-${bestChild}`);
    if (edge) edge.classList.add('visited');

    gameCurrentNode = bestChild;
    gamePath.push(bestChild);

    const selectedBg = document.getElementById(`gameSvg-bg-${bestChild}`);
    if (selectedBg) selectedBg.classList.add('game-selected');

    if (!gameTree[gameCurrentNode]) {
        finishGame();
    } else {
        // Player's turn
        gameIsPlayerTurn = true;
        document.getElementById('gameStatus').textContent = `👤 Your turn! Choose a move from ${gameCurrentNode}'s children.`;
        document.getElementById('gameMovePrompt').style.display = 'block';
        enablePlayerMoves();
    }
}

function enablePlayerMoves() {
    const children = gameTree[gameCurrentNode];
    if (!children) return;
    children.forEach(child => {
        const bg = document.getElementById(`gameSvg-bg-${child}`);
        if (bg) {
            bg.classList.add('game-clickable');
            bg.style.cursor = 'pointer';
            bg.onclick = () => playerSelectMove(child);
        }
    });
}

function disablePlayerMoves() {
    document.querySelectorAll('#gameSvg .game-clickable').forEach(el => {
        el.classList.remove('game-clickable');
        el.style.cursor = 'default';
        el.onclick = null;
    });
    document.getElementById('gameMovePrompt').style.display = 'none';
}

function playerSelectMove(child) {
    disablePlayerMoves();
    gameIsPlayerTurn = false;

    const bg = document.getElementById(`gameSvg-bg-${gameCurrentNode}`);
    if (bg) bg.classList.add('min-done');
    const edge = document.getElementById(`gameSvg-edge-${gameCurrentNode}-${child}`);
    if (edge) edge.classList.add('visited');

    gameCurrentNode = child;
    gamePath.push(child);

    const selectedBg = document.getElementById(`gameSvg-bg-${child}`);
    if (selectedBg) selectedBg.classList.add('game-selected');

    if (!gameTree[gameCurrentNode]) {
        finishGame();
    } else {
        document.getElementById('gameStatus').textContent = '🤖 AI is thinking...';
        setTimeout(() => aiMakeMove(), 600);
    }
}

function evalGameNode(node, tree, values, alpha, beta, isMax, depth, stepsArr) {
    if (!tree[node]) return values[node];
    if (isMax) {
        let value = -Infinity;
        for (const child of tree[node]) {
            value = Math.max(value, evalGameNode(child, tree, values, alpha, beta, false, depth+1, stepsArr));
            alpha = Math.max(alpha, value);
            if (beta <= alpha) break;
        }
        return value;
    } else {
        let value = Infinity;
        for (const child of tree[node]) {
            value = Math.min(value, evalGameNode(child, tree, values, alpha, beta, true, depth+1, stepsArr));
            beta = Math.min(beta, value);
            if (beta <= alpha) break;
        }
        return value;
    }
}

function finishGame() {
    const finalValue = gameValues[gameCurrentNode] !== undefined ? gameValues[gameCurrentNode] : 0;
    const bg = document.getElementById(`gameSvg-bg-${gameCurrentNode}`);
    if (bg) bg.classList.add('leaf-done');
    const val = document.getElementById(`gameSvg-val-${gameCurrentNode}`);
    if (val) { val.textContent = `= ${finalValue}`; val.classList.add('show'); }

    // The AI is MAX, player is MIN
    // AI wins if value is high, player wins if value is low
    document.getElementById('gameAiScore').textContent = finalValue;
    document.getElementById('gameYourScore').textContent = -finalValue;

    let msg;
    if (finalValue > 0) msg = `🤖 AI wins! Final value: ${finalValue}. The AI maximized its score.`;
    else if (finalValue < 0) msg = `🎉 You win! Final value: ${finalValue}. You successfully minimized!`;
    else msg = `🤝 It's a tie! Final value: 0.`;

    document.getElementById('gameStatus').textContent = msg;
    document.getElementById('gameMovePrompt').style.display = 'none';
}

function toggleGameThinking() {
    const panel = document.getElementById('gameThinking');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

/* ===== UTILITY ===== */
function fmt(n) {
    if (n === Infinity) return '∞';
    if (n === -Infinity) return '-∞';
    return n;
}

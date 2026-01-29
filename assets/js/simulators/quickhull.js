class QuickHullSimulator extends SimulatorBase {
    constructor(canvasId) {
        super(canvasId);
    }

    generatePoints(n = 20) {
        this.points = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 50;
        for (let i = 0; i < n; i++) {
            this.points.push(new Point(randomInt(margin, w - margin), randomInt(margin, h - margin)));
        }
        this.computeSteps();
        this.setSteps(this.steps);
    }

    computeSteps() {
        const steps = [];
        const P = this.points;
        if (P.length < 3) { this.steps = steps; return; }

        // Find Extremes
        let minIdx = 0, maxIdx = 0;
        P.forEach((p, i) => {
            if (p.x < P[minIdx].x) minIdx = i;
            if (p.x > P[maxIdx].x) maxIdx = i;
        });

        const minP = P[minIdx];
        const maxP = P[maxIdx];

        steps.push({
            type: 'INIT',
            msg: `Βήμα 1: Εύρεση ακραίων σημείων P${minIdx} (αριστερά) και P${maxIdx} (δεξιά).`,
            extremes: [minP, maxP],
            minIdx, maxIdx,
            phase: 'INIT'
        });

        // Partition into upper and lower sets
        const s1 = [], s2 = [];
        P.forEach((p, i) => {
            if (i === minIdx || i === maxIdx) return;
            const d = ccw(minP, maxP, p);
            // With fixed ccw (standard intuition): det > 0 is Visual Left (Upper Set)
            if (d > 0) s1.push({ pt: p, idx: i });
            else if (d < 0) s2.push({ pt: p, idx: i });
        });

        steps.push({
            type: 'PARTITION',
            msg: `Διαχωρισμός: ${s1.length} σημεία πάνω (μπλε), ${s2.length} σημεία κάτω (πορτοκαλί).`,
            extremes: [minP, maxP],
            upperSet: s1.map(x => x.pt),
            lowerSet: s2.map(x => x.pt),
            phase: 'PARTITION'
        });

        // Recursive processing using a queue
        const hullEdges = []; // Store final hull edges for visualization
        const queue = [
            { p1: minP, p2: maxP, points: s1, side: 'Upper', p1Idx: minIdx, p2Idx: maxIdx },
            { p1: maxP, p2: minP, points: s2, side: 'Lower', p1Idx: maxIdx, p2Idx: minIdx }
        ];

        while (queue.length > 0) {
            const task = queue.shift();
            const { p1, p2, points, side, p1Idx, p2Idx } = task;

            if (points.length === 0) {
                hullEdges.push([p1, p2]);
                steps.push({
                    type: 'BASE',
                    msg: `${side}: Κανένα σημείο εξωτερικά. Η ακμή P${p1Idx}→P${p2Idx} είναι τελική.`,
                    edge: [p1, p2],
                    hullEdges: [...hullEdges],
                    phase: 'BASE'
                });
                continue;
            }

            // Find max distance point
            let maxDist = -1;
            let maxPt = null;
            let maxPtIdx = -1;

            points.forEach(item => {
                const d = Math.abs(ccw(p1, p2, item.pt));
                if (d > maxDist) {
                    maxDist = d;
                    maxPt = item.pt;
                    maxPtIdx = item.idx;
                }
            });

            steps.push({
                type: 'FIND_MAX',
                msg: `${side}: Το πιο μακρινό σημείο είναι το P${maxPtIdx}.`,
                edge: [p1, p2],
                maxPt: maxPt,
                maxPtIdx: maxPtIdx,
                activeSet: points.map(x => x.pt),
                triangle: [p1, maxPt, p2],
                hullEdges: [...hullEdges],
                phase: 'EXPAND'
            });

            // Partition for sub-problems
            const sA = [];
            const sB = [];

            points.forEach(item => {
                if (item.pt === maxPt) return;
                // side of p1->maxPt. For recursive calls, we always want points outside the triangle.
                // Points to the "left" of segments p1 -> max and max -> p2 are "outside".
                // Fixed ccw: Left (outside) is > 0.
                if (ccw(p1, maxPt, item.pt) > 0.001) sA.push(item);
                else if (ccw(maxPt, p2, item.pt) > 0.001) sB.push(item);
            });

            const discarded = points.length - 1 - sA.length - sB.length;
            if (discarded > 0) {
                steps.push({
                    type: 'DISCARD',
                    msg: `${side}: ${discarded} σημεία εντός του τριγώνου P${p1Idx}-P${maxPtIdx}-P${p2Idx} αγνοούνται.`,
                    triangle: [p1, maxPt, p2],
                    hullEdges: [...hullEdges],
                    phase: 'DISCARD'
                });
            }

            queue.push({ p1: p1, p2: maxPt, points: sA, side: side, p1Idx: p1Idx, p2Idx: maxPtIdx });
            queue.push({ p1: maxPt, p2: p2, points: sB, side: side, p1Idx: maxPtIdx, p2Idx: p2Idx });
        }

        steps.push({
            type: 'FINAL',
            msg: `Ολοκληρώθηκε! Βρέθηκαν όλες οι ακμές του κυρτού περιβλήματος.`,
            hullEdges: hullEdges,
            phase: 'DONE'
        });

        this.steps = steps;
    }

    draw(step) {
        if (!step) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // All Points with labels
        this.points.forEach((p, i) => {
            this.drawPoint(p, '#bdc3c7', 4);
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText(`P${i}`, p.x + 6, p.y - 6);
        });

        // Extremes
        if (step.extremes) {
            step.extremes.forEach(p => this.drawPoint(p, '#9b59b6', 6));
            this.ctx.beginPath();
            this.ctx.moveTo(step.extremes[0].x, step.extremes[0].y);
            this.ctx.lineTo(step.extremes[1].x, step.extremes[1].y);
            this.ctx.strokeStyle = '#9b59b6';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Active Set
        if (step.activeSet) {
            step.activeSet.forEach(p => this.drawPoint(p, '#3498db', 4));
        }
        if (step.upperSet) {
            step.upperSet.forEach(p => this.drawPoint(p, '#3498db', 5));
        }
        if (step.lowerSet) {
            step.lowerSet.forEach(p => this.drawPoint(p, '#e67e22', 5));
        }

        // Current Edge being processed
        if (step.edge) {
            this.ctx.beginPath();
            this.ctx.moveTo(step.edge[0].x, step.edge[0].y);
            this.ctx.lineTo(step.edge[1].x, step.edge[1].y);
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Max Point / Distance Visualization (only during FIND_MAX step)
        if (step.type === 'FIND_MAX' && step.maxPt && step.edge) {
            const p1 = step.edge[0];
            const p2 = step.edge[1];
            const pt = step.maxPt;

            // Calculate projection of pt on line p1-p2 for distance visualization
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lenSq = dx * dx + dy * dy;
            const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq));
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;

            // Distance line
            this.ctx.beginPath();
            this.ctx.moveTo(pt.x, pt.y);
            this.ctx.lineTo(projX, projY);
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([2, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            this.drawPoint(step.maxPt, '#e74c3c', 7);
        }

        if (step.triangle) {
            this.ctx.beginPath();
            this.ctx.moveTo(step.triangle[0].x, step.triangle[0].y);
            this.ctx.lineTo(step.triangle[1].x, step.triangle[1].y);
            this.ctx.lineTo(step.triangle[2].x, step.triangle[2].y);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.05)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        // Hull Edges found so far
        if (step.hullEdges) {
            step.hullEdges.forEach(edge => {
                this.ctx.beginPath();
                this.ctx.moveTo(edge[0].x, edge[0].y);
                this.ctx.lineTo(edge[1].x, edge[1].y);
                this.ctx.strokeStyle = '#27ae60';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            });
        }
    }

    drawPoint(p, color, size) {
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color; this.ctx.fill();
    }
}

class GiftWrappingSimulator extends SimulatorBase {
    constructor(canvasId) {
        super(canvasId);
    }

    generatePoints(n = 15) {
        this.points = [];
        const margin = 50;
        const w = this.canvas.width;
        const h = this.canvas.height;
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

        // Step 1: Find start point (leftmost, then bottommost for tie)
        let startIdx = 0;
        for (let i = 1; i < P.length; i++) {
            if (P[i].x < P[startIdx].x || (P[i].x === P[startIdx].x && P[i].y > P[startIdx].y)) {
                startIdx = i;
            }
        }

        const hull = [P[startIdx]];
        let currentIdx = startIdx;

        steps.push({
            type: 'START',
            msg: `Αρχή: Επιλογή του αριστερότερου σημείου P${startIdx} ως αφετηρία.`,
            hull: [...hull],
            activePoint: P[startIdx],
            phase: 'INIT'
        });

        // Loop until we return to start
        let safety = 0;
        while (safety < P.length * 2) {
            safety++;
            let nextIdx = -1;

            // Find first candidate that is not current
            for (let i = 0; i < P.length; i++) {
                if (i !== currentIdx) { nextIdx = i; break; }
            }

            steps.push({
                type: 'SEARCH_START',
                msg: `Αναζήτηση επόμενης κορυφής από P${currentIdx}. Αρχικός υποψήφιος: P${nextIdx}.`,
                hull: [...hull],
                current: P[currentIdx],
                candidate: P[nextIdx],
                candidateIdx: nextIdx,
                phase: 'SCAN'
            });

            // Check all points to find the "most CCW" (leftmost turn)
            for (let i = 0; i < P.length; i++) {
                if (i === currentIdx || i === nextIdx) continue;

                const p = P[currentIdx];
                const next = P[nextIdx];
                const q = P[i];

                // CCW: if q is to the LEFT of ray p->next, it's a better candidate
                // ccw(p, next, q) > 0 means LEFT turn (q is counter-clockwise from next)
                const det = ccw(p, next, q);

                if (det > 0) {
                    // q is LEFT of p->next, so q is a better (more CCW) candidate
                    steps.push({
                        type: 'CHECK',
                        msg: `Έλεγχος P${i}: Είναι αριστερά του P${currentIdx}→P${nextIdx}. Νέος υποψήφιος!`,
                        hull: [...hull],
                        current: P[currentIdx],
                        candidate: P[i],
                        candidateIdx: i,
                        checking: P[i],
                        checkingIdx: i,
                        phase: 'SCAN',
                        isBetter: true
                    });
                    nextIdx = i;
                } else {
                    // Not better, just checking
                    steps.push({
                        type: 'CHECK',
                        msg: `Έλεγχος P${i}: Δεν είναι καλύτερο από P${nextIdx}.`,
                        hull: [...hull],
                        current: P[currentIdx],
                        candidate: P[nextIdx],
                        candidateIdx: nextIdx,
                        checking: P[i],
                        checkingIdx: i,
                        phase: 'SCAN',
                        isBetter: false
                    });
                }
            }

            // Found next point
            steps.push({
                type: 'ADD',
                msg: `Επιλέχθηκε το P${nextIdx} ως η επόμενη κορυφή του περιβλήματος.`,
                hull: [...hull, P[nextIdx]],
                current: P[currentIdx],
                candidate: P[nextIdx],
                candidateIdx: nextIdx,
                phase: 'ADD'
            });

            if (nextIdx === startIdx) break; // Wrapped around

            hull.push(P[nextIdx]);
            currentIdx = nextIdx;
        }

        steps.push({
            type: 'FINAL',
            msg: `Το κυρτό περίβλημα ολοκληρώθηκε με ${hull.length} κορυφές!`,
            hull: [...hull, P[startIdx]], // Close loop visually
            phase: 'DONE'
        });

        this.steps = steps;
    }

    draw(step) {
        if (!step) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all points with labels
        this.points.forEach((p, i) => {
            this.drawPoint(p, '#bdc3c7', 4);
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`P${i}`, p.x + 6, p.y - 6);
        });

        // Draw Hull (closed path)
        if (step.hull && step.hull.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(step.hull[0].x, step.hull[0].y);
            for (let i = 1; i < step.hull.length; i++) {
                this.ctx.lineTo(step.hull[i].x, step.hull[i].y);
            }
            if (step.phase === 'DONE') {
                this.ctx.closePath();
            }
            this.ctx.strokeStyle = '#27ae60';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Hull vertices
            step.hull.forEach(p => this.drawPoint(p, '#2ecc71', 5));
        }

        // Current point (where we are searching from)
        if (step.current) {
            this.drawPoint(step.current, '#2980b9', 7);
        }

        // Candidate line
        if (step.current && step.candidate) {
            this.ctx.beginPath();
            this.ctx.moveTo(step.current.x, step.current.y);
            this.ctx.lineTo(step.candidate.x, step.candidate.y);
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            this.drawPoint(step.candidate, '#f39c12', 6);
        }

        // Point being checked (highlight differently if better or not)
        if (step.checking) {
            const color = step.isBetter ? '#27ae60' : '#e74c3c';
            this.drawPoint(step.checking, color, 8);

            // Draw line to checked point
            if (step.current) {
                this.ctx.beginPath();
                this.ctx.moveTo(step.current.x, step.current.y);
                this.ctx.lineTo(step.checking.x, step.checking.y);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([3, 3]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }

    drawPoint(p, color, size) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
}

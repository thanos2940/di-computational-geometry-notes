class GrahamScanSimulator extends SimulatorBase {
    constructor(canvasId) {
        super(canvasId);
        this.sortedPoints = [];
    }

    generatePoints(n = 15) {
        this.points = [];
        const margin = 50;
        const w = this.canvas.width;
        const h = this.canvas.height;

        for (let i = 0; i < n; i++) {
            this.points.push(new Point(
                randomInt(margin, w - margin),
                randomInt(margin, h - margin)
            ));
        }

        this.computeSteps();
        this.setSteps(this.steps);
    }

    computeSteps() {
        const steps = [];
        const P = [...this.points];

        // Step 0: Sort
        steps.push({
            type: 'INFO',
            msg: 'Βήμα 1: Ταξινόμηση σημείων λεξικογραφικά (αύξουσα τετμημένη x).',
            hull: [],
            lowerHull: [],
            activePoint: null,
            phase: 'SORT'
        });

        // Sort by x, then y
        P.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
        this.sortedPoints = P;

        if (P.length < 3) {
            this.steps = steps;
            return;
        }

        // Assign sorted indices
        P.forEach((p, i) => p.sortedIdx = i);

        // Upper Hull
        let upper = [P[0], P[1]];

        steps.push({
            type: 'INIT_UPPER',
            msg: `Βήμα 2: Αρχικοποίηση Άνω Περιβλήματος με P0, P1.`,
            hull: [...upper],
            lowerHull: [],
            phase: 'UPPER'
        });

        for (let i = 2; i < P.length; i++) {
            let pi = P[i];
            upper.push(pi);

            steps.push({
                type: 'ADD',
                msg: `Προσθήκη P${i} στο Άνω Περίβλημα.`,
                hull: [...upper],
                lowerHull: [],
                activePoint: pi,
                phase: 'UPPER'
            });

            while (upper.length > 2) {
                const p = upper[upper.length - 3];
                const q = upper[upper.length - 2];
                const r = upper[upper.length - 1];

                const det = ccw(p, q, r);
                // Upper Hull (left to right): Right turn (det < 0) is OK
                const isRight = det < 0;

                const pIdx = P.indexOf(p);
                const qIdx = P.indexOf(q);
                const rIdx = P.indexOf(r);

                steps.push({
                    type: 'CHECK',
                    msg: `Έλεγχος στροφής P${pIdx}→P${qIdx}→P${rIdx}: ${isRight ? 'ΔΕΞΙΑ ✓' : 'ΑΡΙΣΤΕΡΑ ✗'}`,
                    hull: [...upper],
                    lowerHull: [],
                    activePoint: r,
                    checkPoints: [p, q, r],
                    isValid: isRight,
                    phase: 'UPPER'
                });

                if (!isRight) {
                    upper.splice(upper.length - 2, 1); // Remove Middle
                    steps.push({
                        type: 'REMOVE',
                        msg: `Αφαίρεση P${qIdx} (μη κυρτό).`,
                        hull: [...upper],
                        lowerHull: [],
                        activePoint: r,
                        phase: 'UPPER'
                    });
                } else {
                    break;
                }
            }
        }

        // Lower Hull
        let lower = [P[P.length - 1], P[P.length - 2]];

        steps.push({
            type: 'INIT_LOWER',
            msg: `Βήμα 3: Αρχικοποίηση Κάτω Περιβλήματος από τα δεξιά.`,
            hull: [...upper],
            lowerHull: [...lower],
            phase: 'LOWER'
        });

        for (let i = P.length - 3; i >= 0; i--) {
            let pi = P[i];
            lower.push(pi);

            steps.push({
                type: 'ADD',
                msg: `Προσθήκη P${i} στο Κάτω Περίβλημα.`,
                hull: [...upper],
                lowerHull: [...lower],
                activePoint: pi,
                phase: 'LOWER'
            });

            while (lower.length > 2) {
                const p = lower[lower.length - 3];
                const q = lower[lower.length - 2];
                const r = lower[lower.length - 1];

                const det = ccw(p, q, r);
                const isRight = det < 0;

                const pIdx = P.indexOf(p);
                const qIdx = P.indexOf(q);
                const rIdx = P.indexOf(r);

                steps.push({
                    type: 'CHECK',
                    msg: `Έλεγχος στροφής P${pIdx}→P${qIdx}→P${rIdx}: ${isRight ? 'ΔΕΞΙΑ ✓' : 'ΑΡΙΣΤΕΡΑ ✗'}`,
                    hull: [...upper],
                    lowerHull: [...lower],
                    activePoint: r,
                    checkPoints: [p, q, r],
                    isValid: isRight,
                    phase: 'LOWER'
                });

                if (!isRight) {
                    lower.splice(lower.length - 2, 1);
                    steps.push({
                        type: 'REMOVE',
                        msg: `Αφαίρεση P${qIdx} (μη κυρτό).`,
                        hull: [...upper],
                        lowerHull: [...lower],
                        activePoint: r,
                        phase: 'LOWER'
                    });
                } else {
                    break;
                }
            }
        }

        // Final Merge
        const finalLower = lower.slice(1, lower.length - 1);
        const finalHull = upper.concat(finalLower);

        steps.push({
            type: 'FINAL',
            msg: `Ολοκληρώθηκε! Το κυρτό περίβλημα έχει ${finalHull.length} κορυφές.`,
            hull: finalHull,
            lowerHull: [],
            phase: 'DONE'
        });

        this.steps = steps;
    }

    draw(step) {
        if (!step) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all sorted points with labels
        const displayPoints = this.sortedPoints.length > 0 ? this.sortedPoints : this.points;

        displayPoints.forEach((p, i) => {
            this.drawPoint(p, '#bdc3c7', 4);
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`P${i}`, p.x + 6, p.y - 6);
        });

        // Draw Upper Hull
        if (step.hull && step.hull.length > 0) {
            this.drawPath(step.hull, '#2980b9', 3, false);
            step.hull.forEach(p => this.drawPoint(p, '#3498db', 5));
        }

        // Draw Lower Hull
        if (step.lowerHull && step.lowerHull.length > 0) {
            this.drawPath(step.lowerHull, '#d35400', 3, false);
            step.lowerHull.forEach(p => this.drawPoint(p, '#e67e22', 5));
        }

        // Active Point
        if (step.activePoint) {
            this.drawPoint(step.activePoint, '#9b59b6', 7);
        }

        // Check Triangle
        if (step.checkPoints) {
            const [p, q, r] = step.checkPoints;
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(q.x, q.y);
            this.ctx.lineTo(r.x, r.y);
            this.ctx.closePath();
            this.ctx.strokeStyle = step.isValid ? '#27ae60' : '#c0392b';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.globalAlpha = 0.15;
            this.ctx.fillStyle = step.isValid ? '#27ae60' : '#c0392b';
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;

            // Highlight the middle point being tested
            this.drawPoint(q, step.isValid ? '#27ae60' : '#e74c3c', 6);
        }

        // Final hull closed
        if (step.phase === 'DONE' && step.hull.length > 2) {
            this.drawPath(step.hull, '#27ae60', 3, true);
            step.hull.forEach(p => this.drawPoint(p, '#2ecc71', 5));
        }
    }

    drawPoint(p, color, size) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawPath(points, color, width, close = false) {
        if (points.length < 2) return;
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        if (close) this.ctx.closePath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
    }
}

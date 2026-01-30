class DivideConquerFullSimulator extends SimulatorBase {
    constructor(canvasId, suffix) {
        super(canvasId, suffix);
    }

    generatePoints(n = 16) {
        this.points = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 50;
        for (let i = 0; i < n; i++) {
            this.points.push(new Point(randomInt(margin, w - margin), randomInt(margin, h - margin)));
        }
        this.points.sort((a, b) => a.x - b.x);
        // Assign sorted indices
        this.points.forEach((p, i) => p.idx = i);

        this.computeSteps();
        this.setSteps(this.steps);
    }

    computeSteps() {
        const steps = [];
        const P = this.points;
        if (P.length < 3) { this.steps = steps; return; }

        // Recursive function
        const dc = (indices, level) => {
            if (indices.length <= 1) {
                return indices;
            }
            if (indices.length <= 3) {
                // Base case: compute hull directly
                const pts = indices.map(i => P[i]);
                const hull = this.computeHullSimple(pts);
                const hullIndices = hull.map(p => P.indexOf(p));

                steps.push({
                    type: 'BASE',
                    msg: `Επίπεδο ${level}: Περίβλημα βάσης (${indices.length} σημεία).`,
                    hull: hull,
                    indices: indices,
                    level: level,
                    phase: 'BASE'
                });
                return hullIndices;
            }

            const mid = Math.floor(indices.length / 2);
            const leftIndices = indices.slice(0, mid);
            const rightIndices = indices.slice(mid);

            steps.push({
                type: 'SPLIT',
                msg: `Επίπεδο ${level}: Διαίρεση σε [P${leftIndices[0]}..P${leftIndices[leftIndices.length - 1]}] και [P${rightIndices[0]}..P${rightIndices[rightIndices.length - 1]}].`,
                leftIndices: leftIndices,
                rightIndices: rightIndices,
                level: level,
                phase: 'SPLIT'
            });

            const leftHull = dc(leftIndices, level + 1);
            const rightHull = dc(rightIndices, level + 1);

            const leftPts = leftHull.map(i => P[i]);
            const rightPts = rightHull.map(i => P[i]);

            steps.push({
                type: 'PRE_MERGE',
                msg: `Επίπεδο ${level}: Συγχώνευση αριστερού (${leftHull.length}) και δεξιού (${rightHull.length}) περιβλήματος.`,
                leftHull: leftPts,
                rightHull: rightPts,
                level: level,
                phase: 'MERGE_START'
            });

            // Merge hulls
            const allPts = [...leftPts, ...rightPts];
            const mergedHull = this.computeHullSimple(allPts);
            const mergedIndices = mergedHull.map(p => P.indexOf(p));

            steps.push({
                type: 'POST_MERGE',
                msg: `Επίπεδο ${level}: Συγχώνευση ολοκληρώθηκε (${mergedHull.length} κορυφές).`,
                hull: mergedHull,
                level: level,
                phase: 'MERGE_DONE'
            });

            return mergedIndices;
        };

        const allIndices = P.map((_, i) => i);
        const finalIndices = dc(allIndices, 0);
        const finalHull = finalIndices.map(i => P[i]);

        steps.push({
            type: 'FINAL',
            msg: `Ολοκληρώθηκε! Το κυρτό περίβλημα έχει ${finalHull.length} κορυφές.`,
            hull: finalHull,
            phase: 'DONE'
        });

        this.steps = steps;
    }

    computeHullSimple(points) {
        if (points.length < 3) return points;
        const pts = [...points].sort((a, b) => a.x - b.x);
        const upper = [];
        for (let p of pts) {
            while (upper.length >= 2 && ccw(upper[upper.length - 2], upper[upper.length - 1], p) >= 0) upper.pop();
            upper.push(p);
        }
        const lower = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (lower.length >= 2 && ccw(lower[lower.length - 2], lower[lower.length - 1], p) >= 0) lower.pop();
            lower.push(p);
        }
        lower.shift(); lower.pop();
        return upper.concat(lower);
    }

    draw(step) {
        if (!step) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // All points with labels
        this.points.forEach((p, i) => {
            this.drawPoint(p, '#bdc3c7', 4);
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText(`P${i}`, p.x + 5, p.y - 5);
        });

        // Split visualization
        if (step.leftIndices && step.rightIndices) {
            step.leftIndices.forEach(i => this.drawPoint(this.points[i], '#3498db', 5));
            step.rightIndices.forEach(i => this.drawPoint(this.points[i], '#e67e22', 5));

            // Draw dividing line
            const midX = (this.points[step.leftIndices[step.leftIndices.length - 1]].x +
                this.points[step.rightIndices[0]].x) / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(midX, 0);
            this.ctx.lineTo(midX, this.canvas.height);
            this.ctx.strokeStyle = '#95a5a6';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Left and Right hulls (pre-merge)
        if (step.leftHull && step.rightHull) {
            this.drawHull(step.leftHull, '#3498db');
            this.drawHull(step.rightHull, '#e67e22');
        }

        // Merged/Final hull
        if (step.hull && step.phase !== 'SPLIT') {
            this.drawHull(step.hull, '#27ae60');
        }
    }

    drawHull(pts, color) {
        if (pts.length < 2) return;
        this.ctx.beginPath();
        this.ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) this.ctx.lineTo(pts[i].x, pts[i].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        pts.forEach(p => this.drawPoint(p, color, 5));
    }

    drawPoint(p, color, size) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
}

// Bridge Concept Simulator (Interactive)
class DivideConquerBridgeSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.pointsL = [];
        this.pointsR = [];
        this.leftHull = [];
        this.rightHull = [];
        this.draggingPoint = null;

        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.onUp());
        window.addEventListener('resize', () => this.resize());

        setTimeout(() => this.resize(), 100);
    }

    resize() {
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
            if (this.pointsL.length === 0) this.generateHulls();
            this.render();
        }
    }

    generateHulls() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 30;

        this.pointsL = [];
        for (let i = 0; i < 8; i++) this.pointsL.push(new Point(randomInt(margin, w / 2 - 40), randomInt(margin, h - margin)));
        this.pointsR = [];
        for (let i = 0; i < 8; i++) this.pointsR.push(new Point(randomInt(w / 2 + 40, w - margin), randomInt(margin, h - margin)));

        this.updateHulls();
    }

    updateHulls() {
        this.leftHull = this.computeHull(this.pointsL);
        this.rightHull = this.computeHull(this.pointsR);
        this.render();
    }

    computeHull(points) {
        if (points.length < 3) return [...points].sort((a, b) => a.x - b.x);
        const pts = [...points].sort((a, b) => a.x - b.x);
        const upper = [];
        for (let p of pts) {
            while (upper.length >= 2 && ccw(upper[upper.length - 2], upper[upper.length - 1], p) >= 0) upper.pop();
            upper.push(p);
        }
        const lower = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (lower.length >= 2 && ccw(lower[lower.length - 2], lower[lower.length - 1], p) >= 0) lower.pop();
            lower.push(p);
        }
        lower.shift(); lower.pop();
        return upper.concat(lower);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - rect.left, e.clientY - rect.top);
    }

    onDown(e) {
        const m = this.getMousePos(e);
        const distThreshold = 15;

        // Check left points
        for (let p of this.pointsL) {
            if (m.dist(p) < distThreshold) {
                this.draggingPoint = p;
                return;
            }
        }
        // Check right points
        for (let p of this.pointsR) {
            if (m.dist(p) < distThreshold) {
                this.draggingPoint = p;
                return;
            }
        }
    }

    onMove(e) {
        if (this.draggingPoint) {
            const m = this.getMousePos(e);
            this.draggingPoint.x = m.x;
            this.draggingPoint.y = m.y;
            this.updateHulls();
        }
    }

    onUp() {
        this.draggingPoint = null;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dividing line
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = '#eee';
        this.ctx.setLineDash([10, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw Hulls
        this.drawHullPoly(this.leftHull, this.pointsL, '#3498db', 'Αριστερό');
        this.drawHullPoly(this.rightHull, this.pointsR, '#e67e22', 'Δεξί');

        // Find and draw bridges
        const upperBridge = this.findBridge(this.leftHull, this.rightHull, true);
        const lowerBridge = this.findBridge(this.leftHull, this.rightHull, false);

        if (upperBridge) {
            this.drawBridge(upperBridge, '#e74c3c', 'Άνω Γέφυρα');
        }
        if (lowerBridge) {
            this.drawBridge(lowerBridge, '#9b59b6', 'Κάτω Γέφυρα');
        }
    }

    findBridge(poly1, poly2, isUpper) {
        if (poly1.length === 0 || poly2.length === 0) return null;

        // Αρχικοποίηση: Δεξιότερο σημείο του αριστερού (poly1) και αριστερότερο του δεξιού (poly2)
        // Σύμφωνα με την computeHull, το poly1[0] είναι το αριστερότερο. 
        // Πρέπει να βρούμε το δεξιότερο του poly1 και το αριστερότερο του poly2.
        let i = 0;
        for (let k = 1; k < poly1.length; k++) if (poly1[k].x > poly1[i].x) i = k;
        let j = 0;
        for (let k = 1; k < poly2.length; k++) if (poly2[k].x < poly2[j].x) j = k;

        let changed = true;
        const n1 = poly1.length;
        const n2 = poly2.length;

        while (changed) {
            changed = false;

            if (isUpper) {
                // Άνω γέφυρα: Ανεβαίνουμε στο poly1 (CCW)
                // Ελέγχουμε αν το επόμενο σημείο poly1[i+1] είναι "πάνω" από τη γραμμή poly1[i]-poly2[j]
                // Χρησιμοποιούμε την ccw(B, A, Anext) > 0 όπως στον ψευδοκώδικα
                while (ccw(poly2[j], poly1[i], poly1[(i + 1) % n1]) > 0.001) {
                    i = (i + 1) % n1;
                    changed = true;
                }
                // Ανεβαίνουμε στο poly2 (CW)
                while (ccw(poly1[i], poly2[j], poly2[(j - 1 + n2) % n2]) < -0.001) {
                    j = (j - 1 + n2) % n2;
                    changed = true;
                }
            } else {
                // Κάτω γέφυρα: Κατεβαίνουμε στο poly1 (CW)
                while (ccw(poly2[j], poly1[i], poly1[(i - 1 + n1) % n1]) < -0.001) {
                    i = (i - 1 + n1) % n1;
                    changed = true;
                }
                // Κατεβαίνουμε στο poly2 (CCW)
                while (ccw(poly1[i], poly2[j], poly2[(j + 1) % n2]) > 0.001) {
                    j = (j + 1) % n2;
                    changed = true;
                }
            }
        }

        return [poly1[i], poly2[j]];
    }

    drawBridge(edge, color, label) {
        this.ctx.beginPath();
        this.ctx.moveTo(edge[0].x, edge[0].y);
        this.ctx.lineTo(edge[1].x, edge[1].y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 4]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const midX = (edge[0].x + edge[1].x) / 2;
        const midY = (edge[0].y + edge[1].y) / 2;
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(label, midX - 30, midY - 10);
    }

    drawHullPoly(hullPts, allPts, color, label) {
        if (hullPts.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(hullPts[0].x, hullPts[0].y);
        for (let i = 1; i < hullPts.length; i++) this.ctx.lineTo(hullPts[i].x, hullPts[i].y);
        this.ctx.closePath();
        this.ctx.fillStyle = color + '15';
        this.ctx.fill();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw all points
        allPts.forEach((p) => {
            const isOnHull = hullPts.includes(p);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, isOnHull ? 5 : 3, 0, Math.PI * 2);
            this.ctx.fillStyle = isOnHull ? color : '#bdc3c7';
            this.ctx.fill();
            if (isOnHull) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        });
    }
}

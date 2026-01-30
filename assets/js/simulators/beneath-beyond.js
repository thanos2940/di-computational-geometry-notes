const margin = 50; // Global for this file

class BeneathBeyondAlgoSimulator extends SimulatorBase {
    constructor(canvasId, suffix) {
        super(canvasId, suffix);
    }

    generatePoints(n = 10) {
        this.points = [];
        const w = this.canvas.width;
        const h = this.canvas.height;

        for (let i = 0; i < n; i++) {
            this.points.push(new Point(randomInt(margin, w - margin), randomInt(margin, h - margin)));
        }

        // Ensure non-collinear first 3
        if (this.points.length >= 3 && Math.abs(ccw(this.points[0], this.points[1], this.points[2])) < 1) {
            this.points[2].y += 30;
        }

        this.computeSteps();
        this.setSteps(this.steps);
    }

    computeSteps() {
        const steps = [];
        const P = this.points;
        if (P.length < 3) { this.steps = steps; return; }

        // Initial Triangle
        let hull = [P[0], P[1], P[2]];
        // Ensure CCW (left turns for inside check)
        if (ccw(hull[0], hull[1], hull[2]) < 0) {
            [hull[1], hull[2]] = [hull[2], hull[1]];
        }

        steps.push({
            type: 'INIT',
            msg: `Αρχικοποίηση: Τρίγωνο P0-P1-P2 είναι το αρχικό περίβλημα.`,
            hull: [...hull],
            pointsProcessed: 3,
            phase: 'INIT'
        });

        // Incremental addition
        for (let i = 3; i < P.length; i++) {
            const p = P[i];

            steps.push({
                type: 'NEW_POINT',
                msg: `Εξέταση σημείου P${i}.`,
                hull: [...hull],
                activePoint: p,
                activeIdx: i,
                phase: 'CHECK'
            });

            // Check visibility of each edge
            let visibleEdges = [];
            const nH = hull.length;

            for (let j = 0; j < nH; j++) {
                const u = hull[j];
                const v = hull[(j + 1) % nH];

                // For CCW hull: point is "outside" if it's RIGHT of edge (ccw < 0)
                if (ccw(u, v, p) < 0) {
                    visibleEdges.push({ u, v, idx: j });
                }
            }

            if (visibleEdges.length === 0) {
                steps.push({
                    type: 'INSIDE',
                    msg: `P${i} είναι εντός του περιβλήματος. Αγνοείται.`,
                    hull: [...hull],
                    activePoint: p,
                    activeIdx: i,
                    phase: 'DISCARD'
                });
                continue;
            }

            steps.push({
                type: 'VISIBLE',
                msg: `P${i} βλέπει ${visibleEdges.length} ακμές (κόκκινες).`,
                hull: [...hull],
                activePoint: p,
                activeIdx: i,
                visibleEdges: visibleEdges,
                phase: 'VISIBLE'
            });

            // Find tangent points
            const isVis = (j) => ccw(hull[j], hull[(j + 1) % nH], p) < 0;
            let t1 = -1, t2 = -1;

            for (let j = 0; j < nH; j++) {
                const prev = (j - 1 + nH) % nH;
                const v_prev = isVis(prev);
                const v_curr = isVis(j);

                if (!v_prev && v_curr) t1 = j;
                if (v_prev && !v_curr) t2 = j;
            }

            // Build new hull
            const newHull = [];
            let curr = t2;
            while (curr !== t1) {
                newHull.push(hull[curr]);
                curr = (curr + 1) % nH;
            }
            newHull.push(hull[t1]);
            newHull.push(p);

            hull = newHull;

            steps.push({
                type: 'UPDATE',
                msg: `Περίβλημα ενημερώθηκε. P${i} προστέθηκε. Νέο μέγεθος: ${hull.length}.`,
                hull: [...hull],
                activePoint: p,
                activeIdx: i,
                phase: 'UPDATE'
            });
        }

        steps.push({
            type: 'FINAL',
            msg: `Ολοκληρώθηκε! Το περίβλημα έχει ${hull.length} κορυφές.`,
            hull: hull,
            phase: 'DONE'
        });

        this.steps = steps;
    }

    draw(step) {
        if (!step) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // All points with labels
        this.points.forEach((p, i) => {
            this.drawPoint(p, '#bdc3c7', 4);
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`P${i}`, p.x + 6, p.y - 6);
        });

        // Current Hull
        if (step.hull && step.hull.length > 1) {
            this.drawHull(step.hull, '#2980b9');
        }

        // Active Point
        if (step.activePoint) {
            this.drawPoint(step.activePoint, '#9b59b6', 8);
        }

        // Visible Edges (in red)
        if (step.visibleEdges) {
            step.visibleEdges.forEach(e => {
                this.ctx.beginPath();
                this.ctx.moveTo(e.u.x, e.u.y);
                this.ctx.lineTo(e.v.x, e.v.y);
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
            });
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

    drawPoint(p, c, s) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        this.ctx.fillStyle = c;
        this.ctx.fill();
    }
}

class BeneathBeyondInteractive {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.activePoint = null;
        this.isDragging = false;

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
            if (this.points.length === 0) this.reset();
            else this.render();
        }
    }

    reset() {
        const w = this.canvas.width, h = this.canvas.height;
        const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.3;

        // Create hexagon in CCW order
        this.points = [];
        for (let i = 0; i < 6; i++) {
            // Χρησιμοποιούμε αρνητικό πρόσημο στο i για CCW φορά (αφού το Y αυξάνεται προς τα κάτω)
            const angle = -i * Math.PI * 2 / 6 - Math.PI / 2;
            this.points.push(new Point(cx + r * Math.cos(angle), cy + r * Math.sin(angle)));
        }

        this.activePoint = new Point(cx + r * 1.5, cy);
        this.render();
    }

    getMouse(e) {
        const r = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - r.left, e.clientY - r.top);
    }

    onDown(e) {
        const m = this.getMouse(e);
        if (this.dist(m, this.activePoint) < 25) this.isDragging = true;
    }

    onMove(e) {
        if (this.isDragging) {
            this.activePoint = this.getMouse(e);
            this.render();
        }
    }

    onUp() { this.isDragging = false; }

    dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const P = this.points;
        const ap = this.activePoint;
        const n = P.length;

        // 1. Προ-υπολογισμός ορατότητας όλων των ακμών
        const edgeVisibility = [];
        for (let i = 0; i < n; i++) {
            const u = P[i];
            const v = P[(i + 1) % n];
            edgeVisibility.push(ccw(u, v, ap) < 0);
        }

        // 2. Σχεδίαση ακμών και γραμμών όρασης
        for (let i = 0; i < n; i++) {
            const u = P[i];
            const v = P[(i + 1) % n];
            const isVisible = edgeVisibility[i];

            if (isVisible) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.setLineDash([5, 5]);
                this.ctx.moveTo(ap.x, ap.y);
                this.ctx.lineTo(u.x, u.y);
                this.ctx.moveTo(ap.x, ap.y);
                this.ctx.lineTo(v.x, v.y);
                this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                this.ctx.restore();
            }

            this.ctx.beginPath();
            this.ctx.moveTo(u.x, u.y);
            this.ctx.lineTo(v.x, v.y);
            this.ctx.strokeStyle = isVisible ? '#e74c3c' : '#3498db';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            const mx = (u.x + v.x) / 2;
            const my = (u.y + v.y) / 2;
            this.ctx.fillStyle = isVisible ? '#c0392b' : '#2980b9';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText(isVisible ? 'Ορατή' : 'Αόρατη', mx - 15, my - 8);
        }

        // 3. Σχεδίαση κορυφών με βάση τον "Χρωματισμό" της θεωρίας
        P.forEach((p, i) => {
            const prevEdgeVis = edgeVisibility[(i - 1 + n) % n];
            const nextEdgeVis = edgeVisibility[i];

            let vertexColor = '#2c3e50'; // Default
            let isHorizon = false;

            if (prevEdgeVis && nextEdgeVis) {
                vertexColor = '#e74c3c'; // Κόκκινη κορυφή (2 κόκκινες ακμές)
            } else if (!prevEdgeVis && !nextEdgeVis) {
                vertexColor = '#3498db'; // Γαλάζια κορυφή (2 γαλάζιες ακμές)
            } else {
                vertexColor = '#8e44ad'; // Βυσσινί κορυφή (1 κόκκινη & 1 γαλάζια) -> ΟΡΙΖΟΝΤΑΣ
                isHorizon = true;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, isHorizon ? 7 : 5, 0, Math.PI * 2);
            this.ctx.fillStyle = vertexColor;
            this.ctx.fill();

            // Halo for horizon
            if (isHorizon) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            this.ctx.fillStyle = vertexColor;
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`V${i}`, p.x + 10, p.y - 10);

            if (isHorizon) {
                this.ctx.fillStyle = '#8e44ad';
                this.ctx.font = 'italic bold 10px Arial';
                this.ctx.fillText('Ορίζοντας', p.x + 10, p.y + 15);
            }
        });

        // 4. Active Point
        this.ctx.beginPath();
        this.ctx.arc(ap.x, ap.y, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = '#9b59b6';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText('P (σύρετε)', ap.x + 12, ap.y + 4);
    }
}

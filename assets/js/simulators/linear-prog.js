class LPSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');

        this.constraints = []; // Array of lines {a, b, c} => ax + by <= c?
        // Represent lines as point + normal?
        // Or segments for visualization.

        this.optimalPoint = null;
        this.objVector = { x: 0, y: -1 }; // Maximize Y (screen Y is down, so Minimize Y).
        // Let's say we want to find Lowest Y (Top of screen).
        // Maximize (-y).

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        if (this.constraints.length > 0) this.render();
    }

    reset() {
        this.constraints = [];
        // Init optimal point at "Infinity" or bounding box.
        // Let's use a large bounding box.
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.optimalPoint = { x: w / 2, y: 0 }; // Top middle

        // Add bounding box constraints implicitly or explicitly?
        // Explicitly is better for algo visualization.
        // Box: x >= 0, x <= w, y >= 0, y <= h.
        // LP form: ax + by <= c.
        // x >= 0 => -x <= 0.
        // x <= w => x <= w.
        // y >= 0 => -y <= 0.
        // y <= h => y <= h.

        this.addLine(-1, 0, 0); // x >= 0
        this.addLine(1, 0, w);  // x <= w
        this.addLine(0, -1, 0); // y >= 0
        this.addLine(0, 1, h);  // y <= h

        this.render();
        this.statusEl.innerHTML = "Αρχικοποίηση με Bounding Box.";
    }

    addLine(a, b, c) {
        this.constraints.push({ a, b, c });
        // Re-evaluate optimal?
        // For simulator, we do this incrementally on button press.
    }

    addConstraint() {
        // Generate random half-plane
        // passing through canvas.
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Random line: ax + by = c.
        // Pick 2 points
        const p1 = { x: Math.random() * w, y: Math.random() * h };
        const p2 = { x: Math.random() * w, y: Math.random() * h };

        // Normal vector (a, b) = (p1.y - p2.y, p2.x - p1.x)
        let a = p1.y - p2.y;
        let b = p2.x - p1.x;
        // Normalize
        const len = Math.sqrt(a * a + b * b);
        a /= len; b /= len;

        // c = ax + by
        const c = a * p1.x + b * p1.y;

        // Decide side: We want the side that contains the CENTER?
        // Or random? Random side can make feasibility 0 very fast.
        // Let's try to keep center (w/2, h/2) valid often.
        if (a * w / 2 + b * h / 2 > c) {
            // Center violates. Flip normal.
            a = -a; b = -b;
            // c changes sign? No, ax+by<=c.
            // -ax -by <= -c.
            // new a, b, c.
            // c = newA * p1.x + newB * p1.y = -c_old.
            // Yes.
        }
        // Actually, recompute c.
        const cNew = a * p1.x + b * p1.y;

        this.constraints.push({ a, b, c: cNew });

        // Solve LP
        this.solve();
    }

    solve() {
        // Re-run Seidel from scratch or incrementally?
        // Incremental: check if current optimal violates last constraint.
        // Since we are simulating, we can cheat and solve full GLP or do the incremental step.
        // Let's do Full Re-solve to be robust (simpler code).
        // Or better: Show the Seidel Logic.
        // "Check last constraint".

        const last = this.constraints[this.constraints.length - 1];

        // Check current optimal
        if (this.violates(this.optimalPoint, last)) {
            this.statusEl.innerHTML = "Παραβίαση! Προβολή στο σύνορο...";
            // Project optimal to line (1D LP).
            // Actually, we must solve the LP subject to all Previous constraints AND new line equality.

            // 1D Problem on Line L: ax+by=c.
            // Parametrize Line: P = P0 + t * V.
            // V = (-b, a). P0 = projected origin?
            // Range for t: [t_min, t_max].
            // Find intersection of L with all previous half-planes.

            // This is actually finding segment of L inside feasible polygon.
            // Then picking point in segment minimizing objective (min Y).

            // Parametrize line
            // Need a point P0 on line.
            // if b != 0, y = (c - ax)/b. set x=0, y=c/b.
            // else x = c/a.

            let p0, v;
            if (Math.abs(last.b) > 1e-5) {
                p0 = { x: 0, y: last.c / last.b };
            } else {
                p0 = { x: last.c / last.a, y: 0 };
            }
            v = { x: -last.b, y: last.a }; // Direction vector along line

            // 1D Constraints on t
            let tMin = -Infinity;
            let tMax = Infinity;

            // Intersect with all previous
            for (let i = 0; i < this.constraints.length - 1; i++) {
                const con = this.constraints[i];
                // con.a * (p0.x + t*v.x) + con.b * (p0.y + t*v.y) <= con.c
                // t * (con.a * v.x + con.b * v.y) <= con.c - (con.a*p0.x + con.b*p0.y)
                // t * dot <= diff

                const dot = con.a * v.x + con.b * v.y;
                const diff = con.c - (con.a * p0.x + con.b * p0.y);

                if (Math.abs(dot) < 1e-9) {
                    // Parallel. If diff < 0, line is completely infeasible.
                    if (diff < -1e-9) {
                        this.statusEl.innerHTML = "Ανέφικτο (Parallel Infeasible).";
                        this.optimalPoint = null;
                        this.render();
                        return;
                    }
                } else {
                    const val = diff / dot;
                    if (dot > 0) {
                        // t <= val
                        tMax = Math.min(tMax, val);
                    } else {
                        // t * neg <= diff => t >= diff/neg
                        tMin = Math.max(tMin, val);
                    }
                }
            }

            if (tMin > tMax) {
                this.statusEl.innerHTML = "Ανέφικτο (Empty Region).";
                this.optimalPoint = null;
                this.render();
                return;
            }

            // We have segment [tMin, tMax].
            // We want to Minimize Y (or Maximize -Y).
            // y(t) = p0.y + t*v.y.
            // If v.y > 0, minimize t -> tMin.
            // If v.y < 0, minimize t -> tMax (y becomes smaller as t increases? no, t*neg is neg large).
            // Wait. Minimize y.
            // if v.y > 0: small t gives small y. Pick tMin.
            // if v.y < 0: large t gives small y (large negative). Pick tMax.
            // if v.y = 0: y is constant. Pick any.

            let bestT = tMin;
            if (Math.abs(tMin) === Infinity) bestT = tMax; // Unbounded?
            // With bounding box, shouldn't be infinite.

            // Check direction
            if (v.y > 0) bestT = tMin;
            else if (v.y < 0) bestT = tMax;
            else bestT = (tMin + tMax) / 2;

            this.optimalPoint = {
                x: p0.x + bestT * v.x,
                y: p0.y + bestT * v.y
            };
            this.statusEl.innerHTML = "Nέο βέλτιστο βρέθηκε.";
        } else {
            this.statusEl.innerHTML = "Το βέλτιστο παραμένει ίδιο.";
        }

        this.render();
    }

    violates(p, line) {
        if (!p) return true; // Treating null as violation needed solving
        // ax + by <= c? allow small epsilon
        return (line.a * p.x + line.b * p.y) > line.c + 1e-5;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Constraints
        this.constraints.forEach((c, i) => {
            this.drawHalfPlane(c, i === this.constraints.length - 1);
        });

        // Draw Optimal
        if (this.optimalPoint) {
            this.ctx.beginPath();
            this.ctx.arc(this.optimalPoint.x, this.optimalPoint.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#27ae60';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();

            this.ctx.fillStyle = '#000';
            this.ctx.fillText("Opt", this.optimalPoint.x + 8, this.optimalPoint.y);
        }
    }

    drawHalfPlane(line, isNew) {
        // Draw the line ax+by=c
        // Find intersection with canvas bounds
        // Just draw a long line
        // We know normal (a, b).
        // Find a point on line P0.
        // Tangent vector (-b, a).

        let p0;
        if (Math.abs(line.b) > 1e-5) p0 = { x: 0, y: line.c / line.b };
        else p0 = { x: line.c / line.a, y: 0 };

        const tan = { x: -line.b, y: line.a };

        this.ctx.beginPath();
        this.ctx.moveTo(p0.x - tan.x * 1000, p0.y - tan.y * 1000);
        this.ctx.lineTo(p0.x + tan.x * 1000, p0.y + tan.y * 1000);

        this.ctx.strokeStyle = isNew ? '#e74c3c' : 'rgba(0,0,0,0.2)';
        this.ctx.lineWidth = isNew ? 2 : 1;
        this.ctx.stroke();

        // Draw shade to indicate invalid side?
        // Normal (a, b) points to Invalid side (since ax+by > c is invalid?)
        // Wait, Seidel usually ax+by <= c. Yes.
        // So Normal points to 'Higher values', which are invalid.
        // Draw small ticks along normal.

        const midX = p0.x;
        const midY = p0.y; // Roughly
        // Draw a tick
        this.ctx.beginPath();
        this.ctx.moveTo(midX, midY);
        this.ctx.lineTo(midX + line.a * 10, midY + line.b * 10);
        this.ctx.strokeStyle = isNew ? '#e74c3c' : 'rgba(0,0,0,0.1)';
        this.ctx.stroke();
    }
}

class InCircleSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');

        // Define points
        this.resetPoints();

        this.dragging = null;

        // Listeners
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.onUp());

        this.resize();
    }

    resetPoints() {
        // P1, P2, P3 form a triangle
        this.p1 = new Point(200, 300);
        this.p2 = new Point(400, 300);
        this.p3 = new Point(300, 150);
        // Q is the query point
        this.q = new Point(300, 250);

        this.render();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - rect.left, e.clientY - rect.top);
    }

    onDown(e) {
        const m = this.getMousePos(e);
        const dist = 15;
        if (m.dist(this.q) < dist) this.dragging = this.q;
        else if (m.dist(this.p1) < dist) this.dragging = this.p1;
        else if (m.dist(this.p2) < dist) this.dragging = this.p2;
        else if (m.dist(this.p3) < dist) this.dragging = this.p3;
    }

    onMove(e) {
        if (this.dragging) {
            const m = this.getMousePos(e);
            this.dragging.x = m.x;
            this.dragging.y = m.y;
            this.render();
        }
    }

    onUp() {
        this.dragging = null;
    }

    // Calculate 4x4 determinant
    inCircleDet(p1, p2, p3, q) {
        // Lifting map: (x, y) -> (x, y, x^2+y^2)
        const lift = (p) => p.x ** 2 + p.y ** 2;

        const m00 = p1.x; const m01 = p1.y; const m02 = lift(p1); const m03 = 1;
        const m10 = p2.x; const m11 = p2.y; const m12 = lift(p2); const m13 = 1;
        const m20 = p3.x; const m21 = p3.y; const m22 = lift(p3); const m23 = 1;
        const m30 = q.x; const m31 = q.y; const m32 = lift(q); const m33 = 1;

        // Determinant utilizing basic expansion
        // Or simpler: translate q to origin, then 3x3
        // Det 4x4 is translation invariant.

        // Let's implement full 4x4 or simplified geometric check
        // Notes formula:
        /*
        | p1x p1y p1x^2+p1y^2 1 |
        | p2x p2y ...         1 |
        ...
        */

        // Function to calc 3x3 det
        const det3 = (a1, a2, a3, b1, b2, b3, c1, c2, c3) => {
            return a1 * (b2 * c3 - b3 * c2) - a2 * (b1 * c3 - b3 * c1) + a3 * (b1 * c2 - b2 * c1);
        };

        // Expansion along last column (1,1,1,1)
        // +1 * det3(row1,2,3) - 1 * det3(row0,2,3) + 1 * det3(...)

        // Actually, let's use the property that CCW(A,B,C) matters.
        // Let's rely on the geometric circumcenter for visualization, and formula for text.

        // Determinant Calculation:
        const A = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x); // CCW check (2x2 det)

        // For exact 4x4 value, we can use a library or expansion.
        // Expansion:
        const sub3 = (r1, r2, r3) => {
            return det3(
                r1.x, r1.y, lift(r1),
                r2.x, r2.y, lift(r2),
                r3.x, r3.y, lift(r3)
            );
        };

        const det =
            -1 * sub3(p2, p3, q) +
            1 * sub3(p1, p3, q) -
            1 * sub3(p1, p2, q) +
            1 * sub3(p1, p2, p3);

        return det;
    }

    getCircumcenter(a, b, c) {
        const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        if (d === 0) return null; // Collinear

        const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
        const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;

        return new Point(ux, uy);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Check orientation of triangle
        const turn = ccw(this.p1, this.p2, this.p3);
        const isCCW = turn > 0;

        // Draw Triangle
        this.ctx.beginPath();
        this.ctx.moveTo(this.p1.x, this.p1.y);
        this.ctx.lineTo(this.p2.x, this.p2.y);
        this.ctx.lineTo(this.p3.x, this.p3.y);
        this.ctx.closePath();
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw Circumcircle
        const center = this.getCircumcenter(this.p1, this.p2, this.p3);
        let radius = 0;

        if (center) {
            radius = center.dist(this.p1);
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Check InCircle
        // We use the formula from notes.
        // If CCW, det > 0 means INSIDE. Wait, notes say:
        // "Υποθέτοντας ότι τα σημεία p1, p2, p3 είναι σε δεξιόστροφη φορά (clockwise)... Ορίζουσα > 0: το q βρίσκεται στο εξωτερικό"
        // Let's stick to CCW standard often used:
        // If CCW: Det > 0 -> Inside.
        // Let's calculate det first.

        // However, the notes logic:
        // det row 4: q_x, q_y, q^2+q^2, 1.

        let det = this.inCircleDet(this.p1, this.p2, this.p3, this.q);
        // Correct based on orientation
        // If orientation is CW (turn < 0), then we must invert?
        // Let's just check distance to center.

        let geometricResult = 'ON';
        if (center) {
            const dist = center.dist(this.q);
            if (Math.abs(dist - radius) < 1) geometricResult = 'ON';
            else if (dist < radius) geometricResult = 'INSIDE';
            else geometricResult = 'OUTSIDE';
        }

        // Color Q
        let qColor = '#f1c40f'; // On
        if (geometricResult === 'INSIDE') qColor = '#e74c3c'; // Red inside
        if (geometricResult === 'OUTSIDE') qColor = '#27ae60'; // Green outside

        // Draw Points
        this.drawPoint(this.p1, 'p1', '#333');
        this.drawPoint(this.p2, 'p2', '#333');
        this.drawPoint(this.p3, 'p3', '#333');
        this.drawPoint(this.q, 'Q', qColor, 8);

        // Status
        let status = `Triangle is ${isCCW ? 'CCW' : 'CW'}. `;
        if (geometricResult === 'INSIDE') status += `<strong style="color:#e74c3c">Q is INSIDE</strong>`;
        else if (geometricResult === 'OUTSIDE') status += `<strong style="color:#27ae60">Q is OUTSIDE</strong>`;
        else status += `<strong>Q is ON CIRCLE</strong>`;

        this.statusEl.innerHTML = status + ` (Det: ${det.toFixed(0)})`;
    }

    drawPoint(p, label, color, size = 5) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(label, p.x + 8, p.y - 8);
    }
}

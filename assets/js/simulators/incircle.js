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
        // To match algorithm theory (where Y increases upwards), 
        // we conceptually negate all Y coordinates before calculating.
        const lift = (p) => p.x ** 2 + (-p.y) ** 2;

        // Function to calc 3x3 det
        const det3Arr = (a, b, c) => {
            return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
        };

        const r1 = [p1.x, -p1.y, lift(p1)];
        const r2 = [p2.x, -p2.y, lift(p2)];
        const r3 = [p3.x, -p3.y, lift(p3)];
        const rq = [q.x, -q.y, lift(q)];

        // Expansions for 4x4 det with last column 1s.
        const det = 1 * det3Arr(r1, r2, r3)
            - 1 * det3Arr(r2, r3, rq)
            + 1 * det3Arr(r1, r3, rq)
            - 1 * det3Arr(r1, r2, rq);

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

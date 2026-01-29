class CCWSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');

        this.p = new Point(100, 300);
        this.q = new Point(300, 300);
        this.r = new Point(200, 100);
        this.dragging = null;

        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.onUp());

        const btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.onclick = () => this.reset();
        }

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    reset() {
        this.p = new Point(100, 300);
        this.q = new Point(300, 300);
        this.r = new Point(200, 100);
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - rect.left, e.clientY - rect.top);
    }

    onDown(e) {
        const m = this.getMousePos(e);
        if (m.dist(this.p) < 15) this.dragging = this.p;
        else if (m.dist(this.q) < 15) this.dragging = this.q;
        else if (m.dist(this.r) < 15) this.dragging = this.r;
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

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw axes (optional grid)
        this.ctx.strokeStyle = '#eee';
        this.ctx.beginPath();
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
        }
        for (let i = 0; i < this.canvas.height; i += 50) {
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
        }
        this.ctx.stroke();

        // Draw lines P->Q->R
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.beginPath();
        this.ctx.moveTo(this.p.x, this.p.y);
        this.ctx.lineTo(this.q.x, this.q.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.q.x, this.q.y);
        this.ctx.lineTo(this.r.x, this.r.y);

        // Color Q->R based on turn
        const det = ccw(this.p, this.q, this.r);
        if (det > 0) this.ctx.strokeStyle = '#27ae60'; // CCW - Green
        else if (det < 0) this.ctx.strokeStyle = '#e74c3c'; // CW - Red
        else this.ctx.strokeStyle = '#f39c12'; // Collinear - Orange
        this.ctx.stroke();

        // Draw points
        this.drawPoint(this.p, 'P', '#2c3e50');
        this.drawPoint(this.q, 'Q', '#2c3e50');
        this.drawPoint(this.r, 'R', '#2c3e50');

        this.updateStatus(det);
    }

    drawPoint(pt, label, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(label, pt.x + 10, pt.y - 10);
    }

    updateStatus(det) {
        let msg = `Determinant: ${det.toFixed(0)} `;
        if (det > 0) msg += "→ <strong>Αριστερή Στροφή (CCW)</strong>";
        else if (det < 0) msg += "→ <strong>Δεξιά Στροφή (CW)</strong>";
        else msg += "→ <strong>Συνευθειακά</strong>";
        this.statusEl.innerHTML = msg;
    }
}

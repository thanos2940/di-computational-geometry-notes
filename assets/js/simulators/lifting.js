class LiftingSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.points = []; // 1D points (x values)
        this.draggingIdx = -1;

        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.onUp());

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    resetPoints() {
        this.points = [];
        const w = this.canvas.width;
        // Generate random x values between margin and w-margin
        for (let i = 0; i < 6; i++) {
            this.points.push(Math.random() * (w * 0.8) + (w * 0.1));
        }
        this.points.sort((a, b) => a - b);
        this.render();
    }

    // Coordinate transforms
    // World: x in [0, width], y in [height, 0] (cartesian up)
    // Parabola y = k*(x - cx)^2 + offset?
    // Let's fit parabola in view.

    // Actually, x is screen pixel x.
    // Normalized x in [-1, 1]?

    toScreen(x, y) {
        // Assume x, y are roughly screen coords but y is Up
        return { x: x, y: this.canvas.height - y };
    }

    getParabolaY(x) {
        // Map x from [0, W] to [-1, 1]
        const w = this.canvas.width;
        const normX = (x - w / 2) / (w / 3);
        // y = x^2. 
        const normY = normX * normX;
        // Map Y to height. Scale factor.
        return normY * (this.canvas.height * 0.8);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onDown(e) {
        const m = this.getMousePos(e);
        // Check 1D points on X-axis (say y=20 from bottom)
        const axisY = this.canvas.height - 40;

        let bestDist = 20;
        this.draggingIdx = -1;

        this.points.forEach((x, i) => {
            const dx = Math.abs(x - m.x);
            const dy = Math.abs(axisY - m.y);
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) {
                bestDist = d;
                this.draggingIdx = i;
            }
        });
    }

    onMove(e) {
        if (this.draggingIdx !== -1) {
            const m = this.getMousePos(e);
            // Constrain X to canvas width
            let newX = Math.max(20, Math.min(this.canvas.width - 20, m.x));
            this.points[this.draggingIdx] = newX;
            // Keep sorted for logic? 
            // In 1D Delaunay (lines), neighbors are sorted order.
            // Convex hull on parabola connects neighbors.
            this.render();
        }
    }

    onUp() {
        this.draggingIdx = -1;
        this.points.sort((a, b) => a - b); // Re-sort after drag
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const w = this.canvas.width;
        const h = this.canvas.height;
        const axisY = h - 40;

        // Draw Axis
        this.ctx.beginPath();
        this.ctx.moveTo(0, axisY);
        this.ctx.lineTo(w, axisY);
        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw Parabola
        this.ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
            const y = this.getParabolaY(x); // height from bottom
            const sy = axisY - y - 10; // 10px offset up
            if (x === 0) this.ctx.moveTo(x, sy);
            else this.ctx.lineTo(x, sy);
        }
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Lifted Points
        const lifted = this.points.map(x => {
            const y = this.getParabolaY(x);
            return { x: x, y: axisY - y - 10 };
        });

        // Draw Points on Axis
        this.points.forEach(x => {
            this.ctx.beginPath();
            this.ctx.arc(x, axisY, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();
        });

        // Draw Lifted Points
        lifted.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#e74c3c'; // Red
            this.ctx.fill();
        });

        // Draw Vertical Dashed Lines (Projection)
        this.points.forEach((x, i) => {
            this.ctx.beginPath();
            this.ctx.moveTo(x, axisY);
            this.ctx.lineTo(lifted[i].x, lifted[i].y);
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
            this.ctx.setLineDash([2, 2]);
            this.ctx.stroke();
        });
        this.ctx.setLineDash([]);

        // Draw Convex Hull of Lifted Points
        // Since y=x^2 is convex, the Lower Interior Hull connects adjacent points (sorted by x).
        // Wait. Lower Convex Hull of points on a parabola IS simple connections of adjacent points!
        // Because derivative 2x increases monotonically.
        // So Hull = p0-p1-p2-...-pn.
        // Let's verify by drawing.

        this.ctx.beginPath();
        if (lifted.length > 0) {
            this.ctx.moveTo(lifted[0].x, lifted[0].y);
            for (let i = 1; i < lifted.length; i++) {
                this.ctx.lineTo(lifted[i].x, lifted[i].y);
            }
        }
        this.ctx.strokeStyle = '#2980b9'; // Blue Hull
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Intuition: Every edge on hull corresponds to Delaunay edge. In 1D, adjacent points are connected.
        // This is trivial in 1D but illustrates the "Lower Hull" concept.
    }
}

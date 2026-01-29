class LegalEdgeSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');
        this.btnFlip = document.getElementById('btn-flip');

        this.points = []; // [a, b, c, d] forming quad a-b-c-d or triangles abd, bcd?
        // Let's definition: Quad ABCD. Diagonals AC and BD.
        // Points 0,1,2,3.
        // Start with convex quad.

        this.currentDiagonal = 'bd'; // or 'ac'
        this.draggingPoint = null;

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

    reset() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Define Quad p0, p1, p2, p3 in CCW order around center
        // p0 (top-left), p1 (bot-left), p2 (bot-right), p3 (top-right)?
        // Let's standard: 
        // p0: (-80, -80)
        // p1: (-80, 80)
        // p2: (80, 80)
        // p3: (80, -80)
        // This is rectangle. Legal either way.
        // Let's distort to make one illegal.

        this.points = [
            new Point(cx - 60, cy - 80), // A (Top Left)
            new Point(cx - 80, cy + 80), // B (Bot Left)
            new Point(cx + 80, cy + 60), // C (Bot Right)
            new Point(cx + 60, cy - 80)  // D (Top Right)
        ];

        // In this config (rectangle-ish), circle is neutral.
        // Let's move D inside the circle of ABC.
        // If current diagonal is AC. Triangles ABC, ADC.
        // If D is inside circumcircle of ABC, then AC is illegal?
        // Wait definition: Edge BD is illegal if ...

        this.currentDiagonal = 'ac'; // Start with AC
        this.render();
    }

    flip() {
        // Toggle diagonal
        // Verify convexity first? If concave, flip not strictly valid (creates overlap).
        // Let's just flip and user sees result.
        this.currentDiagonal = this.currentDiagonal === 'ac' ? 'bd' : 'ac';
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - rect.left, e.clientY - rect.top);
    }

    onDown(e) {
        const m = this.getMousePos(e);
        let bestDist = 20;
        let found = null;

        this.points.forEach(p => {
            const d = p.dist(m);
            if (d < bestDist) {
                bestDist = d;
                found = p;
            }
        });

        if (found) {
            this.draggingPoint = found;
        }
    }

    onMove(e) {
        if (this.draggingPoint) {
            const m = this.getMousePos(e);
            this.draggingPoint.x = m.x;
            this.draggingPoint.y = m.y;
            this.render();
        }
    }

    onUp() {
        this.draggingPoint = null;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const [a, b, c, d] = this.points;
        // Quad boundary: A-B-C-D-A
        this.ctx.beginPath();
        this.ctx.moveTo(a.x, a.y);
        this.ctx.lineTo(b.x, b.y);
        this.ctx.lineTo(c.x, c.y);
        this.ctx.lineTo(d.x, d.y);
        this.ctx.closePath();
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        let isIllegal = false;

        // Draw Diagonal
        if (this.currentDiagonal === 'ac') {
            // Triangles: ABC and ADC
            this.drawTriangle(a, b, c, '#3498db');
            this.drawTriangle(a, d, c, '#3498db');

            // Check Legality of AC
            // Check if D is inside Circle(A, B, C) OR B is inside Circle(A, D, C)
            // Using inTriangle (util) checks point in tri.
            // Using InCircle (geometry.js logic needed).
            // Let's assume geometry.js has no `inCircle` (it has inTriangle).
            // I implemented InCircle simulator logic in specific js, not geometry.js? 
            // Checking previous files... `assets/js/geometry.js` has Point, ccw, inTriangle, orient3d.
            // `assets/js/simulators/incircle.js` had the determinant logic.
            // I should reimplement determinant here or add to geometry.js.
            // Re-implementing simplified det here.

            // Check if D inside Circle(A, B, C)
            // Be careful with CCW order required for determinant.
            // Assume ABC is CCW. If CW, swap.
            const abcCCW = ccw(a, b, c) > 0; // if true, Left turn

            let p1 = a, p2 = b, p3 = c;
            if (!abcCCW) { p2 = c; p3 = b; } // Swap to make CCW

            const inCirc = this.checkInCircle(p1, p2, p3, d);

            if (inCirc > 0) isIllegal = true; // >0 means inside

            // Visualize Circumcircle of ABC
            this.drawCirc(p1, p2, p3, isIllegal ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)');

            this.drawEdge(a, c, isIllegal ? '#e74c3c' : '#2ecc71');

        } else {
            // Diagonal BD
            // Triangles: BCD and BAD
            this.drawTriangle(b, c, d, '#9b59b6');
            this.drawTriangle(b, a, d, '#9b59b6');

            // Check Legality of BD
            // Check if A inside Circle(B, C, D)
            const bcdCCW = ccw(b, c, d) > 0;
            let p1 = b, p2 = c, p3 = d;
            if (!bcdCCW) { p2 = d; p3 = c; }

            const inCirc = this.checkInCircle(p1, p2, p3, a);
            if (inCirc > 0) isIllegal = true;

            this.drawCirc(p1, p2, p3, isIllegal ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)');
            this.drawEdge(b, d, isIllegal ? '#e74c3c' : '#2ecc71');
        }

        // Draw Points
        this.points.forEach((p, idx) => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();
            this.ctx.fillText(['A', 'B', 'C', 'D'][idx], p.x + 8, p.y - 8);
        });

        this.statusEl.innerHTML = `Διαγώνιος: ${this.currentDiagonal.toUpperCase()} | Κατάσταση: ${isIllegal ? 'Μη-Έγκυρη (Illegal)' : 'Έγκυρη (Legal)'}`;
        this.statusEl.style.color = isIllegal ? '#c0392b' : '#27ae60';
        this.statusEl.style.fontWeight = 'bold';
    }

    drawTriangle(p1, p2, p3, color) {
        this.ctx.fillStyle = color + '22'; // low opacity
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.fill();
    }

    drawEdge(p1, p2, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    drawCirc(p1, p2, p3, color) {
        // Find circumcenter
        const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
        const Ux = ((p1.x ** 2 + p1.y ** 2) * (p2.y - p3.y) + (p2.x ** 2 + p2.y ** 2) * (p3.y - p1.y) + (p3.x ** 2 + p3.y ** 2) * (p1.y - p2.y)) / D;
        const Uy = ((p1.x ** 2 + p1.y ** 2) * (p3.x - p2.x) + (p2.x ** 2 + p2.y ** 2) * (p1.x - p3.x) + (p3.x ** 2 + p3.y ** 2) * (p2.x - p1.x)) / D;
        const R = Math.sqrt((p1.x - Ux) ** 2 + (p1.y - Uy) ** 2);

        this.ctx.beginPath();
        this.ctx.arc(Ux, Uy, R, 0, Math.PI * 2);
        this.ctx.fillStyle = color; // transparent fill
        this.ctx.fill();
        this.ctx.strokeStyle = color.replace('0.2)', '1)'); // Solid border
        this.ctx.lineWidth = 1;
        // this.ctx.stroke(); 
    }

    checkInCircle(a, b, c, d) {
        // 4x4 Determinant for InCircle
        // | ax ay ax^2+ay^2 1 |
        // | bx by ...       1 |
        // | cx cy ...       1 |
        // | dx dy ...       1 |

        // Simplified relative to A (at origin)
        const adx = a.x - d.x; const ady = a.y - d.y;
        const bdx = b.x - d.x; const bdy = b.y - d.y;
        const cdx = c.x - d.x; const cdy = c.y - d.y;

        const abdet = adx * bdy - bdx * ady;
        const bcdet = bdx * cdy - cdx * bdy;
        const cadet = cdx * ady - adx * cdy;

        const alift = adx * adx + ady * ady;
        const blift = bdx * bdx + bdy * bdy;
        const clift = cdx * cdx + cdy * cdy;

        return alift * bcdet + blift * cadet + clift * abdet;
    }
}

class FallingSheetSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.isAnimating = true;
        this.reset();
        this.animate();
    }

    reset() {
        super.reset();
        this.cameraDist = 550;
        this.rotY = -0.5;
        this.rotX = 0.3;

        // Points - Improved Scatter for better visualization
        this.p = [
            { x: 0, y: 0, z: 80, label: 'P1' },    // Topmost
            { x: -80, y: 50, z: 20, label: 'P2' }, // 2nd contact (Visual "Left/Back")
            { x: 70, y: -40, z: -10, label: 'P3' },// 3rd contact (Visual "Right/Bottom")
            { x: -30, y: -70, z: -50, label: 'P4' },
            { x: 50, y: 60, z: -30, label: 'P5' }
        ];

        // Animation State
        this.state = 'DESCEND';
        this.progress = 0;
        this.planeZ = 200;
        this.pauseTimer = 0;

        // Precompute Vectors/Normals
        this.calcGeometry();
    }

    calcGeometry() {
        // P1 is p[0], P2 is p[1], P3 is p[2]
        const p1 = this.p[0];
        const p2 = this.p[1];
        const p3 = this.p[2];

        // Vector P1->P2 (First Edge)
        this.v12 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };

        // Start Normal (Up)
        this.n0 = { x: 0, y: 0, z: 1 };

        // Intermediate Normal (n1)
        // Must be perpendicular to v12 (so plane contains P1 and P2)
        // And generally "upwards", minimizing the angle from Up.
        // Conceptually: The plane rotates around the "highest horizontal axis" until it hits P2.
        // Or simply: The plane passing through P1, P2 that makes the smallest angle with Z-axis?
        // Let's use the vector perpendicular to v12 and Horizontal-Perpendicular-to-v12.
        // v_perp_horiz = Cross(v12, n0).
        // n1 = Cross(v12, v_perp_horiz).
        let cross1 = this.cross(this.v12, this.n0);
        let n1_raw = this.cross(cross1, this.v12);
        this.n1 = this.normalize(n1_raw);
        if (this.n1.z < 0) this.n1 = this.scale(this.n1, -1); // Ensure pointing up

        // Final Normal (n2)
        // Normal of face P1-P2-P3
        let v13 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };
        let n2_raw = this.cross(this.v12, v13);
        this.n2 = this.normalize(n2_raw);
        if (this.n2.z < 0) this.n2 = this.scale(this.n2, -1);
    }

    // Vector helpers
    cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
    normalize(v) { let l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); return (l > 0) ? { x: v.x / l, y: v.y / l, z: v.z / l } : v; }
    scale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
    lerp(v1, v2, t) {
        // Linear Interpolate and Normalize
        let res = {
            x: v1.x * (1 - t) + v2.x * t,
            y: v1.y * (1 - t) + v2.y * t,
            z: v1.z * (1 - t) + v2.z * t
        };
        return this.normalize(res);
    }

    animate() {
        if (!this.isAnimating) return;

        // 1. DESCEND
        if (this.state === 'DESCEND') {
            this.planeZ -= 1.0;
            if (this.planeZ <= 80) {
                this.planeZ = 80;
                this.state = 'PAUSE_1';
                this.pauseTimer = 50;
            }

            // 2. PAUSE at P1
        } else if (this.state === 'PAUSE_1') {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.state = 'ROTATE_1';
                this.progress = 0;
            }

            // 3. ROTATE towards P2
        } else if (this.state === 'ROTATE_1') {
            this.progress += 0.02;
            if (this.progress >= 1) {
                this.progress = 1;
                this.state = 'PAUSE_2';
                this.pauseTimer = 50;
            }

            // 4. PAUSE at P2
        } else if (this.state === 'PAUSE_2') {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.state = 'ROTATE_2';
                this.progress = 0;
            }

            // 5. ROTATE towards P3
        } else if (this.state === 'ROTATE_2') {
            this.progress += 0.02;
            if (this.progress >= 1) {
                this.progress = 1;
                this.state = 'FINAL';
                this.pauseTimer = 150;
            }

            // 6. RESTART
        } else if (this.state === 'FINAL') {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.reset();
                return; // loop continues next frame
            }
        }

        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        if (!this.ctx) return;
        if (!this.p) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const projected = this.p.map(pt => this.project(pt));

        // Calculate Current Normal
        let currentNormal = this.n0;

        if (this.state === 'ROTATE_1' || this.state === 'PAUSE_2') {
            let t = this.state === 'PAUSE_2' ? 1 : this.easeOut(this.progress);
            currentNormal = this.lerp(this.n0, this.n1, t);
        } else if (this.state === 'ROTATE_2' || this.state === 'FINAL') {
            let t = this.state === 'FINAL' ? 1 : this.easeOut(this.progress);
            currentNormal = this.lerp(this.n1, this.n2, t);
        }

        // Draw Plane
        this.drawPlane(currentNormal);

        // Draw Edges/Face
        if (this.state === 'PAUSE_2' || this.state === 'ROTATE_2' || this.state === 'FINAL' || (this.state === 'ROTATE_1' && this.progress > 0.9)) {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[0].x, projected[0].y);
            this.ctx.lineTo(projected[1].x, projected[1].y);
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        if (this.state === 'FINAL') {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[1].x, projected[1].y);
            this.ctx.lineTo(projected[2].x, projected[2].y);
            this.ctx.lineTo(projected[0].x, projected[0].y);
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
            this.ctx.fill();
        }

        // Draw Points
        projected.forEach((pr, i) => {
            this.ctx.beginPath();
            this.ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);

            let active = false;
            if (i === 0 && this.state !== 'DESCEND') active = true;
            if (i === 1 && (['PAUSE_2', 'ROTATE_2', 'FINAL'].includes(this.state) || (this.state === 'ROTATE_1' && this.progress > 0.8))) active = true;
            if (i === 2 && this.state === 'FINAL') active = true;

            this.ctx.fillStyle = active ? '#e74c3c' : '#bdc3c7'; // Grey out non-active
            this.ctx.fill();

            this.ctx.fillStyle = '#555';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(this.p[i].label, pr.x + 8, pr.y);
        });

        // Status Text
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        let txt = "";
        if (this.state === 'DESCEND') txt = "1. Το επίπεδο (σεντόνι) κατεβαίνει...";
        if (this.state === 'PAUSE_1' || this.state === 'ROTATE_1') txt = "2. Βρίσκει P1 και γέρνει προς P2...";
        if (this.state === 'PAUSE_2' || this.state === 'ROTATE_2') txt = "3. Βρίσκει P2 (Ακμή) και γυρνάει προς P3...";
        if (this.state === 'FINAL') txt = "4. Βρήκε και το P3 -> Πρώτη Έδρα!";
        this.ctx.fillText(txt, 10, this.canvas.height - 20);
    }

    easeOut(t) { return t * (2 - t); }

    drawPlane(normal) {
        // Plane passing through P1
        let center = (this.state === 'DESCEND') ? { x: 0, y: 0, z: this.planeZ } : this.p[0];

        let ref = (Math.abs(normal.y) > 0.9) ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
        let u_raw = this.cross(normal, ref);
        let u = this.normalize(u_raw);
        let v_raw = this.cross(normal, u);
        let v = this.normalize(v_raw);

        const size = 220;

        // Corners
        const corners = [
            { x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }
        ].map(m => {
            return {
                x: center.x + (u.x * m.x * size) + (v.x * m.y * size),
                y: center.y + (u.y * m.x * size) + (v.y * m.y * size),
                z: center.z + (u.z * m.x * size) + (v.z * m.y * size)
            };
        });

        const proj = corners.map(p => this.project(p));

        this.ctx.beginPath();
        this.ctx.moveTo(proj[0].x, proj[0].y);
        this.ctx.lineTo(proj[1].x, proj[1].y);
        this.ctx.lineTo(proj[2].x, proj[2].y);
        this.ctx.lineTo(proj[3].x, proj[3].y);
        this.ctx.closePath();

        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
}

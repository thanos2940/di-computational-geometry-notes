class RidgeConceptSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.isAnimating = true;
        this.reset();
    }

    reset() {
        super.reset();
        this.cameraDist = 600;
        this.rotY = -0.7;
        this.rotX = 0.4;

        // Core Points - Varied for non-identical faces
        this.p = [
            { x: -50, y: 30, z: -30, label: 'p1' },
            { x: 50, y: 30, z: -30, label: 'p2' },
            { x: 0, y: 30, z: 70, label: 'p3' },
            { x: 100, y: -20, z: 120, label: 'A' },  // Far and low (Large face)
            { x: -40, y: -90, z: 40, label: 'B' },   // Deep and narrow (Narrow face)
            { x: -90, y: -10, z: 60, label: 'C' }
        ];

        this.state = 'SCAN_1';
        this.progress = 0;
        this.speed = 0.0035;
        this.pauseTimer = 0;

        this.animate();
    }

    // Rodrigues' rotation formula: rotates point 'v' around axis (p1->p2) by 'angle'
    rotateAroundAxis(v, p1, p2, angle) {
        let axis = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
        let len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
        let k = { x: axis.x / len, y: axis.y / len, z: axis.z / len }; // normalized axis

        let cos = Math.cos(angle);
        let sin = Math.sin(angle);

        // Relative point
        let r = { x: v.x - p1.x, y: v.y - p1.y, z: v.z - p1.z };

        // v_rot = r*cos + (k x r)*sin + k*(k . r)*(1 - cos)
        let k_cross_r = {
            x: k.y * r.z - k.z * r.y,
            y: k.z * r.x - k.x * r.z,
            z: k.x * r.y - k.y * r.x
        };
        let k_dot_r = k.x * r.x + k.y * r.y + k.z * r.z;

        return {
            x: p1.x + r.x * cos + k_cross_r.x * sin + k.x * k_dot_r * (1 - cos),
            y: p1.y + r.y * cos + k_cross_r.y * sin + k.y * k_dot_r * (1 - cos),
            z: p1.z + r.z * cos + k_cross_r.z * sin + k.z * k_dot_r * (1 - cos)
        };
    }

    animate() {
        if (!this.isAnimating) return;

        if (this.state === 'SCAN_1') {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 1;
                this.state = 'FOUND_1';
                this.pauseTimer = 120;
            }
        } else if (this.state === 'FOUND_1') {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.state = 'SCAN_2';
                this.progress = 0;
            }
        } else if (this.state === 'SCAN_2') {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 1;
                this.state = 'FOUND_2';
                this.pauseTimer = 150;
            }
        } else if (this.state === 'FOUND_2') {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) {
                this.state = 'RESET';
            }
        } else if (this.state === 'RESET') {
            this.progress -= 0.02;
            if (this.progress <= 0) {
                this.progress = 0;
                this.state = 'SCAN_1';
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

        const drawTriangle = (i1, i2, i3, fill, stroke) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[i1].x, projected[i1].y);
            this.ctx.lineTo(projected[i2].x, projected[i2].y);
            this.ctx.lineTo(projected[i3].x, projected[i3].y);
            this.ctx.closePath();
            this.ctx.fillStyle = fill;
            this.ctx.fill();
            if (stroke) {
                this.ctx.strokeStyle = stroke;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        };

        const drawEdge = (i1, i2, color, width = 1) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[i1].x, projected[i1].y);
            this.ctx.lineTo(projected[i2].x, projected[i2].y);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.stroke();
        };

        const drawPoint = (i, color, size = 4) => {
            const pr = projected[i];
            this.ctx.beginPath();
            this.ctx.arc(pr.x, pr.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.fillStyle = '#333';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(this.p[i].label, pr.x + 8, pr.y);
        };

        // 1. Static: Initial Face
        drawTriangle(0, 1, 2, 'rgba(46, 204, 113, 0.05)', '#27ae60');

        // 2. Step 1 Results
        if (this.state !== 'SCAN_1') {
            drawTriangle(1, 2, 3, 'rgba(46, 204, 113, 0.15)', '#27ae60');
        }
        // 3. Step 2 Results
        if (this.state === 'FOUND_2' || this.state === 'RESET') {
            drawTriangle(2, 3, 4, 'rgba(46, 204, 113, 0.15)', '#27ae60');
        }

        // 4. Scanning Logic (Large Plane Quad)
        let ridgeAxis, startPlanePoint, targetPoint;
        let scanIndices = [];

        if (this.state === 'SCAN_1' || this.state === 'FOUND_1') {
            ridgeAxis = [this.p[1], this.p[2]];
            targetPoint = this.p[3];
            scanIndices = [1, 2];
            let totalAngle = 3.2; // Large angle to sweep from the back
            // FLIP SIGN: Approach from the other side
            const scanTarget = this.rotateAroundAxis(targetPoint, ridgeAxis[0], ridgeAxis[1], (1 - this.progress) * totalAngle);

            // Construct large Quad using scan direction - REPRESENTING HALF-PLANE
            const dir = { x: scanTarget.x - ridgeAxis[0].x, y: scanTarget.y - ridgeAxis[0].y, z: scanTarget.z - ridgeAxis[0].z };
            const rLen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
            const normDir = { x: dir.x / rLen, y: dir.y / rLen, z: dir.z / rLen };

            // Axis vector of the ridge
            const axisV = { x: ridgeAxis[1].x - ridgeAxis[0].x, y: ridgeAxis[1].y - ridgeAxis[0].y, z: ridgeAxis[1].z - ridgeAxis[0].z };
            const aLen = Math.sqrt(axisV.x * axisV.x + axisV.y * axisV.y + axisV.z * axisV.z);
            const normAxis = { x: axisV.x / aLen, y: axisV.y / aLen, z: axisV.z / aLen };

            // Half-plane vertices: 
            // Extend the ridge axis "infinitely" in both directions for the base of the plane
            const planeWidth = 200;
            const planeDepth = 300;

            const q1 = { x: ridgeAxis[0].x - normAxis.x * planeWidth, y: ridgeAxis[0].y - normAxis.y * planeWidth, z: ridgeAxis[0].z - normAxis.z * planeWidth };
            const q2 = { x: ridgeAxis[1].x + normAxis.x * planeWidth, y: ridgeAxis[1].y + normAxis.y * planeWidth, z: ridgeAxis[1].z + normAxis.z * planeWidth };

            // Sweep "outward"
            const q3 = { x: q2.x + normDir.x * planeDepth, y: q2.y + normDir.y * planeDepth, z: q2.z + normDir.z * planeDepth };
            const q4 = { x: q1.x + normDir.x * planeDepth, y: q1.y + normDir.y * planeDepth, z: q1.z + normDir.z * planeDepth };

            const projQ = [this.project(q1), this.project(q2), this.project(q3), this.project(q4)];

            this.ctx.beginPath();
            this.ctx.moveTo(projQ[0].x, projQ[0].y);
            this.ctx.lineTo(projQ[1].x, projQ[1].y);
            this.ctx.lineTo(projQ[2].x, projQ[2].y);
            this.ctx.lineTo(projQ[3].x, projQ[3].y);
            this.ctx.closePath();

            this.ctx.fillStyle = (this.state.startsWith('FOUND')) ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = (this.state.startsWith('FOUND')) ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Highlight Ridge (The actual axis)
            drawEdge(scanIndices[0], scanIndices[1], '#8e44ad', 4);
        } else if (this.state === 'SCAN_2' || this.state === 'FOUND_2') {
            ridgeAxis = [this.p[2], this.p[3]];
            targetPoint = this.p[4];
            scanIndices = [2, 3];
            let totalAngle = 1.0;

            const scanTarget = this.rotateAroundAxis(targetPoint, ridgeAxis[0], ridgeAxis[1], -(1 - this.progress) * totalAngle);
            const dir = { x: scanTarget.x - ridgeAxis[0].x, y: scanTarget.y - ridgeAxis[0].y, z: scanTarget.z - ridgeAxis[0].z };
            const rLen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
            const normDir = { x: dir.x / rLen, y: dir.y / rLen, z: dir.z / rLen };

            const axisV = { x: ridgeAxis[1].x - ridgeAxis[0].x, y: ridgeAxis[1].y - ridgeAxis[0].y, z: ridgeAxis[1].z - ridgeAxis[0].z };
            const aLen = Math.sqrt(axisV.x * axisV.x + axisV.y * axisV.y + axisV.z * axisV.z);
            const normAxis = { x: axisV.x / aLen, y: axisV.y / aLen, z: axisV.z / aLen };

            const planeWidth = 200;
            const planeDepth = 300;

            const q1 = { x: ridgeAxis[0].x - normAxis.x * planeWidth, y: ridgeAxis[0].y - normAxis.y * planeWidth, z: ridgeAxis[0].z - normAxis.z * planeWidth };
            const q2 = { x: ridgeAxis[1].x + normAxis.x * planeWidth, y: ridgeAxis[1].y + normAxis.y * planeWidth, z: ridgeAxis[1].z + normAxis.z * planeWidth };
            const q3 = { x: q2.x + normDir.x * planeDepth, y: q2.y + normDir.y * planeDepth, z: q2.z + normDir.z * planeDepth };
            const q4 = { x: q1.x + normDir.x * planeDepth, y: q1.y + normDir.y * planeDepth, z: q1.z + normDir.z * planeDepth };

            const projQ = [this.project(q1), this.project(q2), this.project(q3), this.project(q4)];

            this.ctx.beginPath();
            this.ctx.moveTo(projQ[0].x, projQ[0].y);
            this.ctx.lineTo(projQ[1].x, projQ[1].y);
            this.ctx.lineTo(projQ[2].x, projQ[2].y);
            this.ctx.lineTo(projQ[3].x, projQ[3].y);
            this.ctx.closePath();

            this.ctx.fillStyle = (this.state.startsWith('FOUND')) ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = (this.state.startsWith('FOUND')) ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Highlight Ridge
            drawEdge(scanIndices[0], scanIndices[1], '#8e44ad', 4);
        }

        // 5. Points
        this.p.forEach((_, i) => drawPoint(i, (i > 2 && i < 5) ? '#e74c3c' : '#7f8c8d'));

        // 6. Labels/Status
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = '#8e44ad';
        if (scanIndices.length > 0) {
            const midX = (projected[scanIndices[0]].x + projected[scanIndices[1]].x) / 2;
            const midY = (projected[scanIndices[0]].y + projected[scanIndices[1]].y) / 2;
            this.ctx.fillText(`Ράχη ${this.state.includes('1') ? '1' : '2'}`, midX + 10, midY - 10);
        }

        this.ctx.font = 'italic 13px Arial';
        this.ctx.fillStyle = '#666';
        let statusText = "Σάρωση...";
        if (this.state === 'FOUND_1') statusText = "Βρέθηκε το Α! Νέα Έδρα και νέα Ράχη.";
        if (this.state === 'FOUND_2') statusText = "Βρέθηκε το Β! Ο αλγόριθμος συνεχίζει...";
        this.ctx.fillText(statusText, 10, this.canvas.height - 15);
    }
}

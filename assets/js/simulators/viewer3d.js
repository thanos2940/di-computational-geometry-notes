class Viewer3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.points = []; // {x, y, z}
        this.edges = []; // [i, j]
        this.faces = []; // [i, j, k, ...] indices

        this.rotX = 0;
        this.rotY = 0;
        this.cameraDist = 400;

        this.dragging = false;
        this.lastMouse = { x: 0, y: 0 };

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
        this.rotX = 0;
        this.rotY = 0;
        this.render();
    }

    setCube() {
        this.points = [
            { x: -50, y: -50, z: -50 }, { x: 50, y: -50, z: -50 },
            { x: 50, y: 50, z: -50 }, { x: -50, y: 50, z: -50 },
            { x: -50, y: -50, z: 50 }, { x: 50, y: -50, z: 50 },
            { x: 50, y: 50, z: 50 }, { x: -50, y: 50, z: 50 }
        ];
        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // Back face
            [4, 5], [5, 6], [6, 7], [7, 4], // Front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting edges
        ];
        this.faces = []; // Optional for simple wireframe
    }

    // Project 3D point to 2D
    project(p) {
        // Simple rotation matrix application
        // Rotate Y
        let x = p.x * Math.cos(this.rotY) - p.z * Math.sin(this.rotY);
        let z = p.x * Math.sin(this.rotY) + p.z * Math.cos(this.rotY);

        // Rotate X
        let y = p.y * Math.cos(this.rotX) - z * Math.sin(this.rotX);
        z = p.y * Math.sin(this.rotX) + z * Math.cos(this.rotX);

        // Perspective projection
        const scale = this.cameraDist / (this.cameraDist + z);
        const px = x * scale + this.canvas.width / 2;
        const py = y * scale + this.canvas.height / 2;

        return { x: px, y: py, z: z }; // return z for sorting if needed
    }

    onDown(e) {
        this.dragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    onMove(e) {
        if (this.dragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.rotY += dx * 0.01;
            this.rotX += dy * 0.01;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.render();
        }
    }

    onUp() {
        this.dragging = false;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const projected = this.points.map(p => this.project(p));

        // Draw Edges
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.edges.forEach(e => {
            const p1 = projected[e[0]];
            const p2 = projected[e[1]];
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
        });
        this.ctx.stroke();

        // Draw Points
        projected.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fill();
        });

        // Optional: Draw Faces (Painter's algo)
        // If faces defined, sort by avg Z and draw.
        // For wireframe only, skip.
    }

    // Helper to generate random cloud in sphere
    generateRandom(n = 20) {
        this.points = [];
        this.edges = [];
        this.faces = [];
        for (let i = 0; i < n; i++) {
            // rejection sampling for sphere
            while (true) {
                const x = (Math.random() - 0.5) * 200;
                const y = (Math.random() - 0.5) * 200;
                const z = (Math.random() - 0.5) * 200;
                if (x * x + y * y + z * z < 10000) {
                    this.points.push({ x, y, z });
                    break;
                }
            }
        }
        this.render();
    }
}

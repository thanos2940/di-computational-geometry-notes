class DualitySimulator extends DelaunaySimulator {
    constructor(canvasId) {
        super(canvasId);
        this.chkVoronoi = document.getElementById('show-voronoi');
        this.chkDelaunay = document.getElementById('show-delaunay');
        this.circumcenters = [];
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Compute circumcenters for internal triangles
        this.circumcenters = this.triangles
            .filter(t => !t.some(p => p.isSuper))
            .map(t => ({
                center: this.getCircumcenter(t[0], t[1], t[2]),
                triangle: t
            }))
            .filter(x => x.center);

        // Render Voronoi (Red)
        if (!this.chkVoronoi || this.chkVoronoi.checked) {
            this.renderVoronoi();
        }

        // Render Delaunay (Blue)
        if (!this.chkDelaunay || this.chkDelaunay.checked) {
            this.renderDelaunay();
        }

        // Draw Points with labels
        this.points.forEach((p, i) => {
            if (p.isSuper) return;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`P${p.id !== undefined ? p.id : i - 3}`, p.x + 9, p.y - 9);
        });

        // Status
        const userPts = this.points.filter(p => !p.isSuper).length;
        if (this.statusEl) {
            this.statusEl.innerHTML = `<strong>${userPts}</strong> σημεία | <span style="color:#3498db">Μπλε: Delaunay</span> | <span style="color:#e74c3c">Κόκκινο: Voronoi</span>`;
        }
    }

    renderDelaunay() {
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 1.5;

        this.triangles.forEach(t => {
            const hasSuper = t.some(p => p.isSuper);
            if (hasSuper) return;

            this.ctx.beginPath();
            this.ctx.moveTo(t[0].x, t[0].y);
            this.ctx.lineTo(t[1].x, t[1].y);
            this.ctx.lineTo(t[2].x, t[2].y);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.05)';
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    renderVoronoi() {
        // Draw Voronoi edges: connect circumcenters of adjacent triangles
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;

        const internalTriangles = this.triangles.filter(t => !t.some(p => p.isSuper));

        for (let i = 0; i < internalTriangles.length; i++) {
            const t1 = internalTriangles[i];
            const c1 = this.getCircumcenter(t1[0], t1[1], t1[2]);
            if (!c1) continue;

            for (let j = i + 1; j < internalTriangles.length; j++) {
                const t2 = internalTriangles[j];

                // Check if they share exactly 2 vertices
                let shared = 0;
                if (t2.includes(t1[0])) shared++;
                if (t2.includes(t1[1])) shared++;
                if (t2.includes(t1[2])) shared++;

                if (shared === 2) {
                    const c2 = this.getCircumcenter(t2[0], t2[1], t2[2]);
                    if (!c2) continue;

                    this.ctx.beginPath();
                    this.ctx.moveTo(c1.x, c1.y);
                    this.ctx.lineTo(c2.x, c2.y);
                    this.ctx.stroke();
                }
            }
        }

        // Draw Voronoi vertices (circumcenters)
        this.circumcenters.forEach(item => {
            const c = item.center;
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#c0392b';
            this.ctx.fill();
        });
    }

    getCircumcenter(p1, p2, p3) {
        const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
        if (Math.abs(D) < 0.0001) return null;

        const Ux = ((p1.x ** 2 + p1.y ** 2) * (p2.y - p3.y) + (p2.x ** 2 + p2.y ** 2) * (p3.y - p1.y) + (p3.x ** 2 + p3.y ** 2) * (p1.y - p2.y)) / D;
        const Uy = ((p1.x ** 2 + p1.y ** 2) * (p3.x - p2.x) + (p2.x ** 2 + p2.y ** 2) * (p1.x - p3.x) + (p3.x ** 2 + p3.y ** 2) * (p2.x - p1.x)) / D;
        return { x: Ux, y: Uy };
    }
}

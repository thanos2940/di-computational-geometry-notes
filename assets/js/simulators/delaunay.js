class DelaunaySimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');
        this.points = [];
        this.triangles = [];
        this.userPointCount = 0;

        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onClick(e));

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    reset() {
        this.points = [];
        this.triangles = [];
        this.userPointCount = 0;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Super Triangle far outside
        const superA = new Point(w / 2, -h * 2);
        const superB = new Point(-w * 2, h * 3);
        const superC = new Point(w * 3, h * 3);
        superA.isSuper = true;
        superB.isSuper = true;
        superC.isSuper = true;

        this.points.push(superA, superB, superC);
        this.triangles.push([superA, superB, superC]);

        if (this.statusEl) {
            this.statusEl.innerHTML = 'Κάντε κλικ για να προσθέσετε σημεία. Η τριγωνοποίηση ενημερώνεται αυτόματα.';
        }
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Point(e.clientX - rect.left, e.clientY - rect.top);
    }

    onClick(e) {
        const p = this.getMousePos(e);
        p.id = this.userPointCount++;
        this.addPoint(p);
    }

    addPoint(p) {
        this.points.push(p);

        let targetTriIndex = -1;
        for (let i = 0; i < this.triangles.length; i++) {
            const tri = this.triangles[i];
            if (inTriangle(tri[0], tri[1], tri[2], p)) {
                targetTriIndex = i;
                break;
            }
        }

        if (targetTriIndex === -1) {
            console.log("Point outside super triangle");
            return;
        }

        const t = this.triangles[targetTriIndex];
        const [a, b, c] = t;

        this.triangles.splice(targetTriIndex, 1);

        const t1 = [a, b, p];
        const t2 = [b, c, p];
        const t3 = [c, a, p];

        this.triangles.push(t1, t2, t3);

        this.legalizeEdge(p, a, b);
        this.legalizeEdge(p, b, c);
        this.legalizeEdge(p, c, a);

        this.render();
    }

    legalizeEdge(pr, pi, pj) {
        for (let i = 0; i < this.triangles.length; i++) {
            const t = this.triangles[i];

            const hasPi = t.includes(pi);
            const hasPj = t.includes(pj);

            if (hasPi && hasPj) {
                const pk = t.find(v => v !== pi && v !== pj);
                if (pk === pr) continue;

                if (this.isIllegal(pi, pj, pk, pr)) {
                    this.triangles.splice(i, 1);

                    const idx2 = this.findTriangleIndex(pi, pj, pr);
                    if (idx2 !== -1) this.triangles.splice(idx2, 1);

                    this.triangles.push([pi, pk, pr]);
                    this.triangles.push([pj, pk, pr]);

                    this.legalizeEdge(pr, pi, pk);
                    this.legalizeEdge(pr, pj, pk);

                    return;
                }
            }
        }
    }

    findTriangleIndex(p1, p2, p3) {
        for (let i = 0; i < this.triangles.length; i++) {
            const t = this.triangles[i];
            if (t.includes(p1) && t.includes(p2) && t.includes(p3)) return i;
        }
        return -1;
    }

    isIllegal(a, b, c, d) {
        const adx = a.x - d.x; const ady = a.y - d.y;
        const bdx = b.x - d.x; const bdy = b.y - d.y;
        const cdx = c.x - d.x; const cdy = c.y - d.y;

        const abdet = adx * bdy - bdx * ady;
        const bcdet = bdx * cdy - cdx * bdy;
        const cadet = cdx * ady - adx * cdy;

        const alift = adx * adx + ady * ady;
        const blift = bdx * bdx + bdy * bdy;
        const clift = cdx * cdx + cdy * cdy;

        const det = alift * bcdet + blift * cadet + clift * abdet;

        const orient = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

        if (orient >= 0) return det > 0;
        else return det < 0;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Triangles (hide super edges)
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 1.5;

        this.triangles.forEach(t => {
            // Skip triangles with any super vertex for cleaner output
            const hasSuper = t.some(p => p.isSuper);
            if (hasSuper) return;

            this.ctx.beginPath();
            this.ctx.moveTo(t[0].x, t[0].y);
            this.ctx.lineTo(t[1].x, t[1].y);
            this.ctx.lineTo(t[2].x, t[2].y);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Draw Points with labels (exclude super)
        this.points.forEach((p, i) => {
            if (p.isSuper) return;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`P${p.id !== undefined ? p.id : i - 3}`, p.x + 8, p.y - 8);
        });

        // Update status
        const userPts = this.points.filter(p => !p.isSuper).length;
        const triCount = this.triangles.filter(t => !t.some(p => p.isSuper)).length;
        if (this.statusEl) {
            this.statusEl.innerHTML = `<strong>${userPts}</strong> σημεία | <strong>${triCount}</strong> τρίγωνα`;
        }
    }
}

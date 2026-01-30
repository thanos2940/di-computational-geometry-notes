class GiftWrapping3DSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.statusEl = document.getElementById('sim-status');
        this.btnStep = document.getElementById('btn-step');

        this.openEdges = []; // Queue of active edges [u, v] (ordered)
        this.processedEdges = new Set(); // Strings "u-v"
    }

    reset() {
        super.reset();
        this.resetPoints();
    }

    resetPoints() {
        this.generateRandom(15);
        this.points.forEach(p => { p.x += 0.01; });
        this.edges = [];
        this.faces = [];
        this.openEdges = [];
        this.currentRidge = null;
        this.processedEdges.clear();
        this.btnStep.disabled = false;
        this.btnStep.innerHTML = '<i class="fas fa-play"></i> Αναζήτηση ΑΛΛΗ-ΕΔΡΑ';

        // Step 1: Find Initial Face
        let p1 = 0;
        for (let i = 1; i < this.points.length; i++) {
            if (this.points[i].z < this.points[p1].z) p1 = i;
        }

        let initFace = null;
        this.hullSign = 0;

        outer:
        for (let i = 0; i < this.points.length; i++) {
            if (i === p1) continue;
            for (let j = i + 1; j < this.points.length; j++) {
                if (j === p1) continue;

                let side = 0;
                let valid = true;

                for (let k = 0; k < this.points.length; k++) {
                    if (k === p1 || k === i || k === j) continue;
                    const vol = orient3d(this.points[p1], this.points[i], this.points[j], this.points[k]);
                    if (Math.abs(vol) < 1e-4) continue;

                    const s = Math.sign(vol);
                    if (side === 0) side = s;
                    else if (side !== s) {
                        valid = false;
                        break;
                    }
                }

                if (valid && side !== 0) {
                    initFace = [p1, i, j];
                    this.hullSign = side;
                    break outer;
                }
            }
        }

        if (initFace) {
            this.faces.push(initFace);
            const [a, b, c] = initFace;
            this.addOpenEdge(a, b);
            this.addOpenEdge(b, c);
            this.addOpenEdge(c, a);

            this.statusEl.innerHTML = "Βρέθηκε η 1η Έδρα. Η ΡΑΧ (PAX) έχει 3 ράχες.";
        } else {
            this.statusEl.innerHTML = "Σφάλμα κατά την αρχικοποίηση.";
        }

        this.render();
    }

    addOpenEdge(u, v) {
        if (this.processedEdges.has(`${v}-${u}`)) return;
        if (this.processedEdges.has(`${u}-${v}`)) return;
        this.openEdges.push([u, v]);
        this.processedEdges.add(`${u}-${v}`);
    }

    nextStep() {
        if (this.openEdges.length === 0) {
            this.currentRidge = null;
            this.statusEl.innerHTML = "Ολοκληρώθηκε! Το ΚΠ3 κατασκευάστηκε.";
            this.btnStep.disabled = true;
            this.render();
            return;
        }

        // Pop Ridge
        const [u, v] = this.openEdges.shift();
        this.currentRidge = [u, v];

        let bestK = -1;
        for (let k = 0; k < this.points.length; k++) {
            if (k === u || k === v) continue;

            let valid = true;
            for (let m = 0; m < this.points.length; m++) {
                if (m === u || m === v || m === k) continue;
                const vol = orient3d(this.points[v], this.points[u], this.points[k], this.points[m]);
                if (Math.abs(vol) < 1e-4) continue;

                if (Math.sign(vol) !== this.hullSign) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                bestK = k;
                break;
            }
        }

        if (bestK !== -1) {
            this.faces.push([v, u, bestK]);
            this.addOpenEdge(u, bestK);
            this.addOpenEdge(bestK, v);
            this.statusEl.innerHTML = `ΑΛΛΗ-ΕΔΡΑ για τη Ράχη (${u},${v}): Βρέθηκε το σημείο V${bestK}.`;
        }

        this.render();
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const projected = this.points.map(p => this.project(p));

        // Draw solid faces
        this.faces.forEach((f, i) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[f[0]].x, projected[f[0]].y);
            this.ctx.lineTo(projected[f[1]].x, projected[f[1]].y);
            this.ctx.lineTo(projected[f[2]].x, projected[f[2]].y);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(46, 204, 113, 0.3)'; // Greenish for known faces
            this.ctx.fill();
            this.ctx.strokeStyle = '#27ae60';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });

        // Current Ridge (Highlight)
        if (this.currentRidge) {
            const [u, v] = this.currentRidge;
            this.ctx.beginPath();
            this.ctx.moveTo(projected[u].x, projected[u].y);
            this.ctx.lineTo(projected[v].x, projected[v].y);
            this.ctx.strokeStyle = '#8e44ad'; // Purple for current Ridge
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        // Open Edges (PAX)
        if (this.openEdges) {
            this.openEdges.forEach(e => {
                const [u, v] = e;
                this.ctx.beginPath();
                this.ctx.moveTo(projected[u].x, projected[u].y);
                this.ctx.lineTo(projected[v].x, projected[v].y);
                this.ctx.strokeStyle = '#e67e22'; // Orange for PAX ridges
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            });
        }

        // Points
        this.points.forEach((p, i) => {
            const proj = projected[i];
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`V${i}`, proj.x + 5, proj.y - 5);
        });
    }

    rebuildEdges() {
        // Visualization only
        this.edges = [];
        this.faces.forEach(f => {
            this.edges.push([f[0], f[1]]);
            this.edges.push([f[1], f[2]]);
            this.edges.push([f[2], f[0]]);
        });
        // Remove duplicates not needed for wireframe visual, but nice.
    }
}

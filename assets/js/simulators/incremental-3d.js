class Incremental3DSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.statusEl = document.getElementById('sim-status');
        this.addBtn = document.getElementById('btn-add');
        this.phase = 'READY'; // READY, PREVIEW
        this.stagedData = null;
        this.reset();
    }

    reset() {
        super.reset();
        this.points = [
            { x: 50, y: 50, z: 50 },
            { x: -50, y: -50, z: 50 },
            { x: -50, y: 50, z: -50 },
            { x: 50, y: -50, z: -50 }
        ];

        // Faces oriented outwards
        this.faces = [
            [0, 2, 1], // Bottom-ish
            [0, 1, 3],
            [0, 3, 2],
            [1, 2, 3]
        ];

        this.phase = 'READY';
        this.stagedData = null;
        if (this.addBtn) this.addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Επόμενο Σημείο';

        this.rebuildEdges();
        this.statusEl.innerHTML = "Αρχικό Τετράεδρο.";
    }

    rebuildEdges() {
        const edgeSet = new Set();
        this.edges = [];
        this.faces.forEach(f => {
            const add = (p1, p2) => {
                const k = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
                if (!edgeSet.has(k)) {
                    edgeSet.add(k);
                    this.edges.push([p1, p2]);
                }
            };
            add(f[0], f[1]); add(f[1], f[2]); add(f[2], f[0]);
        });
        this.render();
    }

    addPoint() {
        if (this.phase === 'READY') {
            this.previewPoint();
        } else {
            this.commitPoint();
        }
    }

    previewPoint() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 120 + Math.random() * 40;

        const p = {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };

        // Determine visibility
        const visibility = this.faces.map(f => {
            const volOrigin = orient3d(this.points[f[0]], this.points[f[1]], this.points[f[2]], { x: 0, y: 0, z: 0 });
            const volP = orient3d(this.points[f[0]], this.points[f[1]], this.points[f[2]], p);
            // Opposite signs wrt Origin means P is "outside"
            return (volP > 0) !== (volOrigin > 0);
        });

        if (!visibility.includes(true)) {
            this.statusEl.innerHTML = "Το σημείο είναι εσωτερικό. Δοκιμάστε ξανά.";
            return;
        }

        // Find Horizon Edges
        const edgeCounts = {};
        this.faces.forEach((f, i) => {
            if (visibility[i]) {
                const keys = [`${Math.min(f[0], f[1])}-${Math.max(f[0], f[1])}`,
                `${Math.min(f[1], f[2])}-${Math.max(f[1], f[2])}`,
                `${Math.min(f[2], f[0])}-${Math.max(f[2], f[0])}`];
                keys.forEach((k, idx) => {
                    const pair = idx === 0 ? [f[0], f[1]] : (idx === 1 ? [f[1], f[2]] : [f[2], f[0]]);
                    if (!edgeCounts[k]) edgeCounts[k] = { count: 0, u: pair[0], v: pair[1] };
                    edgeCounts[k].count++;
                });
            }
        });

        const horizonEdges = [];
        for (const k in edgeCounts) {
            if (edgeCounts[k].count === 1) horizonEdges.push([edgeCounts[k].u, edgeCounts[k].v]);
        }

        this.stagedData = { p, visibility, horizonEdges };
        this.phase = 'PREVIEW';
        this.addBtn.innerHTML = '<i class="fas fa-check-circle"></i> Ενσωμάτωση Σημείου';
        this.statusEl.innerHTML = `Φάση 1: Εντοπισμός Ορατών Εδρών (Κόκκινες) και Ορίζοντα (Βυσσινί).`;
        this.render();
    }

    commitPoint() {
        const { p, visibility, horizonEdges } = this.stagedData;
        this.points.push(p);
        const pIdx = this.points.length - 1;

        const newFaces = [];
        this.faces.forEach((f, i) => {
            if (!visibility[i]) newFaces.push(f);
        });

        const refSign = Math.sign(orient3d(this.points[newFaces[0][0]], this.points[newFaces[0][1]], this.points[newFaces[0][2]], { x: 0, y: 0, z: 0 }));

        horizonEdges.forEach(e => {
            const f1 = [e[0], e[1], pIdx];
            const v1 = orient3d(this.points[e[0]], this.points[e[1]], this.points[pIdx], { x: 0, y: 0, z: 0 });
            if (Math.sign(v1) === refSign) newFaces.push(f1);
            else newFaces.push([e[1], e[0], pIdx]);
        });

        this.faces = newFaces;
        this.phase = 'READY';
        this.stagedData = null;
        this.addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Επόμενο Σημείο';
        this.statusEl.innerHTML = `Φάση 2: Ολοκληρώθηκε. Προστέθηκε η κορυφή V${pIdx}.`;
        this.rebuildEdges();
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const allPoints = [...this.points];
        if (this.stagedData) allPoints.push(this.stagedData.p);
        const projected = allPoints.map(p => this.project(p));

        // Painter's Algorithm for solid faces
        const faceData = this.faces.map((f, i) => {
            const z = (projected[f[0]].z + projected[f[1]].z + projected[f[2]].z) / 3;
            return { f, z, i };
        });
        faceData.sort((a, b) => b.z - a.z); // Back to front

        faceData.forEach(d => {
            const f = d.f;
            this.ctx.beginPath();
            this.ctx.moveTo(projected[f[0]].x, projected[f[0]].y);
            this.ctx.lineTo(projected[f[1]].x, projected[f[1]].y);
            this.ctx.lineTo(projected[f[2]].x, projected[f[2]].y);
            this.ctx.closePath();

            let fill = 'rgba(52, 152, 219, 0.4)'; // Blue
            let stroke = '#2980b9';
            if (this.stagedData && this.stagedData.visibility[d.i]) {
                fill = 'rgba(231, 76, 60, 0.5)'; // Red for visible
                stroke = '#c0392b';
            }

            this.ctx.fillStyle = fill;
            this.ctx.fill();
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });

        // Horizon Edges
        if (this.stagedData) {
            this.ctx.setLineDash([]);
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = '#8e44ad'; // Crimson-ish Purple for Horizon
            this.stagedData.horizonEdges.forEach(e => {
                const p1 = projected[e[0]];
                const p2 = projected[e[1]];
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            });

            // Draw Point P
            const p = projected[projected.length - 1];
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText('P (νέο)', p.x + 12, p.y + 4);
        }

        // Draw existing points for labels
        this.points.forEach((p, i) => {
            const proj = projected[i];
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#34495e';
            this.ctx.fill();
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`V${i}`, proj.x + 5, proj.y - 5);
        });
    }
}

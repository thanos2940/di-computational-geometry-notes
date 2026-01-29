class GiftWrapping3DSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.statusEl = document.getElementById('sim-status');
        this.btnStep = document.getElementById('btn-step');

        this.openEdges = []; // Queue of active edges [u, v] (ordered)
        this.processedEdges = new Set(); // Strings "u-v"
    }

    resetPoints() {
        this.generateRandom(15);
        this.points.forEach(p => { p.x += 0.01; }); // avoidance of exact degeneracies
        this.edges = [];
        this.faces = [];
        this.openEdges = [];
        this.processedEdges.clear();
        this.btnStep.disabled = false; // Fix: Re-enable button

        // Step 1: Find Initial Face
        // Find min Z point
        let p1 = 0;
        for (let i = 1; i < this.points.length; i++) {
            if (this.points[i].z < this.points[p1].z) p1 = i;
        }

        let initFace = null;
        this.hullSign = 0; // Global Orientation Sign

        outer:
        for (let i = 0; i < this.points.length; i++) {
            if (i === p1) continue;
            for (let j = i + 1; j < this.points.length; j++) {
                if (j === p1) continue;

                // Check Plane (p1, i, j)
                let side = 0;
                let valid = true;

                for (let k = 0; k < this.points.length; k++) {
                    if (k === p1 || k === i || k === j) continue;
                    const vol = orient3d(this.points[p1], this.points[i], this.points[j], this.points[k]);
                    if (Math.abs(vol) < 1e-4) continue; // Coplanar

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
            this.rebuildEdges(); // Shows first face

            // Add edges to Open Queue
            const [a, b, c] = initFace;
            this.addOpenEdge(a, b);
            this.addOpenEdge(b, c);
            this.addOpenEdge(c, a);

            this.statusEl.innerHTML = "Βρέθηκε η 1η Έδρα (εκκίνηση). Πατήστε 'Επόμενη Έδρα'.";
        } else {
            this.statusEl.innerHTML = "Σφάλμα: Δεν βρέθηκε έδρα (εκφυλισμένη περίπτωση;)";
        }

        this.render();
    }

    addOpenEdge(u, v) {
        // If the reverse edge v-u was already processed (added to queue),
        // it means the adjacent face for that edge is already found (the one we just came from).
        // So this edge is internal and finished.
        if (this.processedEdges.has(`${v}-${u}`)) return;

        // Also check if we already added u-v (shouldn't happen with valid topology but good safety)
        if (this.processedEdges.has(`${u}-${v}`)) return;

        this.openEdges.push([u, v]);
        this.processedEdges.add(`${u}-${v}`);
    }

    nextStep() {
        if (this.openEdges.length === 0) {
            this.statusEl.innerHTML = "Ολοκληρώθηκε!";
            this.btnStep.disabled = true;
            return;
        }

        // Pop edge
        const [u, v] = this.openEdges.shift();

        // Search for point k that forms a valid face with edge v->u (reversing u->v)
        // AND satisfies the global Hull Sign (all points on same side).

        let bestK = -1;

        for (let k = 0; k < this.points.length; k++) {
            if (k === u || k === v) continue;

            // Check Face (v, u, k)
            let valid = true;

            for (let m = 0; m < this.points.length; m++) {
                if (m === u || m === v || m === k) continue;

                const vol = orient3d(this.points[v], this.points[u], this.points[k], this.points[m]);

                if (Math.abs(vol) < 1e-4) continue; // On plane

                // Points must be on the SAME side as the Global Hull Sign
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
            // New Face: v, u, bestK
            this.faces.push([v, u, bestK]);

            // Add new edges
            this.addOpenEdge(u, bestK);
            this.addOpenEdge(bestK, v);

            this.rebuildEdges();
            this.statusEl.innerHTML = `Προστέθηκε έδρα: ${u}-${v}-${bestK}. Σειρά: ${this.openEdges.length} ακμές.`;
        } else {
            // Should not happen for valid Convex Hull
            console.warn("Could not fold edge", u, v);
        }

        this.render();
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

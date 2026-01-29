class Incremental3DSimulator extends Viewer3D {
    constructor(canvasId) {
        super(canvasId);
        this.statusEl = document.getElementById('sim-status');
        this.reset();
    }

    reset() {
        super.reset();
        // Init Tetrahedron
        this.points = [
            { x: 40, y: 40, z: 40 },
            { x: -40, y: -40, z: 40 },
            { x: -40, y: 40, z: -40 },
            { x: 40, y: -40, z: -40 }
        ];

        // Faces oriented outwards
        // Need to check orientation.
        // Centroid is (0,0,0).
        // For face (0,1,2), normal should point away from (0,0,0).
        // orient3d(p0, p1, p2, origin) != orient3d(p0, p1, p2, p3)?
        // Let's ensure consistent CCW from outside.
        // Check face indices
        this.faces = [
            [0, 1, 2],
            [0, 3, 1],
            [0, 2, 3],
            [1, 3, 2]
        ];

        // Rebuild edges from faces
        this.rebuildEdges();

        this.statusEl.innerHTML = "Αρχικό Τετράεδρο.";
    }

    rebuildEdges() {
        // Collect unique edges from faces
        const edgeSet = new Set();
        this.edges = [];

        this.faces.forEach(f => {
            const [a, b, c] = f;
            const add = (p1, p2) => {
                const k = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
                if (!edgeSet.has(k)) {
                    edgeSet.add(k);
                    this.edges.push([p1, p2]);
                }
            };
            add(a, b); add(b, c); add(c, a);
        });

        this.render();
    }

    addPoint() {
        // Generate a point somewhat outside current hull
        // Random direction, large radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 100 + Math.random() * 50; // Outside existing (rad ~70)

        const p = {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };

        // Check visibility
        const visibleFaces = [];
        const horizon = [];

        // Store faces to remove indices? Hard with array mutation.
        // Create new face list.

        // First, check if point is inside? (No visible faces).
        // orient3d logic:
        // orient3d(a, b, c, p)
        // Need consistent orientation. Assumption: Faces oriented CCW from outside.
        // Then orient3d(a, b, c, p) < 0 implies p is "below" face (inside).
        // orient3d > 0 implies p "above" (visible).
        // Let's verify for tetra.
        // Face 0: (40,40,40), (-40,-40,40), (-40,40,-40).
        // Point (100,0,0) likely visible.

        let anyVisible = false;
        const visibility = this.faces.map(f => {
            const vol = orient3d(this.points[f[0]], this.points[f[1]], this.points[f[2]], p);
            // Heuristic for consistency:
            // Calculate signed volume of tetrahedron formed by face + origin (inside point).
            // volOrigin = orient3d(a, b, c, origin).
            // If volOrigin > 0, then 'normal' points 'in'.
            // If volOrigin < 0, then 'normal' points 'out'.
            // We want Normal Out. So we want volOrigin < 0;
            // If volOrigin > 0, swap b, c.

            // To be robust: Check orientation relative to centroid once.
            // But simple check:
            // Assuming current hull is convex and origin (0,0,0) is inside.
            // A face is visible if orient3d(a,b,c,p) has OPPOSITE sign to orient3d(a,b,c, origin).

            const volOrigin = orient3d(this.points[f[0]], this.points[f[1]], this.points[f[2]], { x: 0, y: 0, z: 0 });
            const volP = vol;

            // Visible if signs differ? 
            // If origin is "below", volOrigin < 0. P "above", volP > 0.
            // If signs differ -> Visible.

            // Wait, orient3d(a, b, c, d) returns determinant.
            // Volume is 1/6 det.
            // Signs indicate side.
            // Yes, if P and Origin are on opposite sides of face plane, face is visible.

            return Math.sign(volP) !== Math.sign(volOrigin);
        });

        if (!visibility.includes(true)) {
            this.statusEl.innerHTML = "Σημείο εσωτερικό (αγνοείται).";
            return;
        }

        // Point is valid, add it
        this.points.push(p);
        const pIdx = this.points.length - 1;

        // Find Horizon Edges
        // Horizon edge: Shared by 1 visible and 1 invisible face.
        // Iterate all edges of visible faces. Count occurrences.
        // If an edge appears in 2 visible faces -> internal to visible region -> remove.
        // If an edge appears in 1 visible face -> must obtain from 1 invisible -> Horizon.

        const edgeCounts = {}; // "min-max" -> {count, a, b}

        for (let i = 0; i < this.faces.length; i++) {
            if (visibility[i]) { // Facing P
                const f = this.faces[i];
                // Edges: 0-1, 1-2, 2-0
                const process = (idx1, idx2) => {
                    const u = Math.min(idx1, idx2);
                    const v = Math.max(idx1, idx2);
                    const key = `${u}-${v}`;
                    if (!edgeCounts[key]) edgeCounts[key] = { count: 0, u, v };
                    edgeCounts[key].count++;
                };
                process(f[0], f[1]);
                process(f[1], f[2]);
                process(f[2], f[0]);
            }
        }

        // Identify horizon
        const horizonEdges = [];
        for (const k in edgeCounts) {
            if (edgeCounts[k].count === 1) { // Shared with invisible
                horizonEdges.push([edgeCounts[k].u, edgeCounts[k].v]);
            }
        }

        // Construct New Faces
        const newFaces = [];

        // Keep invisible faces
        for (let i = 0; i < this.faces.length; i++) {
            if (!visibility[i]) {
                newFaces.push(this.faces[i]);
            }
        }

        // Create new faces from horizon to P
        horizonEdges.forEach(e => {
            // Need correct winding order?
            // (u, v, p). Winding must match neighbor.
            // Heuristic: Check against origin again?
            // Try (u, v, p). If orient(u, v, p, origin) same sign as orient(oldFace... origin), good?
            // Actually, we replaced a visible face. Old visible face had some orientation.
            // The new face must separate P from Origin? No, P is new vertex.
            // New face separates Hull from Outside. Origin is inside.
            // So orient(newFace, origin) must check out.
            // Let's assume (u, v, p) or (v, u, p).

            const f1 = [e[0], e[1], pIdx];
            const vol1 = orient3d(this.points[e[0]], this.points[e[1]], this.points[pIdx], { x: 0, y: 0, z: 0 });

            // Assume we want vol < 0 (standard for my check above? check reset logic)
            // But I don't know what specific sign my initial tetra has.
            // Let's just enforce: New face must have same sign wrt origin as any existing kept face?
            // Yes.

            // Pick a reference face (invisible)
            let refSign = -1;
            if (newFaces.length > 0) {
                refSign = Math.sign(orient3d(this.points[newFaces[0][0]], this.points[newFaces[0][1]], this.points[newFaces[0][2]], { x: 0, y: 0, z: 0 }));
            }

            if (Math.sign(vol1) === refSign) {
                newFaces.push(f1);
            } else {
                newFaces.push([e[1], e[0], pIdx]); // Swap
            }
        });

        this.faces = newFaces;
        this.rebuildEdges();

        this.statusEl.innerHTML = `Προστέθηκε P${pIdx}. Διαγράφηκαν ${visibility.filter(v => v).length} έδρες. Νέο σύνολο εδρών: ${this.faces.length}.`;
    }
}

class LPSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');
        this.listEl = document.getElementById('constraint-list');

        this.constraints = [];
        this.optimalPoint = null;
        this.hoveredIndex = -1;

        // Coordinate System Configuration
        this.scale = 1; // Pixels per unit? Let's treat pixel coords as units but shifted.
        this.origin = { x: 0, y: 0 }; // Will be set on resize to center

        window.addEventListener('resize', () => this.resize());

        // Mouse interaction
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Screen Coords
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            // Math Coords
            const mx = this.toMathX(sx);
            const my = this.toMathY(sy);

            this.handleHover(mx, my);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredIndex = -1;
            this.render();
            this.highlightListItem(-1);
        });

        this.resize();
        // Initial setup
        this.reset();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;

        // Center Origin
        this.origin = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        this.render();
    }

    // --- Coordinate Transformations (Cartesian <-> Canvas) ---
    // Canvas: (0,0) Top-Left, Y down.
    // Math: (0,0) Center, Y up.

    toCanvasX(x) { return this.origin.x + x; }
    toCanvasY(y) { return this.origin.y - y; } // Invert Y

    toMathX(cx) { return cx - this.origin.x; }
    toMathY(cy) { return this.origin.y - cy; }

    reset() {
        this.constraints = [];

        // Initial Optimal: Ideally +Infinity Y.
        // But for visualization we start inside a "Large Box".
        // Let's define a visible Math box region, say [-300, 300] x [-300, 300]
        const range = 350;

        this.optimalPoint = { x: 0, y: range }; // Start at top center of box

        // Add Bounding Box Constraints in Math Space
        // x >= -range  => -1x + 0y <= range
        this.addInternalConstraint(-1, 0, range, "x ≥ -350");
        // x <= range   => 1x + 0y <= range
        this.addInternalConstraint(1, 0, range, "x ≤ 350");
        // y >= -range  => 0x - 1y <= range
        this.addInternalConstraint(0, -1, range, "y ≥ -350");
        // y <= range   => 0x + 1y <= range
        this.addInternalConstraint(0, 1, range, "y ≤ 350");

        this.updateList();
        this.render();
        this.statusEl.innerHTML = "Αρχικοποίηση (Κέντρο 0,0).";
    }

    addInternalConstraint(a, b, c, label) {
        this.constraints.push({ a, b, c, isBox: true, id: Math.random().toString(36).substr(2, 9), label });
    }

    addConstraint() {
        // Generate visible line passing through the visible area [-300, 300]
        const range = 250;

        const randCoord = () => (Math.random() - 0.5) * 2 * range;

        // Pick two random points inside the area to define the line
        // This ensures the line intersects the view
        const p1 = { x: randCoord(), y: randCoord() };
        const p2 = { x: randCoord(), y: randCoord() };

        let a = p1.y - p2.y;
        let b = p2.x - p1.x;
        const len = Math.sqrt(a * a + b * b);
        a /= len; b /= len;

        let c = a * p1.x + b * p1.y;

        // Ensure (0,0) is usually valid to avoid instant infeasibility
        // If 0,0 violates (0 > c), flip normal
        if (0 > c) {
            // Or maybe we WANT it to cut off 0,0?
            // Let's just flip usually to keep it interesting but solvable.
            // If c < -50 (far violation), flip.
            if (c < -10) {
                a = -a; b = -b; c = -c;
            }
        }

        const id = Math.random().toString(36).substr(2, 9);
        const label = this.formatEquation(a, b, c);

        this.constraints.push({ a, b, c, isBox: false, id, label });
        this.updateList();
        this.solve();
    }

    formatEquation(a, b, c) {
        // Format: ax + by <= c
        // Map screen coords to "Math-like" coords for display if we wanted,
        // but simple numbers are fine. Keep rounded.
        const fa = a.toFixed(2);
        const fb = (b >= 0 ? "+ " : "- ") + Math.abs(b).toFixed(2);
        const fc = c.toFixed(0);
        return `${fa}x ${fb}y ≤ ${fc}`;
    }

    solve() {
        // Simple Seidel logic
        const last = this.constraints[this.constraints.length - 1];

        if (this.violates(this.optimalPoint, last)) {
            this.statusEl.innerHTML = "Παραβίαση! Υπολογισμός νέου βέλτιστου...";

            let p0;
            if (Math.abs(last.b) > 1e-5) p0 = { x: 0, y: last.c / last.b };
            else p0 = { x: last.c / last.a, y: 0 };

            const v = { x: -last.b, y: last.a };

            let tMin = -Infinity, tMax = Infinity;

            for (let i = 0; i < this.constraints.length - 1; i++) {
                const con = this.constraints[i];
                const dot = con.a * v.x + con.b * v.y;
                const val = con.c - (con.a * p0.x + con.b * p0.y);

                if (Math.abs(dot) < 1e-9) {
                    if (val < -1e-9) { this.makeInfeasible(); return; }
                } else {
                    const t = val / dot;
                    if (dot > 0) tMax = Math.min(tMax, t);
                    else tMin = Math.max(tMin, t);
                }
            }

            if (tMin > tMax + 1e-7) { this.makeInfeasible(); return; }

            let bestT;
            // Maximize Y => v.y component
            if (Math.abs(v.y) < 1e-9) bestT = (tMin + tMax) / 2;
            else if (v.y > 0) bestT = tMax; // Moving along +V increases Y -> pick tMax
            else bestT = tMin; // Moving along +V decreases Y -> pick tMin

            if (bestT === -Infinity) bestT = -10000;
            if (bestT === Infinity) bestT = 10000;

            this.optimalPoint = {
                x: p0.x + bestT * v.x,
                y: p0.y + bestT * v.y
            };
            this.statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:green"></i> Νέα λύση βρέθηκε!`;
        } else {
            this.statusEl.innerHTML = "Η λύση παραμένει αμετάβλητη.";
        }

        this.render();
    }

    makeInfeasible() {
        this.optimalPoint = null;
        this.statusEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:red"></i> Ανέφικτο Πρόβλημα!`;
        this.render();
    }

    violates(p, line) {
        if (!p) return true;
        return (line.a * p.x + line.b * p.y) > line.c + 1e-4;
    }

    // --- Interaction ---

    handleHover(mx, my) {
        let minDist = 15;
        let found = -1;

        // Check distance to visible constraints
        this.constraints.forEach((c, i) => {
            if (c.isBox) return;
            const dist = Math.abs(c.a * mx + c.b * my - c.c);
            if (dist < minDist) {
                minDist = dist;
                found = i;
            }
        });

        if (this.hoveredIndex !== found) {
            this.hoveredIndex = found;
            this.render();
            this.highlightListItem(found);
        }
    }

    updateList() {
        this.listEl.innerHTML = '';
        this.constraints.forEach((c, i) => {
            if (c.isBox) return; // Don't list box constraints

            const li = document.createElement('li');
            li.style.padding = '8px';
            li.style.borderBottom = '1px solid #eee';
            li.style.cursor = 'pointer';
            li.style.fontSize = '0.9rem';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.id = `con-item-${i}`;

            li.innerHTML = `<span><strong style="color:var(--accent-color)">h<sub>${this.getVisibleIndex(i)}</sub></strong>: ${c.label}</span>`;
            // Note: i-3 assuming first 4 are box. If box logic changes, this breaks.
            // Better to count visible index.

            li.addEventListener('mouseenter', () => {
                this.hoveredIndex = i;
                this.render();
                li.style.background = '#e3f2fd';
            });
            li.addEventListener('mouseleave', () => {
                if (this.hoveredIndex === i) {
                    this.hoveredIndex = -1;
                    this.render();
                }
                li.style.background = 'transparent';
            });

            this.listEl.appendChild(li);
        });
    }

    getVisibleIndex(realIndex) {
        // Count how many non-box constraints before this one
        let count = 0;
        for (let k = 0; k <= realIndex; k++) {
            if (!this.constraints[k].isBox) count++;
        }
        return count;
    }

    highlightListItem(index) {
        // Clear all
        Array.from(this.listEl.children).forEach(li => li.style.background = 'transparent');
        if (index !== -1) {
            const li = document.getElementById(`con-item-${index}`);
            if (li) {
                li.style.background = '#e3f2fd';
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // --- Rendering ---

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        // Draw Constraints
        this.constraints.forEach((c, i) => {
            if (c.isBox) return;
            const isLast = (i === this.constraints.length - 1);
            const isHover = (i === this.hoveredIndex);
            this.drawHalfPlane(c, isLast, isHover);
        });

        this.drawObjective();

        if (this.optimalPoint) {
            const cx = this.toCanvasX(this.optimalPoint.x);
            const cy = this.toCanvasY(this.optimalPoint.y);

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#1e8449';
            this.ctx.font = 'bold 12px sans-serif';
            // Offset label slightly
            this.ctx.fillText("Opt", cx + 10, cy + 4);
        }
    }

    drawGrid() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const step = 50;

        this.ctx.strokeStyle = '#f5f5f5';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        // Vertical lines starting from Origin
        for (let x = this.origin.x; x <= w; x += step) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); }
        for (let x = this.origin.x; x >= 0; x -= step) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); }

        // Horizontal lines starting from Origin
        for (let y = this.origin.y; y <= h; y += step) { this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); }
        for (let y = this.origin.y; y >= 0; y -= step) { this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); }
        this.ctx.stroke();

        // Axes (Black)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        // X-Axis
        this.ctx.moveTo(0, this.origin.y); this.ctx.lineTo(w, this.origin.y);
        // Y-Axis
        this.ctx.moveTo(this.origin.x, 0); this.ctx.lineTo(this.origin.x, h);
        this.ctx.stroke();

        // Origin Label
        this.ctx.fillStyle = '#000';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText("(0,0)", this.origin.x + 4, this.origin.y + 12);
    }

    drawHalfPlane(line, isNew, isHover) {
        // Robust Infinite Line Drawing using Rotation
        // Line: ax + by = c.
        // Normal vector (a, b).
        // We want to fill the side where ax+by > c.

        // Convert to canvas parameters?
        // Let's use coordinate transform on Context for easy drawing.

        this.ctx.save();

        // We translate context to Origin first
        this.ctx.translate(this.origin.x, this.origin.y);
        // Scale Y by -1 to match Math system?
        this.ctx.scale(1, -1);

        // Now we are in Math Coords (almost, Y is up)

        // Find a pivot point on the line
        let p0;
        if (Math.abs(line.b) > 1e-5) p0 = { x: 0, y: line.c / line.b };
        else p0 = { x: line.c / line.a, y: 0 };

        // Calculate angle of the line
        // Normal angle
        const normalAngle = Math.atan2(line.b, line.a);

        // Translate to pivot
        this.ctx.translate(p0.x, p0.y);
        // Rotate
        this.ctx.rotate(normalAngle);

        // Draw Vertical line (perpendicular to normal) along Y axis
        const huge = 4000;

        this.ctx.beginPath();
        this.ctx.moveTo(0, -huge);
        this.ctx.lineTo(0, huge);

        let color = '#bdc3c7';
        let width = 1; // 1 unit width in math coords? If scale is 1, yes.
        // We scaled (1, -1), line width is affected? No, because non-uniform scale might
        // mess up strokes if rotated. But 1,-1 is just flip.
        // Actually, scale(1, -1) flips text too.

        if (isNew) { color = '#e74c3c'; width = 2; }
        if (isHover) { color = '#3498db'; width = 3; }

        // We need to restore scale for constant pixel width?
        // Or just accept it.
        // this.ctx.vectorEffect = "non-scaling-stroke"; // Doesn't work in Canvas

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();

        // Fill (+X side in rotated frame)
        this.ctx.beginPath();
        this.ctx.rect(0, -huge, huge, huge * 2);

        let fillColor = 'rgba(149, 165, 166, 0.1)';
        if (isNew) fillColor = 'rgba(231, 76, 60, 0.15)';
        if (isHover) fillColor = 'rgba(52, 152, 219, 0.2)';

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        this.ctx.restore();
    }

    drawObjective() {
        const w = this.canvas.width;
        this.ctx.save();
        this.ctx.translate(w - 40, 40);
        this.ctx.beginPath();
        // Arrow pointing UP (Canvas coords)
        this.ctx.moveTo(0, 20); this.ctx.lineTo(0, -20);
        this.ctx.lineTo(-5, -15); this.ctx.moveTo(0, -20); this.ctx.lineTo(5, -15);
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = '#2980b9';
        this.ctx.textAlign = 'center';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText("Max Y", 0, 32);
        this.ctx.restore();
    }
}

class KdTreeSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('sim-status');
        this.points = [];
        this.tree = null;
        this.rangeRect = null; // For range query demo
        this.isDragging = false;
        this.dragStart = null;

        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onUp(e));

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    generatePoints(n = 20) {
        this.points = [];
        const margin = 30;
        const w = this.canvas.width;
        const h = this.canvas.height;

        for (let i = 0; i < n; i++) {
            this.points.push({
                x: randomInt(margin, w - margin),
                y: randomInt(margin, h - margin),
                id: i
            });
        }

        this.rangeRect = null;
        this.buildTree();
        this.render();
    }

    buildTree() {
        const region = {
            xMin: 0, xMax: this.canvas.width,
            yMin: 0, yMax: this.canvas.height
        };
        this.tree = this.recursiveBuild(this.points, 0, region);
    }

    recursiveBuild(points, depth, region) {
        if (points.length === 0) return null;

        const axis = depth % 2;

        const sorted = [...points].sort((a, b) => axis === 0 ? a.x - b.x : a.y - b.y);
        const medianIdx = Math.floor(sorted.length / 2);
        const medianPoint = sorted[medianIdx];

        const node = {
            point: medianPoint,
            axis: axis,
            depth: depth,
            region: region,
            left: null,
            right: null
        };

        const leftPoints = sorted.slice(0, medianIdx);
        const rightPoints = sorted.slice(medianIdx + 1);

        const leftRegion = { ...region };
        const rightRegion = { ...region };

        if (axis === 0) {
            leftRegion.xMax = medianPoint.x;
            rightRegion.xMin = medianPoint.x;
        } else {
            leftRegion.yMax = medianPoint.y;
            rightRegion.yMin = medianPoint.y;
        }

        node.left = this.recursiveBuild(leftPoints, depth + 1, leftRegion);
        node.right = this.recursiveBuild(rightPoints, depth + 1, rightRegion);

        return node;
    }

    // Range query interaction
    onDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.isDragging = true;
        this.rangeRect = null;
    }

    onMove(e) {
        if (!this.isDragging || !this.dragStart) return;
        const rect = this.canvas.getBoundingClientRect();
        const currX = e.clientX - rect.left;
        const currY = e.clientY - rect.top;

        this.rangeRect = {
            xMin: Math.min(this.dragStart.x, currX),
            xMax: Math.max(this.dragStart.x, currX),
            yMin: Math.min(this.dragStart.y, currY),
            yMax: Math.max(this.dragStart.y, currY)
        };
        this.render();
    }

    onUp(e) {
        this.isDragging = false;
        this.render();
    }

    pointInRange(p, r) {
        return p.x >= r.xMin && p.x <= r.xMax && p.y >= r.yMin && p.y <= r.yMax;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.tree) return;

        this.drawSubdivisions(this.tree);

        // Draw Range Rectangle
        if (this.rangeRect) {
            const r = this.rangeRect;
            this.ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
            this.ctx.fillRect(r.xMin, r.yMin, r.xMax - r.xMin, r.yMax - r.yMin);
            this.ctx.strokeStyle = '#9b59b6';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(r.xMin, r.yMin, r.xMax - r.xMin, r.yMax - r.yMin);
        }

        // Draw points with labels
        let inRangeCount = 0;
        this.points.forEach(p => {
            const inRange = this.rangeRect && this.pointInRange(p, this.rangeRect);
            if (inRange) inRangeCount++;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = inRange ? '#9b59b6' : '#2c3e50';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = inRange ? '#8e44ad' : '#7f8c8d';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText(`P${p.id}`, p.x + 7, p.y - 7);
        });

        if (this.statusEl) {
            let status = `<strong>${this.points.length}</strong> σημεία | Βάθος δέντρου: <strong>${this.getTreeDepth(this.tree)}</strong>`;
            if (this.rangeRect) {
                status += ` | <span style="color:#9b59b6">Εντός περιοχής: <strong>${inRangeCount}</strong></span>`;
            } else {
                status += ' | <em>Σύρετε για ερώτημα εύρους</em>';
            }
            this.statusEl.innerHTML = status;
        }
    }

    getTreeDepth(node) {
        if (!node) return 0;
        return 1 + Math.max(this.getTreeDepth(node.left), this.getTreeDepth(node.right));
    }

    drawSubdivisions(node) {
        if (!node) return;

        const r = node.region;
        const p = node.point;

        // Line width decreases with depth for visual hierarchy
        this.ctx.lineWidth = Math.max(1, 2 - node.depth * 0.3);

        if (node.axis === 0) { // Vertical split (Red)
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, r.yMin);
            this.ctx.lineTo(p.x, r.yMax);
            this.ctx.stroke();
        } else { // Horizontal split (Blue)
            this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
            this.ctx.beginPath();
            this.ctx.moveTo(r.xMin, p.y);
            this.ctx.lineTo(r.xMax, p.y);
            this.ctx.stroke();
        }

        this.drawSubdivisions(node.left);
        this.drawSubdivisions(node.right);
    }
}

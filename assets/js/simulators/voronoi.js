class VoronoiSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.rgbColors = [];
        this.isDragging = false;
        this.dragIdx = -1;

        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.resize(), 100);
        });

        // Allow dragging points
        this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.onUp());

        if (this.canvas.clientWidth > 0) this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        if (this.points.length > 0) this.render();
    }

    generatePoints(n = 8) {
        this.points = [];
        this.rgbColors = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 40;

        for (let i = 0; i < n; i++) {
            this.points.push({
                x: randomInt(margin, w - margin),
                y: randomInt(margin, h - margin),
                id: i
            });
            // Distinct pastel colors
            const hue = (i / n) * 360;
            this.rgbColors.push(this.hslToRgb(hue, 70, 75));
        }

        this.render();
    }

    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onDown(e) {
        const m = this.getMousePos(e);
        this.dragIdx = -1;
        for (let i = 0; i < this.points.length; i++) {
            const dx = this.points[i].x - m.x;
            const dy = this.points[i].y - m.y;
            if (Math.sqrt(dx * dx + dy * dy) < 15) {
                this.dragIdx = i;
                this.isDragging = true;
                break;
            }
        }
    }

    onMove(e) {
        if (this.isDragging && this.dragIdx !== -1) {
            const m = this.getMousePos(e);
            this.points[this.dragIdx].x = m.x;
            this.points[this.dragIdx].y = m.y;
            this.render();
        }
    }

    onUp() {
        this.isDragging = false;
        this.dragIdx = -1;
    }

    render() {
        if (this.points.length === 0) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        const imgData = this.ctx.createImageData(w, h);
        const data = imgData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let minDist = Infinity;
                let nearestIdx = 0;

                for (let i = 0; i < this.points.length; i++) {
                    const dx = x - this.points[i].x;
                    const dy = y - this.points[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        nearestIdx = i;
                    }
                }

                const index = (y * w + x) * 4;
                const c = this.rgbColors[nearestIdx];

                data[index] = c[0];
                data[index + 1] = c[1];
                data[index + 2] = c[2];
                data[index + 3] = 255;
            }
        }

        this.ctx.putImageData(imgData, 0, 0);

        // Draw Points with labels
        this.points.forEach((p, i) => {
            // Outer ring
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Inner dot
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fill();

            // Label
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(`S${i}`, p.x + 10, p.y - 10);
        });
    }
}

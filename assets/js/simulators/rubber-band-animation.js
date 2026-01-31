/**
 * Προσομοίωση Λάστιχου (Rubber Band Animation)
 * Οπτικοποιεί την αναλογία με τις πρόκες και το λάστιχο για το Κυρτό Περίβλημα.
 */
class RubberBandAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.points = [];
        this.hull = [];
        this.timer = 0;
        this.isRunning = true;

        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.generatePoints();
        this.animate();

        // Με το κλικ γίνεται επαναφορά και δημιουργία νέων σημείων
        this.canvas.addEventListener('click', () => {
            this.generatePoints();
            this.timer = 0;
        });
    }

    resize() {
        if (!this.canvas.parentElement) return;
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }

    generatePoints() {
        const count = 12 + Math.floor(Math.random() * 8);
        const margin = 60;
        this.points = [];

        for (let i = 0; i < count; i++) {
            this.points.push(new Point(
                margin + Math.random() * (this.canvas.width - 2 * margin),
                margin + Math.random() * (this.canvas.height - 2 * margin)
            ));
        }

        this.computeHull();
    }

    computeHull() {
        if (this.points.length < 3) {
            this.hull = [...this.points];
            return;
        }

        // Αλγόριθμος Monotone Chain (O(n log n)) για την εύρεση του περιβλήματος
        const pts = [...this.points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

        const upper = [];
        for (const p of pts) {
            while (upper.length >= 2 && ccw(upper[upper.length - 2], upper[upper.length - 1], p) >= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        const lower = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (lower.length >= 2 && ccw(lower[lower.length - 2], lower[lower.length - 1], p) >= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        upper.pop();
        lower.pop();
        this.hull = upper.concat(lower);
    }

    animate() {
        if (!this.isRunning) return;

        this.timer += 0.015;
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Δυναμική του Loop:
        // Η διάρκεια ενός πλήρους κύκλου είναι περίπου 6 δευτερόλεπτα
        const loopTime = this.timer % 6;
        let cycle = 0;
        let opacity = 1;

        if (loopTime < 2) {
            // Φάση 1: Συρρίκνωση (0s έως 2s)
            // Χρήση easing συνάρτησης για πιο φυσική κίνηση (easeInCubic)
            const t = loopTime / 2;
            cycle = t * t * t;
        } else if (loopTime < 4) {
            // Φάση 2: Σταθερότητα στο Περίβλημα (2s έως 4s)
            cycle = 1;
        } else if (loopTime < 5) {
            // Φάση 3: Εξασθένιση (4s έως 5s)
            cycle = 1;
            opacity = 1 - (loopTime - 4);
        } else {
            // Φάση 4: Δημιουργία νέων σημείων / Αναμονή (5s έως 6s)
            if (!this.hasReset) {
                this.generatePoints();
                this.hasReset = true;
            }
            cycle = 0;
            opacity = 0;
        }

        if (loopTime < 1) this.hasReset = false;

        // Σχεδίαση των σημείων (πρόκες)
        this.points.forEach(p => {
            this.ctx.globalAlpha = loopTime > 5 ? (loopTime - 5) : 1;
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // Σχεδίαση του Λάστιχου
        const maxOffset = Math.max(this.canvas.width, this.canvas.height) * 0.5;
        const currentOffset = maxOffset * (1 - cycle);

        if (this.hull.length > 0 && opacity > 0) {
            this.ctx.globalAlpha = opacity;
            this.drawOffsetHull(this.hull, currentOffset);
            this.ctx.globalAlpha = 1;
        }

        // Ετικέτα κατάστασης
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '500 13px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        let msg = "Το λάστιχο συρρικνώνεται...";
        if (cycle > 0.99) msg = "Κυρτό Περίβλημα (Convex Hull)";
        if (loopTime > 4) msg = "";
        this.ctx.fillText(msg, this.canvas.width / 2, this.canvas.height - 15);
    }

    drawOffsetHull(hull, r) {
        const n = hull.length;
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';

        if (r < 0.5) {
            this.ctx.strokeStyle = '#e74c3c'; // Κόκκινο για το τελικό περίβλημα
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
            this.ctx.beginPath();
            this.ctx.moveTo(hull[0].x, hull[0].y);
            for (let i = 1; i < n; i++) this.ctx.lineTo(hull[i].x, hull[i].y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            return;
        }

        this.ctx.strokeStyle = '#3498db'; // Μπλε για το λάστιχο που συρρικνώνεται
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
        this.ctx.beginPath();

        for (let i = 0; i < n; i++) {
            const p0 = hull[(i - 1 + n) % n];
            const p1 = hull[i];
            const p2 = hull[(i + 1) % n];

            // Εξωτερική κάθετος (Left Normal) της ακμής p0p1: (y, -x)
            const v0 = { x: p1.x - p0.x, y: p1.y - p0.y };
            const n0 = { x: v0.y, y: -v0.x };
            const angle0 = Math.atan2(n0.y, n0.x);

            // Εξωτερική κάθετος (Left Normal) της ακμής p1p2: (y, -x)
            const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
            const n1 = { x: v1.y, y: -v1.x };
            const angle1 = Math.atan2(n1.y, n1.x);

            // Σχεδίαση τόξου γύρω από την κορυφή i
            // Το τόξο συνδέει τις παράλληλες ακμές των γειτονικών πλευρών
            this.ctx.arc(p1.x, p1.y, r, angle0, angle1, false);
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
}

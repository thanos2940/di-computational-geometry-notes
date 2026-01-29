/**
 * Geometry Primitives and Algorithms
 */

class Point {
    constructor(x, y, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Distance to another point (squared for efficiency)
    distSq(p) {
        return (this.x - p.x) ** 2 + (this.y - p.y) ** 2 + (this.z - p.z) ** 2;
    }

    dist(p) {
        return Math.sqrt(this.distSq(p));
    }

    // Vector operations
    sub(p) {
        return new Point(this.x - p.x, this.y - p.y, this.z - p.z);
    }

    add(p) {
        return new Point(this.x + p.x, this.y + p.y, this.z + p.z);
    }
}

/**
 * Υπολογίζει τον προσανατολισμό τριών σημείων (2D).
 * Χρησιμοποιεί την ορίζουσα 2x2.
 * Τύπος: det = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
 * 
 * @param {Point} p - Πρώτο σημείο
 * @param {Point} q - Δεύτερο σημείο  
 * @param {Point} r - Τρίτο σημείο
 * @returns {number} - Θετικό: αριστερή στροφή, Αρνητικό: δεξιά, 0: συνευθειακά
 */
function ccw(p, q, r) {
    // Note: On HTML Canvas, Y-axis is inverted (increases downwards).
    // To match standard geometric intuition (Left Turn = Positive),
    // we invert the Y-axis terms: (r.y - p.y) becomes (p.y - r.y).
    return (q.x - p.x) * (p.y - r.y) - (p.y - q.y) * (r.x - p.x);
}

/**
 * Ελέγχει αν το s βρίσκεται εντός του τριγώνου abc
 */
function inTriangle(a, b, c, s) {
    // Χρησιμοποιώντας βαρυκεντρικές συντεταγμένες ή διασταυρούμενα γινόμενα
    const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

    // Έλεγχος αν το s είναι στην ίδια πλευρά κάθε ακμής
    // Υποθέτουμε abc σε CCW (αν όχι, η orient μπορεί να βγει αρνητική για "μέσα")
    // Γενικά: τα πρόσημα πρέπει να είναι όλα ίδια

    const d1 = orient(a, b, s);
    const d2 = orient(b, c, s);
    const d3 = orient(c, a, s);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

/**
 * Υπολογίζει την ορίζουσα 3x3 για προσανατολισμό σε 3D
 */
function orient3d(p, q, r, s) {
    const m11 = p.x - s.x; const m12 = p.y - s.y; const m13 = p.z - s.z;
    const m21 = q.x - s.x; const m22 = q.y - s.y; const m23 = q.z - s.z;
    const m31 = r.x - s.x; const m32 = r.y - s.y; const m33 = r.z - s.z;

    // Rule of Sarrus or cofactor expansion
    return m11 * (m22 * m33 - m23 * m32) -
        m12 * (m21 * m33 - m23 * m31) +
        m13 * (m21 * m32 - m22 * m31);
}

/**
 * Glossary System - Hover tooltips για τεχνικούς όρους
 * Περιλαμβάνει:
 * 1. Λεξικό Όρων (GLOSSARY)
 * 2. AutoLinker: Αυτόματος εντοπισμός και επισήμανση όρων στο κείμενο
 * 3. TooltipSystem: Εμφάνιση ορισμών
 * 4. GlossaryPage: Rendering λίστας στη σελίδα glossary.html
 */

window.GLOSSARY = {
    // Βασικοί Όροι
    'CCW': 'Counter-Clockwise (Αριστερόστροφη φορά). Γεωμετρικά συμβαίνει όταν η ορίζουσα τριών σημείων είναι θετική (>0).',
    'CW': 'Clockwise (Δεξιόστροφη φορά). Γεωμετρικά συμβαίνει όταν η ορίζουσα τριών σημείων είναι αρνητική (<0).',
    'Κυρτό Περίβλημα': 'Convex Hull. Το μικρότερο δυνατό κυρτό πολύγωνο που εσωκλείει όλα τα σημεία ενός συνόλου.',
    'ΚΠ': 'Συντομογραφία για το Κυρτό Περίβλημα (Convex Hull).',
    'ΚΠ3': 'Κυρτό Περίβλημα 3D. Το τρισδιάστατο σύνορο που περικλείει σημεία στον χώρο. Αποτελείται από έδρες (τρίγωνα), ακμές και κορυφές.',
    'Πολύτοπο': 'Γενίκευση του πολυγώνου (2D) και πολυέδρου (3D) σε d διαστάσεις.',

    // Στοιχεία Πολυτόπων (3D+)
    'Έδρα': 'Facet (ή Face). Σε 3D, είναι τα τρίγωνα που σχηματίζουν την επιφάνεια του πολυέδρου. Γενικά, στοιχείο διάστασης d-1.',
    'Ακμή': 'Edge. Το ευθύγραμμο τμήμα που ενώνει δύο κορυφές. Σε 3D, αποτελεί την τομή δύο εδρών.',
    'Ράχη': 'Ridge. Σε d διαστάσεις, είναι το σύνορο μεταξύ δύο εδρών (διάστασης d-2). Σε 3D, η ράχη ταυτίζεται με την Ακμή.',
    'Ορίζοντας': 'Horizon (Purple edges). Στον αυξητικό αλγόριθμο 3D, είναι το σύνολο των ακμών που χωρίζουν τις ορατές έδρες (από το νέο σημείο) από τις αόρατες.',
    'Υπερεπίπεδο': 'Hyperplane. Ένας αφινικός υποχώρος διάστασης d-1 που χωρίζει τον χώρο $R^d$ σε δύο ημιχώρους.',

    // Predicates
    'InCircle': 'Κατηγόρημα που ελέγχει αν ένα σημείο $q$ βρίσκεται ΕΝΤΟΣ του κύκλου που ορίζουν τρία άλλα σημεία.',
    'Ορίζουσα': 'Determinant. Μαθηματικό εργαλείο που μας δίνει το προσημασμένο εμβαδόν (ή όγκο). Το πρόσημό της καθορίζει τον προσανατολισμό.',
    'Legal Edge': 'Έγκυρη ακμή (Delaunay). Μια ακμή είναι "νόμιμη" αν ικανοποιεί την ιδιότητα του άδειου περιγεγραμμένου κύκλου.',
    'Edge Flip': 'Διαδικασία τοπικής βελτιστοποίησης στο Delaunay. Αντικατάσταση διαγωνίου σε τετράπλευρο για νομιμοποίηση ακμών.',

    // Δομές Δεδομένων
    'kd-tree': 'Δέντρο k διαστάσεων. Χωρική δομή που εναλλάσσει τον άξονα διαχωρισμού (x, y...) σε κάθε επίπεδο.',
    'Range Tree': 'Δέντρο εύρους. Δομή δεδομένων βελτιστοποιημένη για ορθογώνια ερωτήματα σε πολυδιάστατους χώρους.',
    'Split Node': 'O κόμβος διαχωρισμού σε δέντρο αναζήτησης, όπου τα μονοπάτια για το min και max αποκλίνουν.',

    // Τριγωνοποίηση & Voronoi
    'Delaunay': 'Τριγωνοποίηση όπου ο περιγεγραμμένος κύκλος κάθε τριγώνου δεν περιέχει άλλα σημεία (empty circle property).',
    'Voronoi': 'Διάγραμμα Voronoi. Διαμέριση του επιπέδου σε περιοχές "επιρροής", όπου κάθε σημείο της περιοχής είναι πιο κοντά στο αντίστοιχο κέντρο (site) από οποιοδήποτε άλλο.',
    'Κελί Voronoi': 'Voronoi Cell. Η κυρτή περιοχή (πολύγωνο) που περιέχει όλα τα σημεία που είναι πλησιέστερα σε ένα συγκεκριμένο site.',
    'Lifting': 'Μέθοδος Ανύψωσης. Μετασχηματισμός από 2D σε 3D (παραβολοειδές) που ανάγει το Voronoi/Delaunay σε υπολογισμό Κάτω Κυρτού Περιβλήματος.',

    // Αλγόριθμοι
    'Graham Scan': 'Αλγόριθμος ΚΠ (2D) που χρησιμοποιεί ταξινόμηση και στοίβα. Πολυπλοκότητα $\\mathcal{O}(n \\log n)$.',
    'Gift Wrapping': 'Jarvis March. Αλγόριθμος ΚΠ που βρίσκει τις ακμές μία-μία "τυλίγοντας" τα σημεία. Πολυπλοκότητα output-sensitive $\\mathcal{O}(nh)$.',
    'QuickHull': 'Αλγόριθμος ΚΠ τύπου Divide & Conquer. Απορρίπτει γρήγορα εσωτερικά σημεία.',
    'Divide & Conquer': 'Γενική στρατηγική αλγορίθμων: Διαίρεση σε υποπροβλήματα, αναδρομική επίλυση και συνδυασμός.',
    'Fractional Cascading': 'Τεχνική "διαδοχικής διοχέτευσης" για επιτάχυνση αναζήτησης σε επαναλαμβανόμενες δομές δεδομένων.',

    // Γραμμικός Προγραμματισμός
    'Slack Variable': 'Μεταβλητή χαλάρωσης ($s_i$). Μετατρέπει μια ανισότητα $\\le$ σε ισότητα.',
    'Εφικτή Περιοχή': 'Feasible Region. Το πολύγωνο που περιέχει τα σημεία που ικανοποιούν όλους τους γραμμικούς περιορισμούς.',
    'Γραμμικός Προγραμματισμός': 'Βελτιστοποίηση γραμμικής συνάρτησης υπό γραμμικούς περιορισμούς.',
    'Κάτω Περίβλημα': 'Το τμήμα του Κυρτού Περιβλήματος που "βλέπει" προς τα κάτω ($y \\to -\\infty$).',
    'Άνω Περίβλημα': 'Το τμήμα του Κυρτού Περιβλήματος που "βλέπει" προς τα πάνω ($y \\to +\\infty$).'
};

class TooltipSystem {
    constructor() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'glossary-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            display: none;
            background: var(--bg-secondary, #1a1a2e);
            color: var(--text-primary, #e0e0e0);
            border: 1px solid var(--accent-color, #4a90d9);
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 0.9rem;
            max-width: 320px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            z-index: 10000;
            pointer-events: none;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltip);
    }

    show(e, term, definition) {
        this.tooltip.innerHTML = `<div style="font-weight:bold; margin-bottom:4px; color:var(--accent-color)">${term}</div>${definition}`;
        this.tooltip.style.display = 'block';
        this.updatePosition(e);

        // Render MathJax/KaTeX inside tooltip if needed
        if (window.renderMathInElement) {
            try {
                window.renderMathInElement(this.tooltip, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false }
                    ]
                });
            } catch (err) { /* Ignore render errors */ }
        }
    }

    updatePosition(e) {
        const offset = 15;
        let x = e.clientX + offset;
        let y = e.clientY + offset;

        const rect = this.tooltip.getBoundingClientRect();

        // Boundary checks
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - offset;
        }
        if (y + rect.height > window.innerHeight) {
            y = e.clientY - rect.height - offset;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    hide() {
        this.tooltip.style.display = 'none';
    }
}

class GlossaryManager {
    constructor() {
        this.tooltipSystem = new TooltipSystem();
        this.terms = Object.keys(window.GLOSSARY).sort((a, b) => b.length - a.length); // Longest first
        this.linkedTerms = new Set(); // Keep track of linked terms per page
    }

    init() {
        // Αν είμαστε στη σελίδα Glossary, κάνουμε render τη λίστα
        if (document.getElementById('glossary-list')) {
            this.renderGlossaryPage();
            return;
        }

        // Αρχικοποίηση λίστας "απαγορευμένων" όρων με βάση τον τίτλο της σελίδας
        // Αν η σελίδα λέγεται "QuickHull", δεν θέλουμε να κάνουμε link τη λέξη QuickHull
        const pageTitle = document.title.toLowerCase();
        const mainHeader = document.querySelector('h1')?.innerText.toLowerCase() || '';

        this.terms.forEach(term => {
            if (pageTitle.includes(term.toLowerCase()) || mainHeader.includes(term.toLowerCase())) {
                this.linkedTerms.add(term); // Mark as "already linked" effectively ignoring it
            }
        });

        this.autoLinkTerms();
    }

    renderGlossaryPage() {
        const container = document.getElementById('glossary-list');
        if (!container) return;

        const termsSorted = Object.keys(window.GLOSSARY).sort();

        termsSorted.forEach(term => {
            const item = document.createElement('div');
            item.className = 'glossary-item content-box';
            item.style.marginBottom = '1rem';
            item.innerHTML = `
                <h3 style="margin-top:0; color:var(--accent-color)">${term}</h3>
                <p>${window.GLOSSARY[term]}</p>
            `;
            container.appendChild(item);
        });

        // Render Math equations on the glossary page
        if (window.renderMathInElement) {
            window.renderMathInElement(container, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ]
            });
        }
    }

    autoLinkTerms() {
        const contentArea = document.querySelector('main .container');
        if (!contentArea) return;

        const walker = document.createTreeWalker(
            contentArea,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const tag = node.parentElement.tagName;
                    // Αυστηρή επαναφορά φίλτρου για SCRIPT, STYLE, A, TEXTAREA για να μην σπάσει η σελίδα/links
                    if (tag.match(/^(SCRIPT|STYLE|TEXTAREA|A|NOSCRIPT)$/)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (node.parentElement.classList.contains('term')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            let text = node.nodeValue;
            let replaced = false;

            for (const term of this.terms) {
                if (this.linkedTerms.has(term)) continue;

                // Regex για Unicode (Ελληνικά) και Punctuation
                // Group 1: Start boundary (αρχή string ή non-word char)
                // Group 2: The Term
                // Lookahead: End boundary (τέλος string ή non-word char)
                // Περιλαμβάνουμε ελληνικά ranges στο "word char" definition: \u0370-\u03FF (Greek), \u1F00-\u1FFF (Greek Extended)
                const wordChar = 'a-zA-Z0-9\\u0370-\\u03FF\\u1F00-\\u1FFF_';
                const regex = new RegExp(`(^|[^${wordChar}])(${this.escapeRegExp(term)})(?![${wordChar}])`, 'i');

                const match = text.match(regex);

                if (match) {
                    this.linkedTerms.add(term);

                    const token = `___TERM_${this.terms.indexOf(term)}___`;
                    // Αντικαθιστούμε το match διατηρώντας το prefix (Group 1)
                    text = text.replace(regex, '$1' + token);
                    replaced = true;
                }
            }

            if (replaced) {
                const fragment = document.createDocumentFragment();
                const parts = text.split(/(___TERM_\d+___)/);

                parts.forEach(part => {
                    const match = part.match(/___TERM_(\d+)___/);
                    if (match) {
                        const termIndex = parseInt(match[1]);
                        const term = this.terms[termIndex];
                        const span = document.createElement('span');
                        span.className = 'term';
                        span.textContent = term;

                        span.style.borderBottom = '1px dashed var(--accent-color, #4a90d9)';
                        span.style.cursor = 'help';

                        span.addEventListener('mouseenter', (e) => {
                            this.tooltipSystem.show(e, term, window.GLOSSARY[term]);
                            span.style.background = 'rgba(74, 144, 217, 0.1)';
                        });
                        span.addEventListener('mousemove', (e) => this.tooltipSystem.updatePosition(e));
                        span.addEventListener('mouseleave', () => {
                            this.tooltipSystem.hide();
                            span.style.background = 'transparent';
                        });

                        fragment.appendChild(span);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });

                node.parentNode.replaceChild(fragment, node);
            }
        });
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.glossaryManager = new GlossaryManager();
    window.glossaryManager.init();
});

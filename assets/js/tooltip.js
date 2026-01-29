/**
 * Tooltip System for Visualizations
 */
class TooltipSystem {
    constructor() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'geo-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);

        this.activeElement = null;
    }

    show(x, y, content) {
        this.tooltip.innerHTML = content;
        // Basic positioning logic to keep on screen
        const rect = this.tooltip.getBoundingClientRect();
        let left = x + 15;
        let top = y + 15;

        if (left + rect.width > window.innerWidth) {
            left = x - rect.width - 15;
        }
        if (top + rect.height > window.innerHeight) {
            top = y - rect.height - 15;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.display = 'block';
    }

    hide() {
        this.tooltip.style.display = 'none';
    }

    // Attach to a DOM element (if using SVG)
    attach(element, getContentFn) {
        element.addEventListener('mouseenter', (e) => {
            this.show(e.pageX, e.pageY, getContentFn());
        });
        element.addEventListener('mousemove', (e) => {
            this.show(e.pageX, e.pageY, getContentFn());
        });
        element.addEventListener('mouseleave', () => {
            this.hide();
        });
    }

    // Manually trigger for Canvas elements
    handleCanvasMouseMove(e, items, hitTestFn, contentFn) {
        // e: MouseEvent
        // items: array of objects to check
        // hitTestFn(item, x, y): returns boolean
        // contentFn(item): returns HTML string

        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let hit = null;
        // Iterate in reverse to find top-most
        for (let i = items.length - 1; i >= 0; i--) {
            if (hitTestFn(items[i], x, y)) {
                hit = items[i];
                break;
            }
        }

        if (hit) {
            this.show(e.pageX, e.pageY, contentFn(hit));
            e.target.style.cursor = 'pointer';
        } else {
            this.hide();
            e.target.style.cursor = 'default';
        }

        return hit;
    }
}

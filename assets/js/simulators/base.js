/**
 * Base Simulator Class
 * Handles standardized playback controls, step management, and UI updates.
 */
class SimulatorBase {
    constructor(canvasId, suffix = '') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.suffix = suffix;

        // Data State
        this.points = [];
        this.steps = [];
        this.currentStepIndex = 0;

        // Playback State
        this.isPlaying = false;
        this.timer = null;
        this.speed = 500; // ms

        // UI Elements
        this.initUI();

        // Perform initial resize immediately to get correct dimensions
        this.resize();

        // Resize Listener
        window.addEventListener('resize', () => this.resize());
        // Extra check after layout stabilizes
        setTimeout(() => this.resize(), 100);
    }

    initUI() {
        // Expected IDs:
        // btn-play{suffix}, btn-prev{suffix}, etc.

        const s = this.suffix;

        // Bind Controls
        const btnPlay = document.getElementById('btn-play' + s);
        if (btnPlay) btnPlay.onclick = () => this.togglePlay();

        const btnPrev = document.getElementById('btn-prev' + s);
        if (btnPrev) btnPrev.onclick = () => this.prev();

        const btnNext = document.getElementById('btn-next' + s);
        if (btnNext) btnNext.onclick = () => this.next();

        const btnReset = document.getElementById('btn-reset' + s);
        // Reset usually regenerates points, so it's specific to subclass? 
        // Or we can have a standard reset that calls check?
        // Let's bind if it exists, calling specific cleanup.

        // Sliders
        this.slider = document.getElementById('sim-slider' + s);
        if (this.slider) {
            this.slider.oninput = (e) => this.goTo(parseInt(e.target.value));
        }

        this.speedSlider = document.getElementById('sim-speed' + s);
        if (this.speedSlider) {
            // Speed: 100ms (Fast) to 2000ms (Slow)
            // Slider usually 1-100?
            this.speedSlider.oninput = (e) => {
                // Invert or map? Let's say val 1-10. 1=Slow, 10=Fast.
                // Delay = 2000 / val?
                const val = parseInt(e.target.value) || 5;
                this.speed = 1000 / val * 2; // e.g. 5 -> 400ms. 10 -> 200ms. 1 -> 2000ms.

                if (this.isPlaying) {
                    this.pause();
                    this.play();
                }
            };
        }

        this.statusEl = document.getElementById('sim-status' + s);
        this.descEl = document.getElementById('step-desc' + s);
        this.playBtnIcon = btnPlay ? btnPlay.querySelector('i') : null;
        this.playBtnText = btnPlay; // The button itself
    }

    resize() {
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
            this.draw(this.getStep());
        }
    }

    // Logic to be implemented by subclass
    // generatePoints() -> populates this.points, calls computeSteps()
    // computeSteps() -> populates this.steps
    // draw(step) -> renders the state

    setSteps(steps) {
        this.steps = steps;
        this.currentStepIndex = 0;
        this.updateSliderRange();
        this.updateUI();
        this.draw(this.getStep());
    }

    updateSliderRange() {
        if (this.slider) {
            this.slider.min = 0;
            // index is 0..length-1
            this.slider.max = Math.max(0, this.steps.length - 1);
            this.slider.value = 0;
        }
    }

    getStep() {
        if (this.steps.length === 0) return null;
        return this.steps[this.currentStepIndex];
    }

    // Playback Control
    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    }

    play() {
        if (this.isPlaying) return;

        if (this.currentStepIndex >= this.steps.length - 1) {
            this.currentStepIndex = 0;
        }

        this.isPlaying = true;
        this.updatePlayButton();

        this.timer = setInterval(() => {
            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
                this.updateUI();
                this.draw(this.getStep());
            } else {
                this.pause();
            }
        }, this.speed);
    }

    pause() {
        this.isPlaying = false;
        clearInterval(this.timer);
        this.updatePlayButton();
    }

    prev() {
        this.pause();
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.updateUI();
            this.draw(this.getStep());
        }
    }

    next() {
        this.pause();
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.updateUI();
            this.draw(this.getStep());
        }
    }

    goTo(index) {
        this.pause();
        const safeIndex = Math.max(0, Math.min(index, this.steps.length - 1));
        this.currentStepIndex = safeIndex;
        this.updateUI();
        this.draw(this.getStep());
    }

    updateUI() {
        // Slider
        if (this.slider) this.slider.value = this.currentStepIndex;

        // Texts
        const step = this.getStep();
        if (step) {
            if (this.statusEl) this.statusEl.innerText = `Βήμα ${this.currentStepIndex + 1} / ${this.steps.length}`;
            if (this.descEl) this.descEl.innerHTML = step.msg || ""; // Allow HTML logic
        } else {
            if (this.statusEl) this.statusEl.innerText = "-";
            if (this.descEl) this.descEl.innerText = "";
        }
    }

    updatePlayButton() {
        if (this.playBtnText) {
            if (this.isPlaying) {
                this.playBtnText.innerHTML = '<i class="fas fa-pause"></i> Pause';
            } else {
                this.playBtnText.innerHTML = '<i class="fas fa-play"></i> Play';
            }
        }
    }

    // Abstract
    draw(step) {
        console.warn("draw() not implemented in subclass");
    }
}

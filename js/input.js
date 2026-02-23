/**
 * AERA LABS POOL - Input Handler
 * Mouse and touch input for aiming, power control, and ball placement
 */

const Input = (() => {
  class InputHandler {
    constructor(canvas, renderer) {
      this.canvas = canvas;
      this.renderer = renderer;
      this.mouseX = 0;
      this.mouseY = 0;
      this.mouseDown = false;
      this.mouseButton = 0;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.isDragging = false;
      this.onShoot = null;
      this.onAim = null;
      this.onPlace = null;
      this.onClick = null;
      this.keys = {};

      this.setupEvents();
    }

    setupEvents() {
      // Mouse events
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Touch events
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

      // Keyboard events
      window.addEventListener('keydown', (e) => {
        this.keys[e.key] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key] = false;
      });
    }

    getCanvasPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    handleMouseMove(e) {
      const pos = this.getCanvasPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;

      if (this.mouseDown && this.isDragging) {
        // Calculate drag distance for power
        const dx = pos.x - this.dragStartX;
        const dy = pos.y - this.dragStartY;
        const dragDist = Math.sqrt(dx * dx + dy * dy);

        if (this.onAim) {
          this.onAim(pos.x, pos.y, dragDist);
        }
      } else if (!this.mouseDown) {
        if (this.onAim) {
          this.onAim(pos.x, pos.y, 0);
        }
      }
    }

    handleMouseDown(e) {
      e.preventDefault();
      const pos = this.getCanvasPos(e);
      this.mouseDown = true;
      this.mouseButton = e.button;
      this.dragStartX = pos.x;
      this.dragStartY = pos.y;
      this.isDragging = true;

      if (this.onClick) {
        this.onClick(pos.x, pos.y, e.button);
      }
    }

    handleMouseUp(e) {
      const pos = this.getCanvasPos(e);

      if (this.isDragging && this.onShoot) {
        const dx = pos.x - this.dragStartX;
        const dy = pos.y - this.dragStartY;
        const dragDist = Math.sqrt(dx * dx + dy * dy);
        this.onShoot(pos.x, pos.y, dragDist);
      }

      this.mouseDown = false;
      this.isDragging = false;
    }

    handleTouchStart(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this.mouseX = x;
        this.mouseY = y;
        this.mouseDown = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.isDragging = true;

        if (this.onClick) {
          this.onClick(x, y, 0);
        }
      }
    }

    handleTouchMove(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this.mouseX = x;
        this.mouseY = y;

        if (this.isDragging && this.onAim) {
          const dx = x - this.dragStartX;
          const dy = y - this.dragStartY;
          const dragDist = Math.sqrt(dx * dx + dy * dy);
          this.onAim(x, y, dragDist);
        }
      }
    }

    handleTouchEnd(e) {
      e.preventDefault();

      if (this.isDragging && this.onShoot) {
        const dx = this.mouseX - this.dragStartX;
        const dy = this.mouseY - this.dragStartY;
        const dragDist = Math.sqrt(dx * dx + dy * dy);
        this.onShoot(this.mouseX, this.mouseY, dragDist);
      }

      this.mouseDown = false;
      this.isDragging = false;
    }

    isKeyDown(key) {
      return !!this.keys[key];
    }
  }

  return { InputHandler };
})();

window.Input = Input;

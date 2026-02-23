/**
 * AERA LABS POOL - Particle Effects System
 * Handles collision sparks, pocket effects, trail particles, ambient effects
 */

const Particles = (() => {
  class Particle {
    constructor(x, y, vx, vy, life, color, size, type = 'spark') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.life = life;
      this.maxLife = life;
      this.color = color;
      this.size = size;
      this.type = type;
      this.alpha = 1;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 5;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      this.alpha = Math.max(0, this.life / this.maxLife);
      this.rotation += this.rotSpeed * dt;

      // Gravity for some particle types
      if (this.type === 'spark' || this.type === 'ember') {
        this.vy += 50 * dt;
      }

      // Slow down
      this.vx *= (1 - 0.5 * dt);
      this.vy *= (1 - 0.5 * dt);

      // Shrink
      if (this.type !== 'ring' && this.type !== 'wave') {
        this.size *= (1 - 0.3 * dt);
      }

      return this.life > 0;
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.maxParticles = 500;
    }

    emit(particle) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(particle);
      }
    }

    update(dt) {
      this.particles = this.particles.filter(p => p.update(dt));
    }

    // Ball collision sparks
    emitCollisionSparks(x, y, speed, normal) {
      const count = Math.min(20, Math.floor(speed * 15));
      const colors = ['#00FFFF', '#FF00FF', '#00FF88', '#FFFFFF', '#FFD700'];

      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(normal.y, normal.x) + (Math.random() - 0.5) * Math.PI;
        const spd = (30 + Math.random() * 80) * Math.min(speed, 3);
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 1 + Math.random() * 3;
        const life = 0.2 + Math.random() * 0.5;

        this.emit(new Particle(x, y, vx, vy, life, color, size, 'spark'));
      }

      // Add a flash ring
      this.emit(new Particle(x, y, 0, 0, 0.3, '#00FFFF', 5, 'ring'));
    }

    // Cushion hit sparks
    emitCushionSparks(x, y, speed, normal) {
      const count = Math.min(12, Math.floor(speed * 10));
      const colors = ['#00FFFF', '#0088FF', '#00CCFF'];

      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(normal.y, normal.x) + (Math.random() - 0.5) * 1.5;
        const spd = (20 + Math.random() * 50) * Math.min(speed, 2);
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd;
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.emit(new Particle(x, y, vx, vy, 0.3 + Math.random() * 0.3, color, 1 + Math.random() * 2, 'spark'));
      }

      // Cushion glow line
      this.emit(new Particle(x, y, 0, 0, 0.2, '#00FFFF', 3, 'ring'));
    }

    // Pocket vortex effect
    emitPocketEffect(x, y) {
      const colors = ['#FF00FF', '#FF00CC', '#CC00FF', '#8800FF'];

      // Spiral particles
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 4;
        const radius = 5 + i * 2;
        const vx = Math.cos(angle) * radius * -3;
        const vy = Math.sin(angle) * radius * -3;
        const color = colors[i % colors.length];
        const delay = i * 0.02;

        const p = new Particle(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          vx, vy,
          0.5 + Math.random() * 0.5,
          color, 2 + Math.random() * 3, 'ember'
        );
        this.emit(p);
      }

      // Central flash
      this.emit(new Particle(x, y, 0, 0, 0.5, '#FF00FF', 20, 'ring'));
      this.emit(new Particle(x, y, 0, 0, 0.8, '#FF00CC', 30, 'wave'));
    }

    // Cue strike impact
    emitStrikeEffect(x, y, dirX, dirY, power) {
      const count = Math.floor(10 + power * 20);
      const colors = ['#FFFFFF', '#00FFFF', '#88FFFF'];

      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(-dirY, -dirX) + (Math.random() - 0.5) * Math.PI * 0.8;
        const spd = (40 + Math.random() * 100) * power;
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd;
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.emit(new Particle(x, y, vx, vy, 0.2 + Math.random() * 0.4, color, 1 + Math.random() * 2 * power, 'spark'));
      }

      // Impact ring
      this.emit(new Particle(x, y, 0, 0, 0.3, '#FFFFFF', 8 * power, 'ring'));
    }

    // Ambient floating particles (for the table atmosphere)
    emitAmbient(x, y, w, h) {
      if (this.particles.filter(p => p.type === 'ambient').length > 20) return;

      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const colors = ['#00FFFF', '#FF00FF', '#0044FF'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.emit(new Particle(
        px, py,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        3 + Math.random() * 4,
        color, 0.5 + Math.random() * 1.5, 'ambient'
      ));
    }

    // Victory celebration
    emitVictory(x, y) {
      const colors = ['#FFD700', '#FF00FF', '#00FFFF', '#FF6600', '#00FF88', '#FFFFFF'];

      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 200;
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd - 50;
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.emit(new Particle(x, y, vx, vy, 1 + Math.random() * 2, color, 2 + Math.random() * 4, 'ember'));
      }

      for (let i = 0; i < 5; i++) {
        this.emit(new Particle(x, y, 0, 0, 0.3 + i * 0.2, '#FFD700', 10 + i * 15, 'ring'));
      }
    }

    render(ctx, scale, offsetX, offsetY) {
      ctx.save();

      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;

        switch (p.type) {
          case 'spark':
          case 'ember':
            this.renderSpark(ctx, p);
            break;
          case 'ring':
            this.renderRing(ctx, p);
            break;
          case 'wave':
            this.renderWave(ctx, p);
            break;
          case 'ambient':
            this.renderAmbient(ctx, p);
            break;
        }
      }

      ctx.restore();
    }

    renderSpark(ctx, p) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();

      // Tail
      const tailLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.02;
      if (tailLen > 1) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      }
      ctx.restore();
    }

    renderRing(ctx, p) {
      const progress = 1 - (p.life / p.maxLife);
      const radius = p.size * (1 + progress * 3);
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    renderWave(ctx, p) {
      const progress = 1 - (p.life / p.maxLife);
      const radius = p.size * progress;
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    renderAmbient(ctx, p) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return { ParticleSystem, Particle };
})();

window.Particles = Particles;

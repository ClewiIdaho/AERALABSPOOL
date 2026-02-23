/**
 * AERA LABS POOL - Futuristic Renderer
 * Neon-lit table, holographic balls, glow effects, HUD overlays
 */

const Renderer = (() => {
  const NEON_CYAN = '#00FFFF';
  const NEON_MAGENTA = '#FF00FF';
  const NEON_GREEN = '#00FF88';
  const NEON_BLUE = '#0066FF';
  const NEON_GOLD = '#FFD700';
  const DARK_BG = '#0A0A1A';
  const TABLE_SURFACE = '#0C1A2A';
  const TABLE_FELT = '#0D1F35';
  const RAIL_COLOR = '#1A1A3A';

  class GameRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.tableX = 0;
      this.tableY = 0;
      this.tableW = 0;
      this.tableH = 0;
      this.time = 0;
      this.gridPhase = 0;

      // Pre-create off-screen canvases for effects
      this.glowCanvas = document.createElement('canvas');
      this.glowCtx = this.glowCanvas.getContext('2d');
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.displayWidth = rect.width;
      this.displayHeight = rect.height;

      // Calculate table dimensions to fit the canvas
      const padding = 80;
      const tableAspect = Physics.TABLE_WIDTH / Physics.TABLE_LENGTH;
      const availW = this.displayWidth - padding * 2;
      const availH = this.displayHeight - padding * 2;

      if (availW / availH > tableAspect) {
        // Height-constrained
        this.tableH = availH;
        this.tableW = this.tableH * tableAspect;
      } else {
        // Width-constrained
        this.tableW = availW;
        this.tableH = this.tableW / tableAspect;
      }

      this.scale = this.tableW / Physics.TABLE_WIDTH;
      this.tableX = (this.displayWidth - this.tableW) / 2;
      this.tableY = (this.displayHeight - this.tableH) / 2;
      this.offsetX = this.tableX;
      this.offsetY = this.tableY;

      // Resize glow canvas
      this.glowCanvas.width = this.canvas.width;
      this.glowCanvas.height = this.canvas.height;
    }

    // Convert physics coords to screen coords
    toScreen(physPos) {
      return {
        x: this.offsetX + physPos.x * this.scale,
        y: this.offsetY + physPos.y * this.scale
      };
    }

    toPhysics(screenX, screenY) {
      return new Vec2(
        (screenX - this.offsetX) / this.scale,
        (screenY - this.offsetY) / this.scale
      );
    }

    ballRadius() {
      return Physics.BALL_RADIUS * this.scale;
    }

    render(game, dt) {
      this.time += dt;
      this.gridPhase += dt * 0.3;

      const ctx = this.ctx;
      ctx.save();

      // Clear with dark background
      this.renderBackground(ctx);

      // Render table
      this.renderTable(ctx);

      // Render guide line (when aiming)
      if (game.state === 'aiming' && game.aimLine) {
        this.renderAimLine(ctx, game);
      }

      // Render ball-in-hand placement indicator
      if (game.state === 'placing') {
        this.renderPlacementIndicator(ctx, game);
      }

      // Render balls
      for (const ball of game.physics.balls) {
        if (ball.isActive()) {
          this.renderBallTrail(ctx, ball);
        }
      }
      for (const ball of game.physics.balls) {
        if (ball.isActive()) {
          this.renderBall(ctx, ball);
        }
      }

      // Render cue stick
      if (game.state === 'aiming' && game.cueAngle !== null) {
        this.renderCueStick(ctx, game);
      }

      // Render power bar
      if (game.state === 'aiming' || game.state === 'powering') {
        this.renderPowerBar(ctx, game);
      }

      // Render particles
      if (game.particles) {
        game.particles.render(ctx, this.scale, this.offsetX, this.offsetY);
      }

      ctx.restore();
    }

    renderBackground(ctx) {
      // Dark gradient background
      const grad = ctx.createRadialGradient(
        this.displayWidth / 2, this.displayHeight / 2, 0,
        this.displayWidth / 2, this.displayHeight / 2, this.displayWidth * 0.8
      );
      grad.addColorStop(0, '#0F1525');
      grad.addColorStop(1, '#050510');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

      // Subtle grid
      ctx.save();
      ctx.globalAlpha = 0.03 + Math.sin(this.time * 0.5) * 0.01;
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      const offset = (this.gridPhase * gridSize) % gridSize;

      for (let x = -gridSize + offset; x < this.displayWidth + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.displayHeight);
        ctx.stroke();
      }
      for (let y = -gridSize + offset; y < this.displayHeight + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.displayWidth, y);
        ctx.stroke();
      }
      ctx.restore();

      // Scanline effect
      ctx.save();
      ctx.globalAlpha = 0.02;
      for (let y = 0; y < this.displayHeight; y += 3) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, this.displayWidth, 1);
      }
      ctx.restore();
    }

    renderTable(ctx) {
      const x = this.tableX;
      const y = this.tableY;
      const w = this.tableW;
      const h = this.tableH;
      const railW = 18;

      // Outer glow
      ctx.save();
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 30;
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - railW - 2, y - railW - 2, w + railW * 2 + 4, h + railW * 2 + 4);
      ctx.restore();

      // Rail (outer frame)
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(x - railW, y - railW, w + railW * 2, h + railW * 2);

      // Rail neon edges
      ctx.save();
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 2) * 0.1;

      // Outer edge
      ctx.strokeRect(x - railW, y - railW, w + railW * 2, h + railW * 2);
      // Inner edge
      ctx.strokeRect(x, y, w, h);
      ctx.restore();

      // Playing surface
      const surfGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      surfGrad.addColorStop(0, '#0B1929');
      surfGrad.addColorStop(0.5, '#0D1F35');
      surfGrad.addColorStop(1, '#0B1929');
      ctx.fillStyle = surfGrad;
      ctx.fillRect(x, y, w, h);

      // Subtle felt texture pattern
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = NEON_CYAN;
      for (let px = x; px < x + w; px += 8) {
        for (let py = y; py < y + h; py += 8) {
          if (Math.random() > 0.7) {
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      ctx.restore();

      // Head string line
      const headStringY = y + h * 0.25;
      ctx.save();
      ctx.strokeStyle = NEON_CYAN;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, headStringY);
      ctx.lineTo(x + w, headStringY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Foot spot
      const footSpotScreen = this.toScreen(new Vec2(Physics.TABLE_WIDTH / 2, Physics.TABLE_LENGTH * 0.75));
      ctx.save();
      ctx.fillStyle = NEON_CYAN;
      ctx.globalAlpha = 0.3 + Math.sin(this.time * 3) * 0.1;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(footSpotScreen.x, footSpotScreen.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Head spot
      const headSpotScreen = this.toScreen(new Vec2(Physics.TABLE_WIDTH / 2, Physics.TABLE_LENGTH * 0.25));
      ctx.save();
      ctx.fillStyle = NEON_CYAN;
      ctx.globalAlpha = 0.3 + Math.sin(this.time * 3) * 0.1;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(headSpotScreen.x, headSpotScreen.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Diamond markers on rails
      this.renderDiamonds(ctx, x, y, w, h, railW);

      // Pockets
      this.renderPockets(ctx);
    }

    renderDiamonds(ctx, x, y, w, h, railW) {
      ctx.save();
      ctx.fillStyle = NEON_GOLD;
      ctx.shadowColor = NEON_GOLD;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 1.5) * 0.1;

      const dotR = 2;

      // Top and bottom rail diamonds (short rails - no side pocket, 3 evenly spaced)
      for (let i = 1; i <= 3; i++) {
        const dx = x + (w / 4) * i;

        // Top rail
        ctx.beginPath();
        ctx.arc(dx, y - railW / 2, dotR, 0, Math.PI * 2);
        ctx.fill();
        // Bottom rail
        ctx.beginPath();
        ctx.arc(dx, y + h + railW / 2, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Left and right rail diamonds (long rails - skip center for side pocket)
      for (let i = 1; i < 8; i++) {
        if (i === 4) continue; // Skip center (side pocket)
        const dy = y + (h / 8) * i;

        // Left rail
        ctx.beginPath();
        ctx.arc(x - railW / 2, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
        // Right rail
        ctx.beginPath();
        ctx.arc(x + w + railW / 2, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    renderPockets(ctx) {
      const table = new Physics.Table();
      const pockets = table.pockets;
      const pulse = Math.sin(this.time * 2) * 0.2;

      for (const pocket of pockets) {
        const sp = this.toScreen(pocket.pos);
        const sr = pocket.radius * this.scale;

        // Pocket hole
        ctx.save();
        const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
        grad.addColorStop(0, '#000005');
        grad.addColorStop(0.6, '#050510');
        grad.addColorStop(1, '#0A0A2A');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
        ctx.fill();

        // Neon ring around pocket
        ctx.strokeStyle = NEON_MAGENTA;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + pulse;
        ctx.shadowColor = NEON_MAGENTA;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sr * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow ring
        ctx.strokeStyle = NEON_CYAN;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2 + pulse * 0.5;
        ctx.shadowColor = NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sr * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    renderBall(ctx, ball) {
      const sp = this.toScreen(ball.pos);
      const r = this.ballRadius();

      ctx.save();

      // Ball shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(sp.x + 2, sp.y + 2, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball body
      if (ball.isCue) {
        // Cue ball - white with cyan glow
        const grad = ctx.createRadialGradient(
          sp.x - r * 0.3, sp.y - r * 0.3, 0,
          sp.x, sp.y, r
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.6, '#E8E8F0');
        grad.addColorStop(1, '#B8B8CC');

        ctx.fillStyle = grad;
        ctx.shadowColor = NEON_CYAN;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Cue ball crosshair
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = NEON_CYAN;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sp.x - r * 0.5, sp.y);
        ctx.lineTo(sp.x + r * 0.5, sp.y);
        ctx.moveTo(sp.x, sp.y - r * 0.5);
        ctx.lineTo(sp.x, sp.y + r * 0.5);
        ctx.stroke();
        ctx.restore();
      } else {
        // Colored ball
        const grad = ctx.createRadialGradient(
          sp.x - r * 0.3, sp.y - r * 0.3, 0,
          sp.x, sp.y, r
        );

        const baseColor = ball.color;
        const lightColor = this.lightenColor(baseColor, 60);
        const darkColor = this.darkenColor(baseColor, 40);

        if (ball.isStripe) {
          // Stripe ball - white with colored stripe
          grad.addColorStop(0, '#FFFFFF');
          grad.addColorStop(0.5, '#F0F0F0');
          grad.addColorStop(1, '#D0D0D0');

          ctx.fillStyle = grad;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
          ctx.fill();

          // Colored stripe band
          ctx.save();
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
          ctx.clip();

          const stripeGrad = ctx.createRadialGradient(
            sp.x - r * 0.2, sp.y - r * 0.2, 0,
            sp.x, sp.y, r * 0.8
          );
          stripeGrad.addColorStop(0, lightColor);
          stripeGrad.addColorStop(1, darkColor);

          ctx.fillStyle = stripeGrad;
          ctx.fillRect(sp.x - r, sp.y - r * 0.45, r * 2, r * 0.9);
          ctx.restore();
        } else {
          // Solid ball
          grad.addColorStop(0, lightColor);
          grad.addColorStop(0.7, baseColor);
          grad.addColorStop(1, darkColor);

          ctx.fillStyle = grad;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Number circle
        if (ball.number > 0) {
          // White circle background for number
          ctx.fillStyle = ball.is8Ball ? '#111' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r * 0.42, 0, Math.PI * 2);
          ctx.fill();

          // Number text
          ctx.fillStyle = ball.is8Ball ? '#FFFFFF' : '#000000';
          ctx.font = `bold ${Math.round(r * 0.55)}px 'Orbitron', 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.number.toString(), sp.x, sp.y + 0.5);
        }
      }

      // Specular highlight
      ctx.save();
      ctx.globalAlpha = 0.6;
      const specGrad = ctx.createRadialGradient(
        sp.x - r * 0.25, sp.y - r * 0.35, 0,
        sp.x - r * 0.25, sp.y - r * 0.35, r * 0.4
      );
      specGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Neon outline glow
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = ball.isCue ? NEON_CYAN : NEON_MAGENTA;
      ctx.lineWidth = 1;
      ctx.shadowColor = ball.isCue ? NEON_CYAN : NEON_MAGENTA;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    renderBallTrail(ctx, ball) {
      if (ball.trail.length < 2) return;

      ctx.save();
      const color = ball.isCue ? NEON_CYAN : (ball.isStripe ? NEON_MAGENTA : ball.color);

      for (let i = 1; i < ball.trail.length; i++) {
        const alpha = (i / ball.trail.length) * 0.3;
        const sp = this.toScreen(ball.trail[i]);
        const prevSp = this.toScreen(ball.trail[i - 1]);

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = this.ballRadius() * 0.5 * (i / ball.trail.length);
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(prevSp.x, prevSp.y);
        ctx.lineTo(sp.x, sp.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    renderAimLine(ctx, game) {
      const cueBall = game.physics.getBall(0);
      if (!cueBall || !cueBall.isActive()) return;

      const sp = this.toScreen(cueBall.pos);
      const dir = Vec2.fromAngle(game.cueAngle);
      const lineLen = 400;

      // Main aim line
      ctx.save();
      ctx.strokeStyle = NEON_CYAN;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 6;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x + dir.x * lineLen, sp.y + dir.y * lineLen);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ghost ball prediction
      const prediction = this.predictCollision(game, cueBall.pos, dir);
      if (prediction) {
        const ghostSp = this.toScreen(prediction.hitPos);
        const r = this.ballRadius();

        // Ghost cue ball position
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = NEON_CYAN;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ghostSp.x, ghostSp.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Predicted target ball direction
        if (prediction.targetBall) {
          const targetSp = this.toScreen(prediction.targetBall.pos);
          const hitDir = prediction.targetBall.pos.sub(prediction.hitPos).normalize();
          const deflLen = 80;

          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = NEON_MAGENTA;
          ctx.shadowColor = NEON_MAGENTA;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(targetSp.x, targetSp.y);
          ctx.lineTo(
            targetSp.x + hitDir.x * deflLen * this.scale,
            targetSp.y + hitDir.y * deflLen * this.scale
          );
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    }

    predictCollision(game, cueBallPos, dir) {
      // Simple ray-circle intersection for aim prediction
      const R = Physics.BALL_RADIUS * 2;
      let closestDist = Infinity;
      let closestBall = null;
      let hitPos = null;

      for (const ball of game.physics.balls) {
        if (ball.isCue || !ball.isActive()) continue;

        const toball = ball.pos.sub(cueBallPos);
        const proj = toball.dot(dir);
        if (proj < 0) continue; // Behind the cue ball

        const perpDist = Math.abs(toball.cross(dir));
        if (perpDist > R) continue; // Miss

        const hitDist = proj - Math.sqrt(R * R - perpDist * perpDist);
        if (hitDist < closestDist && hitDist > 0) {
          closestDist = hitDist;
          closestBall = ball;
          hitPos = cueBallPos.add(dir.mul(hitDist));
        }
      }

      if (closestBall && hitPos) {
        return { targetBall: closestBall, hitPos, distance: closestDist };
      }

      // Check cushion intersection
      const table = game.physics.table;
      let cushionDist = Infinity;
      const cushionHitPos = null;

      // Simple AABB checks for cushion hit position
      if (dir.x > 0) {
        const t = (table.right - Physics.BALL_RADIUS - cueBallPos.x) / dir.x;
        if (t > 0 && t < cushionDist) { cushionDist = t; }
      }
      if (dir.x < 0) {
        const t = (table.left + Physics.BALL_RADIUS - cueBallPos.x) / dir.x;
        if (t > 0 && t < cushionDist) { cushionDist = t; }
      }
      if (dir.y > 0) {
        const t = (table.bottom - Physics.BALL_RADIUS - cueBallPos.y) / dir.y;
        if (t > 0 && t < cushionDist) { cushionDist = t; }
      }
      if (dir.y < 0) {
        const t = (table.top + Physics.BALL_RADIUS - cueBallPos.y) / dir.y;
        if (t > 0 && t < cushionDist) { cushionDist = t; }
      }

      if (cushionDist < Infinity) {
        return { targetBall: null, hitPos: cueBallPos.add(dir.mul(cushionDist)), distance: cushionDist };
      }

      return null;
    }

    renderCueStick(ctx, game) {
      const cueBall = game.physics.getBall(0);
      if (!cueBall || !cueBall.isActive()) return;

      const sp = this.toScreen(cueBall.pos);
      const dir = Vec2.fromAngle(game.cueAngle);
      const r = this.ballRadius();

      // Pull back distance based on power
      const pullBack = game.power * 80 + r + 10;
      const stickLength = 200;

      const startX = sp.x - dir.x * pullBack;
      const startY = sp.y - dir.y * pullBack;
      const endX = startX - dir.x * stickLength;
      const endY = startY - dir.y * stickLength;

      ctx.save();

      // Cue stick shadow
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX + 3, startY + 3);
      ctx.lineTo(endX + 3, endY + 3);
      ctx.stroke();

      // Cue stick body
      ctx.globalAlpha = 1;
      const stickGrad = ctx.createLinearGradient(startX, startY, endX, endY);
      stickGrad.addColorStop(0, '#F5E6C8');
      stickGrad.addColorStop(0.02, '#F5E6C8');
      stickGrad.addColorStop(0.03, '#2A2A2A');
      stickGrad.addColorStop(0.15, '#1A1A1A');
      stickGrad.addColorStop(0.5, '#3A2A1A');
      stickGrad.addColorStop(1, '#2A1A0A');

      ctx.strokeStyle = stickGrad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Neon tip
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 3;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - dir.x * 4, startY - dir.y * 4);
      ctx.stroke();

      ctx.restore();
    }

    renderPowerBar(ctx, game) {
      const barX = this.tableX + this.tableW + 30;
      const barY = this.tableY + 50;
      const barW = 16;
      const barH = this.tableH - 100;

      ctx.save();

      // Bar background
      ctx.fillStyle = 'rgba(10,10,30,0.8)';
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;

      // Rounded rect
      const rr = 8;
      ctx.beginPath();
      ctx.moveTo(barX + rr, barY);
      ctx.lineTo(barX + barW - rr, barY);
      ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + rr);
      ctx.lineTo(barX + barW, barY + barH - rr);
      ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - rr, barY + barH);
      ctx.lineTo(barX + rr, barY + barH);
      ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - rr);
      ctx.lineTo(barX, barY + rr);
      ctx.quadraticCurveTo(barX, barY, barX + rr, barY);
      ctx.fill();
      ctx.stroke();

      // Power fill
      const fillH = barH * game.power;
      if (fillH > 0) {
        const fillGrad = ctx.createLinearGradient(barX, barY + barH - fillH, barX, barY + barH);
        fillGrad.addColorStop(0, '#FF0044');
        fillGrad.addColorStop(0.5, '#FF6600');
        fillGrad.addColorStop(1, NEON_CYAN);

        ctx.globalAlpha = 0.8;
        ctx.fillStyle = fillGrad;
        ctx.shadowColor = game.power > 0.7 ? '#FF0044' : NEON_CYAN;
        ctx.shadowBlur = 10;
        ctx.fillRect(barX + 3, barY + barH - fillH, barW - 6, fillH);
      }

      // Power percentage label
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "11px 'Orbitron', 'Courier New', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(game.power * 100) + '%', barX + barW / 2, barY + barH + 18);

      // POWER label
      ctx.save();
      ctx.translate(barX - 5, barY + barH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = NEON_CYAN;
      ctx.globalAlpha = 0.5;
      ctx.font = "9px 'Orbitron', 'Courier New', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('POWER', 0, 0);
      ctx.restore();

      ctx.restore();
    }

    renderPlacementIndicator(ctx, game) {
      if (!game.placementPos) return;

      const sp = this.toScreen(game.placementPos);
      const r = this.ballRadius();

      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 4) * 0.15;
      ctx.strokeStyle = game.isValidPlacement ? NEON_GREEN : '#FF0044';
      ctx.lineWidth = 2;
      ctx.shadowColor = game.isValidPlacement ? NEON_GREEN : '#FF0044';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(sp.x - r * 2, sp.y);
      ctx.lineTo(sp.x + r * 2, sp.y);
      ctx.moveTo(sp.x, sp.y - r * 2);
      ctx.lineTo(sp.x, sp.y + r * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Color helpers
    lightenColor(hex, amount) {
      const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
      const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
      const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
      return `rgb(${r},${g},${b})`;
    }

    darkenColor(hex, amount) {
      const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
      const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
      const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
      return `rgb(${r},${g},${b})`;
    }
  }

  return { GameRenderer };
})();

window.Renderer = Renderer;

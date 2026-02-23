/**
 * AERA LABS POOL - Advanced Physics Engine
 * Realistic billiards physics with spin, friction, and elastic collisions
 * Inspired by pooltool's physics model
 */

const Physics = (() => {
  // Physical constants
  const BALL_RADIUS = 0.028575; // meters (standard pool ball = 57.15mm diameter)
  const BALL_MASS = 0.17; // kg (standard pool ball = 170g)
  const TABLE_LENGTH = 2.3368; // meters (standard 8ft table playing surface)
  const TABLE_WIDTH = 1.1684; // meters
  const POCKET_RADIUS = 0.057; // meters (pocket opening ~114mm)
  const CORNER_POCKET_RADIUS = 0.051;
  const SIDE_POCKET_RADIUS = 0.057;

  // Friction coefficients (based on pooltool physics)
  const MU_SLIDE = 0.2; // sliding friction coefficient
  const MU_ROLL = 0.01; // rolling friction coefficient
  const MU_SPIN = 0.044; // spinning friction coefficient
  const CUSHION_RESTITUTION = 0.75; // energy retention on cushion bounce
  const BALL_RESTITUTION = 0.95; // energy retention on ball-ball collision
  const G = 9.81; // gravitational acceleration

  // Ball states
  const STATE = {
    STATIONARY: 0,
    SLIDING: 1,
    ROLLING: 2,
    SPINNING: 3,
    POCKETED: 4,
    OFF_TABLE: 5
  };

  // Simulation
  const SUBSTEPS = 20;
  const MIN_VELOCITY = 0.001;
  const MIN_ANGULAR = 0.01;

  class Ball {
    constructor(id, pos, color, isStripe = false, number = 0) {
      this.id = id;
      this.pos = pos.clone();
      this.vel = new Vec2(0, 0);
      this.angVel = { x: 0, y: 0, z: 0 }; // 3D angular velocity (spin)
      this.radius = BALL_RADIUS;
      this.mass = BALL_MASS;
      this.color = color;
      this.isStripe = isStripe;
      this.number = number;
      this.state = STATE.STATIONARY;
      this.isCue = (id === 0);
      this.is8Ball = (number === 8);
      this.pocketedIn = -1;
      this.trail = [];
      this.maxTrailLength = 20;
      this.rotation = 0;
    }

    isMoving() {
      return this.state === STATE.SLIDING ||
             this.state === STATE.ROLLING ||
             this.state === STATE.SPINNING;
    }

    isActive() {
      return this.state !== STATE.POCKETED && this.state !== STATE.OFF_TABLE;
    }

    reset(pos) {
      this.pos = pos.clone();
      this.vel = new Vec2(0, 0);
      this.angVel = { x: 0, y: 0, z: 0 };
      this.state = STATE.STATIONARY;
      this.pocketedIn = -1;
      this.trail = [];
    }

    updateTrail() {
      if (this.vel.length() > 0.05) {
        this.trail.push(this.pos.clone());
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
      } else if (this.trail.length > 0) {
        this.trail.shift();
      }
    }
  }

  class Table {
    constructor() {
      this.width = TABLE_WIDTH;
      this.length = TABLE_LENGTH;
      this.left = 0;
      this.right = TABLE_WIDTH;
      this.top = 0;
      this.bottom = TABLE_LENGTH;
      this.pockets = this.createPockets();
      this.cushions = this.createCushions();
    }

    createPockets() {
      const w = this.width;
      const l = this.length;
      const cr = CORNER_POCKET_RADIUS;
      const sr = SIDE_POCKET_RADIUS;
      const inset = 0.02; // pocket inset from rail

      return [
        { pos: new Vec2(inset, inset), radius: cr, id: 0 },                    // top-left corner
        { pos: new Vec2(w - inset, inset), radius: cr, id: 1 },                // top-right corner
        { pos: new Vec2(-0.005, l / 2), radius: sr, id: 2 },                   // left side (middle)
        { pos: new Vec2(w + 0.005, l / 2), radius: sr, id: 3 },               // right side (middle)
        { pos: new Vec2(inset, l - inset), radius: cr, id: 4 },                // bottom-left corner
        { pos: new Vec2(w - inset, l - inset), radius: cr, id: 5 }             // bottom-right corner
      ];
    }

    createCushions() {
      // Cushion segments (line segments defining the rail surfaces)
      const w = this.width;
      const l = this.length;
      const p = 0.065; // pocket mouth width offset

      return [
        // Top rail (full, no side pocket on short rail)
        { start: new Vec2(p, 0), end: new Vec2(w - p, 0), normal: new Vec2(0, 1) },
        // Bottom rail (full, no side pocket on short rail)
        { start: new Vec2(p, l), end: new Vec2(w - p, l), normal: new Vec2(0, -1) },
        // Left rail (above side pocket)
        { start: new Vec2(0, p), end: new Vec2(0, l / 2 - p), normal: new Vec2(1, 0) },
        // Left rail (below side pocket)
        { start: new Vec2(0, l / 2 + p), end: new Vec2(0, l - p), normal: new Vec2(1, 0) },
        // Right rail (above side pocket)
        { start: new Vec2(w, p), end: new Vec2(w, l / 2 - p), normal: new Vec2(-1, 0) },
        // Right rail (below side pocket)
        { start: new Vec2(w, l / 2 + p), end: new Vec2(w, l - p), normal: new Vec2(-1, 0) }
      ];
    }
  }

  class PhysicsEngine {
    constructor() {
      this.balls = [];
      this.table = new Table();
      this.events = []; // collision events for sound/effects
      this.isSimulating = false;
    }

    addBall(ball) {
      this.balls.push(ball);
      return ball;
    }

    getBall(id) {
      return this.balls.find(b => b.id === id);
    }

    allStopped() {
      return this.balls.every(b => !b.isMoving());
    }

    // Apply cue strike with spin
    strikeCueBall(direction, power, spin) {
      const cueBall = this.getBall(0);
      if (!cueBall || !cueBall.isActive()) return;

      // power is 0-1, map to velocity (max ~5 m/s for a hard shot)
      const maxSpeed = 5.0;
      const speed = power * maxSpeed;

      cueBall.vel = direction.normalize().mul(speed);

      // Apply spin based on contact point offset
      // spin.x = english (side spin), spin.y = top/back spin
      const spinFactor = speed * 30;

      // Topspin/backspin affects x angular velocity (perpendicular to travel direction)
      cueBall.angVel.x = -spin.y * spinFactor;
      // Side spin (english) affects z angular velocity (vertical axis)
      cueBall.angVel.z = spin.x * spinFactor;
      // Natural rolling component
      cueBall.angVel.y = 0;

      cueBall.state = STATE.SLIDING;
      this.isSimulating = true;

      return { type: 'strike', power: power };
    }

    // Main simulation step
    step(dt) {
      if (!this.isSimulating) return;

      this.events = [];
      const subDt = dt / SUBSTEPS;

      for (let s = 0; s < SUBSTEPS; s++) {
        // Update each ball
        for (const ball of this.balls) {
          if (!ball.isMoving()) continue;
          this.updateBall(ball, subDt);
        }

        // Check ball-ball collisions
        for (let i = 0; i < this.balls.length; i++) {
          for (let j = i + 1; j < this.balls.length; j++) {
            const a = this.balls[i];
            const b = this.balls[j];
            if (!a.isActive() || !b.isActive()) continue;
            this.resolveBallCollision(a, b);
          }
        }

        // Check ball-cushion collisions
        for (const ball of this.balls) {
          if (!ball.isActive()) continue;
          this.resolveCushionCollisions(ball);
        }

        // Check ball-pocket interactions
        for (const ball of this.balls) {
          if (!ball.isActive()) continue;
          this.checkPocket(ball);
        }
      }

      // Update ball states and trails
      for (const ball of this.balls) {
        if (ball.isMoving()) {
          ball.updateTrail();
          this.updateBallState(ball);
        }
      }

      // Check if all balls stopped
      if (this.allStopped()) {
        this.isSimulating = false;
      }
    }

    updateBall(ball, dt) {
      // Apply friction forces based on ball state
      switch (ball.state) {
        case STATE.SLIDING:
          this.applySlidingFriction(ball, dt);
          break;
        case STATE.ROLLING:
          this.applyRollingFriction(ball, dt);
          break;
        case STATE.SPINNING:
          this.applySpinningFriction(ball, dt);
          break;
      }

      // Update position
      ball.pos = ball.pos.add(ball.vel.mul(dt));

      // Update rotation for visual effect
      ball.rotation += ball.vel.length() * dt * 10;
    }

    applySlidingFriction(ball, dt) {
      // Relative velocity at contact point (sliding velocity)
      // v_rel = v - R * (omega x n), where n is the up vector
      const R = ball.radius;
      const relVelX = ball.vel.x - R * ball.angVel.y;
      const relVelY = ball.vel.y + R * ball.angVel.x;
      const relVel = new Vec2(relVelX, relVelY);
      const relSpeed = relVel.length();

      if (relSpeed < MIN_VELOCITY) {
        // Transition to rolling
        ball.state = STATE.ROLLING;
        // Set angular velocity consistent with rolling
        ball.angVel.x = -ball.vel.y / R;
        ball.angVel.y = ball.vel.x / R;
        return;
      }

      // Sliding friction force
      const frictionMag = MU_SLIDE * ball.mass * G;
      const frictionDir = relVel.normalize().mul(-1);

      // Apply friction to linear velocity
      const accel = frictionDir.mul(frictionMag / ball.mass);
      ball.vel = ball.vel.add(accel.mul(dt));

      // Apply friction to angular velocity (spin transfer)
      const angAccel = frictionMag * R / (2 / 5 * ball.mass * R * R);
      ball.angVel.x += frictionDir.y * angAccel * dt;
      ball.angVel.y -= frictionDir.x * angAccel * dt;

      // Spinning friction on z-axis
      if (Math.abs(ball.angVel.z) > MIN_ANGULAR) {
        const spinFriction = MU_SPIN * ball.mass * G * R / (2 / 5 * ball.mass * R * R);
        const spinDecel = Math.sign(ball.angVel.z) * spinFriction * dt;
        if (Math.abs(spinDecel) > Math.abs(ball.angVel.z)) {
          ball.angVel.z = 0;
        } else {
          ball.angVel.z -= spinDecel;
        }
      }
    }

    applyRollingFriction(ball, dt) {
      const speed = ball.vel.length();
      if (speed < MIN_VELOCITY) {
        ball.vel = new Vec2(0, 0);
        // Check if still spinning
        if (Math.abs(ball.angVel.z) > MIN_ANGULAR) {
          ball.state = STATE.SPINNING;
        } else {
          ball.state = STATE.STATIONARY;
          ball.angVel = { x: 0, y: 0, z: 0 };
        }
        return;
      }

      // Rolling friction deceleration
      const decel = MU_ROLL * G;
      const velDir = ball.vel.normalize();
      const newSpeed = Math.max(0, speed - decel * dt);

      ball.vel = velDir.mul(newSpeed);

      // Keep angular velocity consistent with rolling
      const R = ball.radius;
      ball.angVel.x = -ball.vel.y / R;
      ball.angVel.y = ball.vel.x / R;

      // Spinning friction on z-axis
      if (Math.abs(ball.angVel.z) > MIN_ANGULAR) {
        const spinFriction = MU_SPIN * G / R * 0.5;
        const spinDecel = Math.sign(ball.angVel.z) * spinFriction * dt;
        if (Math.abs(spinDecel) > Math.abs(ball.angVel.z)) {
          ball.angVel.z = 0;
        } else {
          ball.angVel.z -= spinDecel;
        }
      }
    }

    applySpinningFriction(ball, dt) {
      // Only z-axis spin remains
      const spinFriction = MU_SPIN * G / ball.radius * 0.8;
      const spinDecel = Math.sign(ball.angVel.z) * spinFriction * dt;

      if (Math.abs(spinDecel) > Math.abs(ball.angVel.z)) {
        ball.angVel.z = 0;
        ball.state = STATE.STATIONARY;
      } else {
        ball.angVel.z -= spinDecel;
      }
    }

    resolveBallCollision(a, b) {
      const diff = a.pos.sub(b.pos);
      const dist = diff.length();
      const minDist = a.radius + b.radius;

      if (dist >= minDist || dist === 0) return;

      // Collision normal
      const normal = diff.normalize();

      // Separate overlapping balls
      const overlap = minDist - dist;
      a.pos = a.pos.add(normal.mul(overlap / 2));
      b.pos = b.pos.sub(normal.mul(overlap / 2));

      // Relative velocity
      const relVel = a.vel.sub(b.vel);
      const relVelNormal = relVel.dot(normal);

      // Don't resolve if balls are moving apart
      if (relVelNormal > 0) return;

      // Elastic collision with restitution
      const e = BALL_RESTITUTION;
      const impulse = -(1 + e) * relVelNormal / (1 / a.mass + 1 / b.mass);

      // Apply impulse
      a.vel = a.vel.add(normal.mul(impulse / a.mass));
      b.vel = b.vel.sub(normal.mul(impulse / b.mass));

      // Transfer some spin (throw effect)
      const tangent = normal.perpCW();
      const relVelTangent = relVel.dot(tangent);
      const throwFactor = 0.02; // Small throw effect

      a.angVel.z += relVelTangent * throwFactor;
      b.angVel.z -= relVelTangent * throwFactor;

      // English transfer (side spin to velocity)
      const englishTransfer = 0.03;
      const aEnglishEffect = tangent.mul(a.angVel.z * englishTransfer);
      const bEnglishEffect = tangent.mul(b.angVel.z * englishTransfer);
      a.vel = a.vel.add(aEnglishEffect);
      b.vel = b.vel.add(bEnglishEffect);

      // Set both balls to sliding state
      if (a.vel.length() > MIN_VELOCITY) a.state = STATE.SLIDING;
      if (b.vel.length() > MIN_VELOCITY) b.state = STATE.SLIDING;

      // Record collision event
      const collisionSpeed = Math.abs(relVelNormal);
      this.events.push({
        type: 'ball_collision',
        ballA: a.id,
        ballB: b.id,
        pos: a.pos.add(b.pos).mul(0.5),
        speed: collisionSpeed,
        normal: normal.clone()
      });
    }

    resolveCushionCollisions(ball) {
      const R = ball.radius;
      const table = this.table;

      // Simple AABB cushion check with proper physics
      let hitCushion = false;
      let cushionNormal = null;
      let contactPos = null;

      // Left cushion
      if (ball.pos.x - R < table.left) {
        ball.pos.x = table.left + R;
        if (ball.vel.x < 0) {
          cushionNormal = new Vec2(1, 0);
          hitCushion = true;
          contactPos = new Vec2(table.left, ball.pos.y);
        }
      }
      // Right cushion
      if (ball.pos.x + R > table.right) {
        ball.pos.x = table.right - R;
        if (ball.vel.x > 0) {
          cushionNormal = new Vec2(-1, 0);
          hitCushion = true;
          contactPos = new Vec2(table.right, ball.pos.y);
        }
      }
      // Top cushion
      if (ball.pos.y - R < table.top) {
        ball.pos.y = table.top + R;
        if (ball.vel.y < 0) {
          cushionNormal = new Vec2(0, 1);
          hitCushion = true;
          contactPos = new Vec2(ball.pos.x, table.top);
        }
      }
      // Bottom cushion
      if (ball.pos.y + R > table.bottom) {
        ball.pos.y = table.bottom - R;
        if (ball.vel.y > 0) {
          cushionNormal = new Vec2(0, -1);
          hitCushion = true;
          contactPos = new Vec2(ball.pos.x, table.bottom);
        }
      }

      if (hitCushion && cushionNormal) {
        // Check if near a pocket - if so, don't bounce
        for (const pocket of table.pockets) {
          if (ball.pos.distanceTo(pocket.pos) < pocket.radius * 1.8) {
            return; // Near pocket, let pocket detection handle it
          }
        }

        const speed = ball.vel.length();
        const velNormal = ball.vel.dot(cushionNormal);

        // Reflect velocity with restitution
        ball.vel = ball.vel.sub(cushionNormal.mul(velNormal * (1 + CUSHION_RESTITUTION)));

        // English effect on cushion bounce
        // Side spin affects rebound angle
        const englishEffect = ball.angVel.z * 0.015 * ball.radius;
        const tangent = cushionNormal.perpCW();
        ball.vel = ball.vel.add(tangent.mul(englishEffect));

        // Cushion reverses some spin
        ball.angVel.z *= -0.4;

        // Set to sliding after cushion hit
        ball.state = STATE.SLIDING;

        this.events.push({
          type: 'cushion_collision',
          ball: ball.id,
          pos: contactPos || ball.pos.clone(),
          speed: Math.abs(velNormal),
          normal: cushionNormal.clone()
        });
      }
    }

    checkPocket(ball) {
      for (const pocket of this.table.pockets) {
        const dist = ball.pos.distanceTo(pocket.pos);

        if (dist < pocket.radius * 0.75) {
          // Ball is pocketed
          ball.state = STATE.POCKETED;
          ball.pocketedIn = pocket.id;
          ball.vel = new Vec2(0, 0);
          ball.angVel = { x: 0, y: 0, z: 0 };

          this.events.push({
            type: 'pocket',
            ball: ball.id,
            pocket: pocket.id,
            pos: pocket.pos.clone()
          });
          return;
        }

        // Gravity pull near pocket edge
        if (dist < pocket.radius * 1.3) {
          const pullDir = pocket.pos.sub(ball.pos).normalize();
          const pullStrength = (1 - dist / (pocket.radius * 1.3)) * 2.0;
          ball.vel = ball.vel.add(pullDir.mul(pullStrength * 0.016));
        }
      }
    }

    updateBallState(ball) {
      const speed = ball.vel.length();
      const spinSpeed = Math.abs(ball.angVel.z);

      if (ball.state === STATE.POCKETED || ball.state === STATE.OFF_TABLE) return;

      if (speed < MIN_VELOCITY && spinSpeed < MIN_ANGULAR) {
        ball.vel = new Vec2(0, 0);
        ball.angVel = { x: 0, y: 0, z: 0 };
        ball.state = STATE.STATIONARY;
      }
    }

    // Create standard 8-ball rack
    rackBalls() {
      const table = this.table;
      const cx = table.width / 2;
      const footSpot = table.length * 0.75;
      const d = BALL_RADIUS * 2.04; // Slight gap between balls

      // Ball colors and numbers for standard 8-ball
      const ballDefs = [
        { num: 1, color: '#FFD700', stripe: false },   // Yellow
        { num: 2, color: '#0066CC', stripe: false },    // Blue
        { num: 3, color: '#CC0000', stripe: false },    // Red
        { num: 4, color: '#660099', stripe: false },    // Purple
        { num: 5, color: '#FF6600', stripe: false },    // Orange
        { num: 6, color: '#006633', stripe: false },    // Green
        { num: 7, color: '#990033', stripe: false },    // Maroon
        { num: 8, color: '#111111', stripe: false },    // Black (8-ball)
        { num: 9, color: '#FFD700', stripe: true },     // Yellow stripe
        { num: 10, color: '#0066CC', stripe: true },    // Blue stripe
        { num: 11, color: '#CC0000', stripe: true },    // Red stripe
        { num: 12, color: '#660099', stripe: true },    // Purple stripe
        { num: 13, color: '#FF6600', stripe: true },    // Orange stripe
        { num: 14, color: '#006633', stripe: true },    // Green stripe
        { num: 15, color: '#990033', stripe: true }     // Maroon stripe
      ];

      // Standard 8-ball rack positions (5 rows)
      // Row 0: 1 ball, Row 1: 2 balls, etc.
      // 8-ball goes in center (row 2, pos 1)
      // One solid and one stripe in back corners
      const rackOrder = [0, 1, 8, 2, 14, 3, 10, 7, 12, 4, 13, 5, 11, 6, 9];
      // Indices into ballDefs: ensures 8-ball in middle, mixed corners

      const positions = [];
      let idx = 0;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
          const x = cx + (col - row / 2) * d;
          const y = footSpot + row * d * Math.sqrt(3) / 2;
          positions.push(new Vec2(x, y));
          idx++;
        }
      }

      this.balls = [];

      // Add cue ball
      const headSpot = table.length * 0.25;
      const cueBall = new Ball(0, new Vec2(cx, headSpot), '#FFFFFF', false, 0);
      cueBall.isCue = true;
      this.addBall(cueBall);

      // Add racked balls
      for (let i = 0; i < 15; i++) {
        const def = ballDefs[rackOrder[i]];
        const ball = new Ball(
          i + 1,
          positions[i],
          def.color,
          def.stripe,
          def.num
        );
        this.addBall(ball);
      }

      return this.balls;
    }
  }

  return {
    Ball,
    Table,
    PhysicsEngine,
    STATE,
    BALL_RADIUS,
    BALL_MASS,
    TABLE_LENGTH,
    TABLE_WIDTH,
    POCKET_RADIUS,
    SUBSTEPS
  };
})();

window.Physics = Physics;

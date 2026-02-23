/**
 * AERA LABS POOL - Game Logic
 * 8-ball rules, turn management, fouls, win conditions
 */

const Game = (() => {
  const GAME_STATE = {
    MENU: 'menu',
    STARTING: 'starting',
    AIMING: 'aiming',
    POWERING: 'powering',
    SIMULATING: 'simulating',
    PLACING: 'placing',     // Ball-in-hand
    TURN_END: 'turn_end',
    GAME_OVER: 'game_over'
  };

  class Player {
    constructor(name, id) {
      this.name = name;
      this.id = id;
      this.type = null; // 'solids' or 'stripes' - assigned after break
      this.score = 0;
      this.fouls = 0;
      this.wins = 0;
    }

    reset() {
      this.type = null;
      this.score = 0;
      this.fouls = 0;
    }
  }

  class GameLogic {
    constructor() {
      this.physics = new Physics.PhysicsEngine();
      this.particles = new Particles.ParticleSystem();
      this.sfx = new AudioSystem.SFX();
      this.music = new AudioSystem.MusicPlayer();

      this.players = [
        new Player('PLAYER 1', 0),
        new Player('PLAYER 2', 1)
      ];
      this.currentPlayer = 0;
      this.state = GAME_STATE.MENU;

      // Aim/shot state
      this.cueAngle = 0;
      this.power = 0;
      this.spin = { x: 0, y: 0 };
      this.aimLine = true;

      // Placement state
      this.placementPos = null;
      this.isValidPlacement = true;
      this.openTable = true; // Table is open until first ball pocketed after break

      // Turn tracking
      this.shotBalls = [];        // Balls pocketed this shot
      this.firstHitBall = null;   // First ball hit by cue ball
      this.cueBallPocketed = false;
      this.railHits = 0;         // Rails hit after contact
      this.turnMessage = '';
      this.foulMessage = '';
      this.gameMessage = '';
      this.messageTimer = 0;
      this.foulTimer = 0;

      // Break state
      this.isBreak = true;
      this.breakComplete = false;

      // Ball-in-hand
      this.ballInHand = false;
      this.behindHeadString = false; // Only behind head string on break foul

      // Pocketed balls tracking
      this.player1Pocketed = [];
      this.player2Pocketed = [];

      // Animation/timing
      this.stateTimer = 0;
      this.showTurnTransition = false;
      this.turnTransitionTimer = 0;
    }

    startGame() {
      this.physics.rackBalls();
      this.state = GAME_STATE.STARTING;
      this.stateTimer = 1.5;
      this.currentPlayer = 0;
      this.isBreak = true;
      this.breakComplete = false;
      this.openTable = true;
      this.players[0].reset();
      this.players[1].reset();
      this.player1Pocketed = [];
      this.player2Pocketed = [];
      this.turnMessage = 'BREAK SHOT';
      this.messageTimer = 2;
      this.gameMessage = '';
    }

    newGame() {
      this.startGame();
    }

    update(dt) {
      // Update particles
      this.particles.update(dt);

      // Message timers
      if (this.messageTimer > 0) {
        this.messageTimer -= dt;
      }
      if (this.foulTimer > 0) {
        this.foulTimer -= dt;
      }

      // Turn transition
      if (this.showTurnTransition) {
        this.turnTransitionTimer -= dt;
        if (this.turnTransitionTimer <= 0) {
          this.showTurnTransition = false;
        }
      }

      switch (this.state) {
        case GAME_STATE.STARTING:
          this.stateTimer -= dt;
          if (this.stateTimer <= 0) {
            this.state = GAME_STATE.AIMING;
          }
          break;

        case GAME_STATE.SIMULATING:
          this.physics.step(dt);
          this.processPhysicsEvents();

          // Ambient particles near table
          if (Math.random() < 0.02) {
            const r = this.physics.table;
            this.particles.emitAmbient(0, 0, 800, 600);
          }

          if (!this.physics.isSimulating) {
            this.evaluateShot();
          }
          break;

        case GAME_STATE.TURN_END:
          this.stateTimer -= dt;
          if (this.stateTimer <= 0) {
            if (this.ballInHand) {
              this.state = GAME_STATE.PLACING;
            } else {
              this.state = GAME_STATE.AIMING;
            }
          }
          break;

        case GAME_STATE.GAME_OVER:
          // Wait for user input
          break;
      }
    }

    processPhysicsEvents() {
      for (const event of this.physics.events) {
        switch (event.type) {
          case 'ball_collision':
            // Track first hit
            if (event.ballA === 0 && this.firstHitBall === null) {
              this.firstHitBall = event.ballB;
            } else if (event.ballB === 0 && this.firstHitBall === null) {
              this.firstHitBall = event.ballA;
            }

            // Sound and particles
            this.sfx.ballHit(event.speed);
            if (event.speed > 0.3) {
              const sp = this.worldToScreen(event.pos);
              if (sp) {
                this.particles.emitCollisionSparks(sp.x, sp.y, event.speed, event.normal);
              }
            }
            break;

          case 'cushion_collision':
            this.railHits++;
            this.sfx.cushionHit(event.speed);
            if (event.speed > 0.3) {
              const sp = this.worldToScreen(event.pos);
              if (sp) {
                this.particles.emitCushionSparks(sp.x, sp.y, event.speed, event.normal);
              }
            }
            break;

          case 'pocket':
            const ball = this.physics.getBall(event.ball);
            if (ball.isCue) {
              this.cueBallPocketed = true;
            } else {
              this.shotBalls.push(ball);
            }
            this.sfx.pocket();
            const sp = this.worldToScreen(event.pos);
            if (sp) {
              this.particles.emitPocketEffect(sp.x, sp.y);
            }
            break;
        }
      }
    }

    worldToScreen(physPos) {
      if (!this._renderer) return null;
      return this._renderer.toScreen(physPos);
    }

    setRenderer(renderer) {
      this._renderer = renderer;
    }

    evaluateShot() {
      const player = this.players[this.currentPlayer];
      const opponent = this.players[1 - this.currentPlayer];
      let foul = false;
      let switchTurn = true;
      let foulReason = '';

      // Check for fouls
      // 1. Cue ball pocketed (scratch)
      if (this.cueBallPocketed) {
        foul = true;
        foulReason = 'SCRATCH';
      }

      // 2. No ball hit
      if (!this.firstHitBall && !foul) {
        foul = true;
        foulReason = 'NO BALL HIT';
      }

      // 3. Wrong ball hit first (after table is assigned)
      if (this.firstHitBall && !this.openTable && player.type && !foul) {
        const hitBall = this.physics.getBall(this.firstHitBall);
        if (hitBall) {
          const isHitSolid = !hitBall.isStripe && !hitBall.is8Ball;
          const isHitStripe = hitBall.isStripe && !hitBall.is8Ball;

          if (player.type === 'solids' && !isHitSolid && !hitBall.is8Ball) {
            // Check if player has cleared their balls (can now shoot 8-ball)
            if (!this.playerClearedBalls(this.currentPlayer)) {
              foul = true;
              foulReason = 'WRONG BALL FIRST';
            }
          } else if (player.type === 'stripes' && !isHitStripe && !hitBall.is8Ball) {
            if (!this.playerClearedBalls(this.currentPlayer)) {
              foul = true;
              foulReason = 'WRONG BALL FIRST';
            }
          }

          // Can't hit 8-ball first unless player has cleared all their balls
          if (hitBall.is8Ball && !this.playerClearedBalls(this.currentPlayer)) {
            foul = true;
            foulReason = 'HIT 8-BALL EARLY';
          }
        }
      }

      // 4. No rail after contact (if no ball pocketed)
      if (!foul && this.firstHitBall && this.shotBalls.length === 0 && this.railHits === 0) {
        foul = true;
        foulReason = 'NO RAIL CONTACT';
      }

      // Handle break shot
      if (this.isBreak) {
        this.isBreak = false;
        this.breakComplete = true;

        // On break, must hit the rack and either pocket a ball or drive 4 balls to rail
        if (!this.firstHitBall) {
          foul = true;
          foulReason = 'MISSED RACK';
        }

        // 8-ball pocketed on break - re-spot it
        const eightBall = this.physics.balls.find(b => b.is8Ball);
        if (eightBall && eightBall.state === Physics.STATE.POCKETED) {
          this.turnMessage = '8-BALL ON BREAK - RE-SPOT';
          this.messageTimer = 2;
          eightBall.reset(new Vec2(Physics.TABLE_WIDTH / 2, Physics.TABLE_LENGTH * 0.75));
          // Remove from shotBalls so it doesn't trigger game-over
          this.shotBalls = this.shotBalls.filter(b => !b.is8Ball);
        }
      }

      // Check if 8-ball was pocketed
      const eightBallPocketed = this.shotBalls.some(b => b.is8Ball);

      if (eightBallPocketed) {
        if (foul) {
          // Pocketed 8-ball on a foul = lose
          this.gameOver(1 - this.currentPlayer, 'POTTED 8-BALL ON FOUL');
          return;
        }

        if (!this.playerClearedBalls(this.currentPlayer)) {
          // Pocketed 8-ball before clearing own balls = lose
          this.gameOver(1 - this.currentPlayer, 'EARLY 8-BALL');
          return;
        }

        // Legal 8-ball pocket = win!
        this.gameOver(this.currentPlayer, 'SUNK THE 8-BALL');
        return;
      }

      // Handle foul
      if (foul) {
        player.fouls++;
        this.sfx.foul();
        this.foulMessage = 'FOUL: ' + foulReason;
        this.foulTimer = 2.5;
        this.ballInHand = true;
        this.behindHeadString = false;

        // Restore cue ball if scratched
        if (this.cueBallPocketed) {
          const cueBall = this.physics.getBall(0);
          cueBall.reset(new Vec2(Physics.TABLE_WIDTH / 2, Physics.TABLE_LENGTH * 0.25));
          cueBall.state = Physics.STATE.STATIONARY;
        }

        switchTurn = true;
      } else {
        // No foul - check if any balls were pocketed
        if (this.shotBalls.length > 0) {
          // Assign ball types if open table
          if (this.openTable && !this.isBreak) {
            const pocketedSolid = this.shotBalls.some(b => !b.isStripe && !b.is8Ball);
            const pocketedStripe = this.shotBalls.some(b => b.isStripe && !b.is8Ball);

            if (pocketedSolid && !pocketedStripe) {
              player.type = 'solids';
              opponent.type = 'stripes';
              this.openTable = false;
              this.turnMessage = `${player.name} → SOLIDS`;
              this.messageTimer = 2;
            } else if (pocketedStripe && !pocketedSolid) {
              player.type = 'stripes';
              opponent.type = 'solids';
              this.openTable = false;
              this.turnMessage = `${player.name} → STRIPES`;
              this.messageTimer = 2;
            }
            // If both pocketed, table remains open
          }

          // Track pocketed balls per player
          for (const ball of this.shotBalls) {
            if (ball.is8Ball) continue;
            if (this.currentPlayer === 0) {
              this.player1Pocketed.push(ball);
            } else {
              this.player2Pocketed.push(ball);
            }
            player.score++;
          }

          // Player pocketed a ball legally - continue turn
          switchTurn = false;
          this.turnMessage = 'NICE SHOT!';
          this.messageTimer = 1.5;
        } else {
          // No balls pocketed - safety play
          switchTurn = true;
        }
      }

      // Reset shot tracking
      this.shotBalls = [];
      this.firstHitBall = null;
      this.cueBallPocketed = false;
      this.railHits = 0;

      if (switchTurn) {
        this.currentPlayer = 1 - this.currentPlayer;
        this.showTurnTransition = true;
        this.turnTransitionTimer = 1.5;
        this.turnMessage = this.players[this.currentPlayer].name + "'S TURN";
        this.messageTimer = 2;
      }

      this.state = GAME_STATE.TURN_END;
      this.stateTimer = switchTurn ? 1.0 : 0.5;
    }

    playerClearedBalls(playerIdx) {
      const player = this.players[playerIdx];
      if (!player.type) return false;

      const isSolids = player.type === 'solids';
      const remaining = this.physics.balls.filter(b => {
        if (!b.isActive() || b.isCue || b.is8Ball) return false;
        return isSolids ? !b.isStripe : b.isStripe;
      });

      return remaining.length === 0;
    }

    gameOver(winnerIdx, reason) {
      this.state = GAME_STATE.GAME_OVER;
      this.players[winnerIdx].wins++;

      this.gameMessage = `${this.players[winnerIdx].name} WINS!`;
      this.turnMessage = reason;
      this.messageTimer = 999;

      this.sfx.victory();

      // Victory particles
      setTimeout(() => {
        this.particles.emitVictory(400, 300);
        setTimeout(() => this.particles.emitVictory(500, 350), 200);
        setTimeout(() => this.particles.emitVictory(350, 280), 400);
      }, 300);
    }

    // Input handling
    handleAim(screenX, screenY) {
      // Lock aim angle once powering (drag in progress)
      if (this.state !== GAME_STATE.AIMING) return;

      const cueBall = this.physics.getBall(0);
      if (!cueBall || !cueBall.isActive()) return;

      const sp = this._renderer.toScreen(cueBall.pos);
      this.cueAngle = Math.atan2(screenY - sp.y, screenX - sp.x);
    }

    handlePowerDrag(dragDist) {
      if (this.state !== GAME_STATE.AIMING && this.state !== GAME_STATE.POWERING) return;

      // Map drag distance to power (0-1)
      this.power = Math.min(1, dragDist / 200);
      if (this.power > 0.02) {
        this.state = GAME_STATE.POWERING;
      }
    }

    handleShoot(screenX, screenY, dragDist) {
      if (this.state !== GAME_STATE.AIMING && this.state !== GAME_STATE.POWERING) return;

      // Need minimum power to shoot
      const power = Math.min(1, dragDist / 200);
      if (power < 0.02) {
        this.state = GAME_STATE.AIMING;
        return;
      }

      const cueBall = this.physics.getBall(0);
      if (!cueBall || !cueBall.isActive()) return;

      const dir = Vec2.fromAngle(this.cueAngle);

      // Strike particles
      const sp = this._renderer.toScreen(cueBall.pos);
      this.particles.emitStrikeEffect(sp.x, sp.y, dir.x, dir.y, power);

      // Physics strike
      this.physics.strikeCueBall(dir, power, this.spin);
      this.sfx.strike(power);

      // Reset shot tracking
      this.shotBalls = [];
      this.firstHitBall = null;
      this.cueBallPocketed = false;
      this.railHits = 0;

      this.power = 0;
      this.state = GAME_STATE.SIMULATING;
    }

    handlePlacement(screenX, screenY) {
      if (this.state !== GAME_STATE.PLACING) return;

      const physPos = this._renderer.toPhysics(screenX, screenY);
      this.placementPos = physPos;

      // Validate placement
      const table = this.physics.table;
      const R = Physics.BALL_RADIUS;

      let valid = true;

      // Must be on the table
      if (physPos.x - R < table.left || physPos.x + R > table.right ||
          physPos.y - R < table.top || physPos.y + R > table.bottom) {
        valid = false;
      }

      // Must not overlap with other balls
      if (valid) {
        for (const ball of this.physics.balls) {
          if (ball.isCue || !ball.isActive()) continue;
          if (physPos.distanceTo(ball.pos) < R * 2.2) {
            valid = false;
            break;
          }
        }
      }

      // If behind head string required
      if (valid && this.behindHeadString) {
        if (physPos.y > Physics.TABLE_LENGTH * 0.25) {
          valid = false;
        }
      }

      this.isValidPlacement = valid;
    }

    confirmPlacement() {
      if (this.state !== GAME_STATE.PLACING || !this.isValidPlacement || !this.placementPos) return false;

      const cueBall = this.physics.getBall(0);
      cueBall.reset(this.placementPos);

      this.ballInHand = false;
      this.behindHeadString = false;
      this.placementPos = null;
      this.state = GAME_STATE.AIMING;

      this.sfx.uiClick();
      return true;
    }

    // Spin control
    setSpin(x, y) {
      this.spin.x = Math.max(-1, Math.min(1, x));
      this.spin.y = Math.max(-1, Math.min(1, y));
    }

    resetSpin() {
      this.spin = { x: 0, y: 0 };
    }

    // Get game info for UI
    getGameInfo() {
      const player = this.players[this.currentPlayer];
      const opponent = this.players[1 - this.currentPlayer];

      // Count remaining balls per type
      let solidsRemaining = 0;
      let stripesRemaining = 0;
      for (const ball of this.physics.balls) {
        if (!ball.isActive() || ball.isCue || ball.is8Ball) continue;
        if (ball.isStripe) stripesRemaining++;
        else solidsRemaining++;
      }

      return {
        currentPlayer: player,
        opponent: opponent,
        state: this.state,
        isBreak: this.isBreak,
        openTable: this.openTable,
        solidsRemaining,
        stripesRemaining,
        turnMessage: this.messageTimer > 0 ? this.turnMessage : '',
        foulMessage: this.foulTimer > 0 ? this.foulMessage : '',
        gameMessage: this.gameMessage,
        player1Pocketed: this.player1Pocketed,
        player2Pocketed: this.player2Pocketed
      };
    }
  }

  return {
    GameLogic,
    Player,
    GAME_STATE
  };
})();

window.Game = Game;

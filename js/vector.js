/**
 * AERA LABS POOL - Vector Mathematics
 * 2D Vector class for physics calculations
 */

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  mul(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  div(s) {
    if (s === 0) return new Vec2(0, 0);
    return new Vec2(this.x / s, this.y / s);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return this.div(len);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  perpCW() {
    return new Vec2(this.y, -this.x);
  }

  perpCCW() {
    return new Vec2(-this.y, this.x);
  }

  reflect(normal) {
    const d = this.dot(normal) * 2;
    return this.sub(normal.mul(d));
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v) {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  distanceTo(v) {
    return this.sub(v).length();
  }

  distanceToSq(v) {
    return this.sub(v).lengthSq();
  }

  lerp(v, t) {
    return new Vec2(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }

  static fromAngle(angle, length = 1) {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static random(minX, maxX, minY, maxY) {
    return new Vec2(
      minX + Math.random() * (maxX - minX),
      minY + Math.random() * (maxY - minY)
    );
  }
}

window.Vec2 = Vec2;

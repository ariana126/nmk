export abstract class ValueObject {
  public equals(other: this): boolean {
    if (other === null || other === undefined) return false;
    if (this.constructor !== other.constructor) return false;
    const thisKeys = Object.keys(this);
    const otherKeys = Object.keys(other);
    if (thisKeys.length !== otherKeys.length) return false;
    return thisKeys.every(
      (key) =>
        JSON.stringify((this as Record<string, unknown>)[key]) ===
        JSON.stringify((other as Record<string, unknown>)[key]),
    );
  }
}

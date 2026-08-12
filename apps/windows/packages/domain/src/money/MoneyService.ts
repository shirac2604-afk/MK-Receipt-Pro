export class MoneyService {
  static assertValidAgorot(value: number): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error("INVALID_AMOUNT_AGOROT");
    }
  }

  static format(value: number): string {
    this.assertValidAgorot(value);
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  }
}

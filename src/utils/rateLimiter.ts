export class orsRateLimiter {
  private minuteCalls: number[] = [];
  private dailyCalls: number[] = [];
  private readonly MINUTE_LIMIT: number;
  private readonly DAILY_LIMIT: number;

  constructor(minuteLimit: number, dailyLimit: number) {
    this.MINUTE_LIMIT = minuteLimit;
    this.DAILY_LIMIT = dailyLimit;
  }

  consume() {
    const now = Date.now();

    // Remove old timestamps
    this.minuteCalls = this.minuteCalls.filter((t) => now - t < 60 * 1000);
    this.dailyCalls = this.dailyCalls.filter((t) => now - t < 24 * 60 * 60 * 1000);

    // Check limits
    if (this.minuteCalls.length >= this.MINUTE_LIMIT) {
      const err = new Error("RATE_LIMIT_EXCEEDED_MINUTE");
      (err as any).code = "RATE_LIMIT_EXCEEDED_MINUTE";
      throw err;
    }
    if (this.dailyCalls.length >= this.DAILY_LIMIT) {
      const err = new Error("RATE_LIMIT_EXCEEDED_DAILY");
      (err as any).code = "RATE_LIMIT_EXCEEDED_DAILY";
      throw err;
    }

    // Record this call
    this.minuteCalls.push(now);
    this.dailyCalls.push(now);
  }
}

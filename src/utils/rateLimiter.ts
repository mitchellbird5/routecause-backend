export interface RateLimitStatus {
  minuteRemaining: number;
  minuteResetMs: number;
  dailyRemaining: number;
  dailyResetMs: number;
}

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
    const nowUTC = new Date();
    const startOfMinuteUTC = Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate(),
      nowUTC.getUTCHours(),
      nowUTC.getUTCMinutes()
    );

    this.minuteCalls = this.minuteCalls.filter((t) => t >= startOfMinuteUTC);

    const startOfDayUTC = Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate()
    );
    this.dailyCalls = this.dailyCalls.filter((t) => t >= startOfDayUTC);

    const status = this.getStatus();

    // Check limits
    if (this.minuteCalls.length >= this.MINUTE_LIMIT) {
      throw new OrsRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_MINUTE",
        429,
        "minute",
        status.minuteRemaining,
        status.minuteResetMs,
        status.dailyRemaining,
        status.dailyResetMs
      );
    }

    // --- Check daily limit ---
    if (this.dailyCalls.length >= this.DAILY_LIMIT) {
      throw new OrsRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_DAILY",
        429,
        "daily",
        status.minuteRemaining,
        status.minuteResetMs,
        status.dailyRemaining,
        status.dailyResetMs
      );
    }

    // Record this call
    this.minuteCalls.push(now);
    this.dailyCalls.push(now);
  }

  getStatus(): RateLimitStatus {
    const now = Date.now();
    const nowUTC = new Date();

    // --- Minute remaining & reset ---
    const startOfMinuteUTC = Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate(),
      nowUTC.getUTCHours(),
      nowUTC.getUTCMinutes()
    );
    const minuteRemaining = Math.max(0, this.MINUTE_LIMIT - this.minuteCalls.length);
    const minuteResetMs = startOfMinuteUTC + 60_000 - now; // time until top of next UTC minute

    // --- Daily remaining & reset ---
    const startOfDayUTC = Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate()
    );
    const dailyRemaining = Math.max(0, this.DAILY_LIMIT - this.dailyCalls.length);
    const dailyResetMs = startOfDayUTC + 24 * 60 * 60_000 - now; // time until next UTC midnight

    return { minuteRemaining, minuteResetMs, dailyRemaining, dailyResetMs };
  }
}

export class OrsRateLimitExceededError extends Error {
  status: number;
  limitFreq: "minute" | "daily";
  minuteRemaining: number;
  minuteResetMs: number;
  dailyRemaining: number;
  dailyResetMs: number;

  constructor(
    message: string,
    status: number,
    limitFreq: "minute" | "daily",
    minuteRemaining: number,
    minuteResetMs: number,
    dailyRemaining: number,
    dailyResetMs: number
  ) {
    super(message);
    this.status = status;
    this.limitFreq = limitFreq;
    this.minuteRemaining = minuteRemaining;
    this.minuteResetMs = minuteResetMs;
    this.dailyRemaining = dailyRemaining;
    this.dailyResetMs = dailyResetMs;
  }
}

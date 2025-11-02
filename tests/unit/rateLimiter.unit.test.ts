import { orsRateLimiter, OrsRateLimitExceededError } from "../../src/utils/rateLimiter";

describe("orsRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-11-02T00:00:00Z").getTime()); // Start at UTC midnight
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows calls below limits", () => {
    const limiter = new orsRateLimiter(3, 5);

    expect(() => limiter.consume()).not.toThrow();
    expect(() => limiter.consume()).not.toThrow();
    expect(() => limiter.consume()).not.toThrow();
  });

  it("throws RATE_LIMIT_EXCEEDED_MINUTE when minute limit reached", () => {
    const limiter = new orsRateLimiter(2, 10);

    limiter.consume();
    limiter.consume();

    expect(() => limiter.consume()).toThrow(OrsRateLimitExceededError);

    try {
      limiter.consume();
    } catch (err: any) {
      expect(err).toBeInstanceOf(OrsRateLimitExceededError);
      expect(err.limit_freq).toBe("minute");
      expect(err.status).toBe(429);
      expect(err.minuteRemaining).toBe(0);
    }
  });

  it("throws RATE_LIMIT_EXCEEDED_DAILY when daily limit reached", () => {
    const limiter = new orsRateLimiter(100, 2);

    limiter.consume();
    limiter.consume();

    expect(() => limiter.consume()).toThrow(OrsRateLimitExceededError);

    try {
      limiter.consume();
    } catch (err: any) {
      expect(err).toBeInstanceOf(OrsRateLimitExceededError);
      expect(err.limit_freq).toBe("daily");
      expect(err.status).toBe(429);
      expect(err.dailyRemaining).toBe(0);
    }
  });

  it("resets minute window at top of UTC minute", () => {
    const limiter = new orsRateLimiter(2, 10);

    limiter.consume(); // t=00:00:00
    limiter.consume(); // hit minute limit

    // Advance to next UTC minute
    jest.advanceTimersByTime(60_000);

    expect(() => limiter.consume()).not.toThrow();
  });

  it("resets daily window at UTC midnight", () => {
    const limiter = new orsRateLimiter(10, 2);

    limiter.consume(); // first call
    limiter.consume(); // hit daily limit

    // Advance to next UTC day
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(() => limiter.consume()).not.toThrow();
  });

  it("records new timestamps correctly", () => {
    const limiter = new orsRateLimiter(5, 5);
    limiter.consume();
    limiter.consume();

    // @ts-ignore access private fields for test
    expect(limiter["minuteCalls"].length).toBe(2);
    // @ts-ignore
    expect(limiter["dailyCalls"].length).toBe(2);
  });

  it("getStatus returns correct remaining calls and reset times", () => {
    const limiter = new orsRateLimiter(5, 10);
    limiter.consume();
    limiter.consume();

    const status = limiter.getStatus();

    expect(status.minuteRemaining).toBe(3);
    expect(status.dailyRemaining).toBe(8);
    expect(status.minuteResetMs).toBeGreaterThan(0);
    expect(status.dailyResetMs).toBeGreaterThan(0);
  });
});

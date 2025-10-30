import { orsRateLimiter } from "../../src/utils/rateLimiter";

describe("orsRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Control time
    jest.setSystemTime(0); // Start at t=0
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows calls below limits", () => {
    const limiter = new orsRateLimiter(3, 5);

    // Should not throw until limits exceeded
    expect(() => limiter.consume()).not.toThrow();
    expect(() => limiter.consume()).not.toThrow();
    expect(() => limiter.consume()).not.toThrow();
  });

  it("throws RATE_LIMIT_EXCEEDED_MINUTE when minute limit reached", () => {
    const limiter = new orsRateLimiter(2, 10);

    limiter.consume();
    limiter.consume();

    expect(() => limiter.consume()).toThrowError("RATE_LIMIT_EXCEEDED_MINUTE");

    try {
      limiter.consume();
    } catch (err: any) {
      expect(err.code).toBe("RATE_LIMIT_EXCEEDED_MINUTE");
    }
  });

  it("throws RATE_LIMIT_EXCEEDED_DAILY when daily limit reached", () => {
    const limiter = new orsRateLimiter(100, 2);

    limiter.consume();
    limiter.consume();

    expect(() => limiter.consume()).toThrowError("RATE_LIMIT_EXCEEDED_DAILY");

    try {
      limiter.consume();
    } catch (err: any) {
      expect(err.code).toBe("RATE_LIMIT_EXCEEDED_DAILY");
    }
  });

  it("removes old timestamps older than a minute for minuteCalls", () => {
    const limiter = new orsRateLimiter(2, 10);

    limiter.consume(); // t=0
    jest.advanceTimersByTime(61_000); // 61 seconds later
    limiter.consume(); // old timestamp should be removed

    // Should allow another call because old one expired
    expect(() => limiter.consume()).not.toThrow();
  });

  it("removes old timestamps older than a day for dailyCalls", () => {
    const limiter = new orsRateLimiter(10, 2);

    limiter.consume(); // t=0
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000); // just over 24 hours later
    limiter.consume(); // first call should expire

    // Should allow another call because first one was too old
    expect(() => limiter.consume()).not.toThrow();
  });

  it("records new timestamps correctly", () => {
    const limiter = new orsRateLimiter(5, 5);
    limiter.consume();
    limiter.consume();

    // @ts-ignore accessing private fields for test
    expect(limiter["minuteCalls"].length).toBe(2);
    // @ts-ignore
    expect(limiter["dailyCalls"].length).toBe(2);
  });
});

interface WindowState {
  count: number;
  resetAt: number;
}

export class SocketRateLimiter {
  private readonly windows = new Map<string, WindowState>();

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number,
  ) {}

  allow(socketId: string): boolean {
    const now = Date.now();
    const current = this.windows.get(socketId);
    if (!current || current.resetAt <= now) {
      this.windows.set(socketId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    current.count += 1;
    return current.count <= this.maxEvents;
  }

  remove(socketId: string): void {
    this.windows.delete(socketId);
  }
}

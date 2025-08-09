// Augment Express Request with userId from JWT middleware
export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

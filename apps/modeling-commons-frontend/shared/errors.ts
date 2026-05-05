export class ApiError extends Error {
  constructor(
    private readonly internalError: unknown,
    public override message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  handle() {
    if (import.meta.dev) {
      console.error(`${this.name} (status: ${this.status}): ${this.message}`, this.internalError);
    }
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, internalError?: unknown) {
    super(internalError, message, 404);
    this.name = "NotFoundError";
  }
}

export class GeneralFailureError extends ApiError {
  constructor(message: string, internalError?: unknown) {
    super(internalError, message);
    this.name = "GeneralFailureError";
  }
}

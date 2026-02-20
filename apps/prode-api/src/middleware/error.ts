import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof Error && "issues" in error) {
    res.status(400).json({ error: "Validation error", details: (error as { issues: unknown }).issues });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

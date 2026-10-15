import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../utils/http-error.js";


// Runs when no route matched the URL.
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Route not found" });
};


// Every error thrown in a controller ends up here.
// This is the only place that decides how errors look to the client.
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // If a response was already started, let Express handle it.
  if (res.headersSent) {
    next(err);
    return;
  }

  // Errors we threw on purpose: badRequest(), notFound(), forbidden() ...
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  // Errors from express.json(): broken JSON or a body that is too large.
  const status: unknown = err?.status;

  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ message: err.type === "entity.parse.failed" ? "Malformed JSON body" : "Invalid request" });
    return;
  }

  // Known database errors.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Record to update or delete was not found.
    if (err.code === "P2025") {
      res.status(404).json({ message: "Resource not found" });
      return;
    }

    // Unique constraint failed (e.g. duplicate email).
    if (err.code === "P2002") {
      res.status(409).json({ message: "Resource already exists" });
      return;
    }

    // Foreign key constraint failed.
    if (err.code === "P2003") {
      res.status(409).json({ message: "Operation conflicts with related data" });
      return;
    }
  }

  // Anything else is a bug. Log it for us, hide the details from the client.
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};

import { NextFunction, Request, Response } from "express";

export const ensureAuth = (req: Request, res: Response, next: NextFunction) => {
  return req.isAuthenticated() ? next() : res.status(401).send("Unauthorized");
};

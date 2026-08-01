import { Router } from "express";
import express from "express";
import { slackController } from "../controllers/slackController";

export const slackRoutes = Router();

slackRoutes.post(
  "/interactions",
  express.urlencoded({
    extended: true,
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody =
        buf.toString("utf8");
    },
  }),
  slackController.interactions
);

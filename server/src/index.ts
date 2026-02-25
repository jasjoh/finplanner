import "reflect-metadata";
import express from "express";
import { config } from "./config/index.js";
import { basicAuthMiddleware } from "./middleware/auth.js";
import { healthRouter } from "./routes/health.js";

const app = express();
app.use(express.json());

// Unauthenticated routes (must be mounted first)
app.use("/api", healthRouter);

// Authenticated routes: require HTTP Basic auth
const apiRouter = express.Router();
app.use("/api", basicAuthMiddleware, apiRouter);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

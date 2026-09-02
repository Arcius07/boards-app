const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/test-db", async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ connected: true, userCount });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes(prisma));

const workspaceRoutes = require("./routes/workspace.routes");
app.use("/workspaces", workspaceRoutes(prisma));

const boardRoutes = require("./routes/board.routes");
app.use("/boards", boardRoutes(prisma));

const listRoutes = require("./routes/list.routes");
app.use("/lists", listRoutes(prisma));

const cardRoutes = require("./routes/card.routes");
app.use("/cards", cardRoutes(prisma));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
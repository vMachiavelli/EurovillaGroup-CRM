import express from "express";
import cors from "cors";
import propertiesRouter from "./routes/properties.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ATT CRM API" });
});

app.use("/api/properties", propertiesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

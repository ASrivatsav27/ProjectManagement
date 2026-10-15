import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

const port = Number(process.env.PORT) || 8000;

try {
  await connectDB();
} catch (error) {
  console.error("Database connection failed:", error);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

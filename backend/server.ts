import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

connectDB();

app.listen(8000, () => {
    console.log("Server is running on port 8000")
})

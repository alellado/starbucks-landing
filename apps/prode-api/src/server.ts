import { app } from "./app.js";
import { env } from "./config/env.js";

const port = env.PORT ?? env.API_PORT;

app.listen(port, () => {
  console.log(`Prode API listening on http://localhost:${port}`);
});

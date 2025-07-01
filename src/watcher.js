// watcher.js
import chokidar from "chokidar";

const watcher = chokidar.watch("./tests/example-test-project/pug/**/*.pug", {
  ignoreInitial: false,
});

watcher.on("ready", () => {
  console.log("✅ chokidar ready");
});

watcher.on("all", (event, file) => {
  console.log(`🔁 ${event} on ${file}`);
});

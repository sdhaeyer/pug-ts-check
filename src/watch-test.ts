import chokidar from "chokidar";

const target = "./tests/example-test-project/pug/**/*.pug";

console.log("watching:", target);

const watcher = chokidar.watch(target, {
  ignoreInitial: false,
});

watcher.on("ready", () => {
  console.log("✅ chokidar ready");
});

watcher.on("all", (event, path) => {
  console.log(`🔁 EVENT: ${event} on ${path}`);
});

watcher.on("error", (err) => {
  console.error(`chokidar error: ${err}`);
});

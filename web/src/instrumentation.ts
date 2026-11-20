/** Runs once in every server process: the whole portal works in Pakistan time (PKT, UTC+5), Nov 2026. */
export function register() {
  process.env.TZ = "Asia/Karachi";
}

/** Public sign-up is on by default; set ALLOW_SIGNUP=false (server env) to turn the page and action off. */
export function isSignupEnabled() {
  return process.env.ALLOW_SIGNUP !== "false";
}

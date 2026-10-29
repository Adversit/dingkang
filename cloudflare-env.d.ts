declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    FEEDBACK_OWNER_EMAIL?: string;
    FEEDBACK_RATE_SALT?: string;
  }
}

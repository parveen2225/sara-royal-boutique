/** Sample-data seeding is for development only. In production it needs an explicit ALLOW_SEED=true. */
export const seedAllowed = (): boolean => process.env.NODE_ENV !== "production" || process.env.ALLOW_SEED === "true";
export const SEED_DISABLED_MESSAGE = "Sample-data seeding is disabled in production.";

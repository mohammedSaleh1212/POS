import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL as string,
  
};

// Validate critical environment variables at startup
const requiredKeys: Array<keyof typeof config> = [
  'databaseUrl',

];

for (const key of requiredKeys) {
  if (!config[key] && Number.isNaN(config[key])) {
    throw new Error(`FATAL: Config verification failed. The property '${key}' is undefined or invalid in the environment configuration.`);
  }
}
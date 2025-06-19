import dotenv from 'dotenv';
const envFile = process.argv[2] || '.env.dev';
dotenv.config({ path: envFile });

import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'null_auth_default_super_secret_key_2026';

if (env === 'production' && jwtSecret === 'null_auth_default_super_secret_key_2026') {
  console.warn('[SECURITY WARNING] Insecure default JWT_SECRET is being used in production! Please set process.env.JWT_SECRET.');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  env,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};


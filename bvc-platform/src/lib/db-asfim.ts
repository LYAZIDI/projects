import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPoolAsfim: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.ASFIM_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

const asfimPool: Pool = globalThis._pgPoolAsfim ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgPoolAsfim = asfimPool;
}

export default asfimPool;

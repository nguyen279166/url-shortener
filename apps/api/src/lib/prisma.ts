import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const pool = new Pool(env.DATABASE_URL ? { connectionString: env.DATABASE_URL } : {});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export default prisma;

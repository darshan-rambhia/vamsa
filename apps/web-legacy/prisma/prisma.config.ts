import { defineConfig } from "@prisma/internals";

export default defineConfig({
  adapter: "postgresql",
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://vamsa:password@localhost:5432/vamsa",
    },
  },
});

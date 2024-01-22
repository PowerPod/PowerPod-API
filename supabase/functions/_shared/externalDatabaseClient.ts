import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

export const pgClient = new Client({
  user: Deno.env.get('PG_USER'),
  hostname: Deno.env.get('PG_HOST'),
  database: Deno.env.get('PG_DATABASE'),
  password: Deno.env.get('PG_PASSWORD') ?? '',
  port: 5432,
  tls: {
    enabled: false, // This explicitly disables SSL/TLS for the connection
  },
})

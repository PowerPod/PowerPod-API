# ppd-api

## Running Egde Functions Locally

```bash
cd your-project/supabase
supabase start # start the supabase stack
supabase functions serve # start the Functions watcher
```

## Testing Invoking Edge Functions locally

```bash
curl --request POST 'http://localhost:54321/functions/v1/hello-world' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{ "name":"Functions" }'
```

## Get nonce for signature

```bash
curl --request POST 'http://localhost:54321/functions/v1/get-nonce' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{ "publicAddress":"0x7...d64A" }'
```

## Binding Device

```bash
curl --request POST 'http://localhost:54321/functions/v1/divice-binding' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{ "publicAddress":"0x7...d64A", "message":"", "signature":"", "publisherName":"" }'
```

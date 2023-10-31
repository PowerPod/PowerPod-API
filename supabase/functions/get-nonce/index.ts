import { generateNonce as getNonce } from 'siwe'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { isAddress } from '@ethersproject/address'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { publicAddress } = await req.json()

    if (!publicAddress) throw new Error('missing params')

    if (!isAddress(publicAddress)) {
      throw new Error('Invalid public address')
    }

    const { data: fetchData, error: fetchError } = await supabaseAdmin
      .from('t_nonces')
      .select()
      .eq('id', publicAddress)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    let data = fetchData[0]
    if (fetchData.length == 0) {
      // Generate a random nonce
      const nonce = getNonce()

      const { error: insertError } = await supabaseAdmin
        .from('t_nonces')
        .insert({ id: publicAddress, nonce: nonce })

      if (insertError) {
        throw new Error(insertError.message)
      }

      data = { id: publicAddress, nonce: nonce }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

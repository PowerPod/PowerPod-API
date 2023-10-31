import { generateNonce as getNonce, SiweMessage } from 'siwe'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { publicAddress, message, signature, publisherName } =
      await req.json()

    if (!publicAddress || !message || !signature || !publisherName)
      throw new Error('missing params')

    const { data: fetchDeviceData, error: fetchDeviceError } =
      await supabaseAdmin
        .from('device_info')
        .select('id')
        .eq('publisher_name', publisherName)

    if (fetchDeviceError) {
      throw new Error(fetchDeviceError.message)
    }

    if (fetchDeviceData.length == 0) {
      throw new Error('Device does not exist')
    }

    const { data: fetchData, error: fetchError } = await supabaseAdmin
      .from('t_nonces')
      .select('id, nonce')
      .eq('id', publicAddress)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (fetchData.length == 0) {
      throw new Error('Invalid public address')
    }

    const { nonce } = fetchData[0].nonce

    const siweMessage = new SiweMessage(message)
    const resp = await siweMessage.verify({ signature })

    if (!resp.success && resp.error) {
      throw new Error(resp.error.type)
    }

    if (resp.data.nonce !== nonce) {
      throw new Error('Invalid signature')
    }

    const newNonce = getNonce()
    const { error: updateError } = await supabaseAdmin
      .from('t_nonces')
      .update({ nonce: newNonce })
      .eq('id', publicAddress)

    if (updateError) {
      throw new Error(updateError.message)
    }

    const { error: insertError } = await supabaseAdmin
      .from('device_binding')
      .insert({ publisher_name: publisherName, owner_address: publicAddress })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

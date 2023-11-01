import { generateNonce as getNonce, SiweMessage } from 'siwe'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { isAddress } from '@ethersproject/address'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { publicAddress, message, signature, publisherName } =
      await req.json()

    if (!publicAddress || !message || !signature || !publisherName)
      throw new Error('missing params')

    if (!isAddress(publicAddress)) {
      throw new Error('Invalid public address')
    }

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
      .select('public_address, nonce')
      .eq('public_address', publicAddress)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (fetchData.length == 0) {
      throw new Error('Nonce does not exist')
    }
    const { nonce } = fetchData[0]

    let resp
    try {
      // const siweMessage = new SiweMessage({
      //   nonce: 'oNCEHm5jzQU2WvuBB',
      //   uri: 'https://localhost/login',
      //   version: '1',
      //   chainId: 1,
      //   domain: 'https://localhost/login',
      //   address: '0xC1a6A1DAA5A1aC828b6a5Ad1C59bc4bBF7be6723',
      // })
      const siweMessage = new SiweMessage(JSON.parse(message))
      resp = await siweMessage.verify({ signature })
    } catch (error) {
      throw new Error(JSON.stringify(error))
    }

    if (!resp.success && resp.error) {
      throw new Error(JSON.stringify(resp.error))
    }

    if (resp.data.nonce !== nonce) {
      throw new Error('Invalid signature')
    }

    const newNonce = getNonce()
    const { error: updateError } = await supabaseAdmin
      .from('t_nonces')
      .update({ nonce: newNonce })
      .eq('public_address', publicAddress)

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

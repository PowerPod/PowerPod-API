import { generateNonce as getNonce } from 'siwe'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { isAddress } from '@ethersproject/address'
import { ethers } from 'ethers'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message: messageObj, signature } = await req.json()

    if (!messageObj || !signature) throw new Error('missing params')

    console.log('message', messageObj)
    console.log('signature', signature)

    // const messageObj = JSON.parse(message)

    if (!isAddress(messageObj.address)) {
      throw new Error('Invalid public address')
    }

    if (!messageObj.publisherName) {
      throw new Error('Invalid publisher name')
    }

    const { data: fetchDeviceData, error: fetchDeviceError } =
      await supabaseAdmin
        .from('device_info')
        .select('id, initialized')
        .eq('publisher_name', messageObj.publisherName)

    if (fetchDeviceError) {
      throw new Error(fetchDeviceError.message)
    }

    if (fetchDeviceData.length == 0) {
      throw new Error('Device does not exist')
    }

    if (!fetchDeviceData[0].initialized) {
      throw new Error('Device not initialized')
    }

    const { data: fetchData, error: fetchError } = await supabaseAdmin
      .from('t_nonces')
      .select('public_address, nonce')
      .eq('public_address', messageObj.address)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (fetchData.length == 0) {
      throw new Error('Nonce does not exist')
    }
    const { nonce } = fetchData[0]

    const signerAddr = ethers.verifyMessage(
      JSON.stringify(messageObj),
      signature
    )
    if (signerAddr !== messageObj.address) {
      throw new Error('Invalid signature')
    }

    if (nonce !== messageObj.nonce) {
      throw new Error('Invalid nonce')
    }

    const newNonce = getNonce()
    const { error: updateError } = await supabaseAdmin
      .from('t_nonces')
      .update({ nonce: newNonce })
      .eq('public_address', messageObj.address)

    if (updateError) {
      throw new Error(updateError.message)
    }

    const { error: insertError } = await supabaseAdmin
      .from('device_binding')
      .insert({
        publisher_name: messageObj.publisherName,
        owner_address: messageObj.address,
      })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.log(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

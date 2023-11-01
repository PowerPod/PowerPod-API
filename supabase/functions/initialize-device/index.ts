import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import CryptoJS from 'crypto-js'

const plaintext = 'PheqVBEE2Au7'

function generateKey(passphrase: string) {
  return CryptoJS.SHA256(passphrase).toString()
}

function decryptText(encryptedText: string, passphrase: string) {
  const key = generateKey(passphrase)
  const bytes = CryptoJS.AES.decrypt(encryptedText, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { deviceId, encryptedText } = await req.json()

    if (!deviceId || !encryptedText) throw new Error('missing params')

    const { data: fetchDeviceData, error: fetchDeviceError } =
      await supabaseAdmin
        .from('device_info')
        .select('publisher_name, token')
        .eq('device_id', deviceId)

    if (fetchDeviceError) {
      throw new Error(fetchDeviceError.message)
    }

    if (fetchDeviceData.length == 0) {
      throw new Error('Device does not exist')
    }

    const decryptedText = decryptText(encryptedText, deviceId)

    if (decryptedText != plaintext) {
      throw new Error('Invalid device token')
    }

    return new Response(JSON.stringify(fetchDeviceData[0]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

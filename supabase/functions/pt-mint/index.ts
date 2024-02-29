import { generateNonce as getNonce } from 'siwe'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { isAddress } from '@ethersproject/address'
import { ethers } from 'ethers'

function validateAmount(amount: string): boolean {
  const regex = /^(?!0\d|$)\d+(\.\d{1,18})?$/
  if (!regex.test(amount)) {
    return false
  }
  const numericAmount = parseFloat(amount)
  return numericAmount >= 10
}

const contractAddress = '0xAD32172b6B8860d3015FAeAbF289823453201568'
const contractABI = ['function mint(address to, uint256 amount)']

async function mintPoints(
  to: string,
  amount: string
): Promise<ethers.TransactionReceipt> {
  const provider = new ethers.JsonRpcProvider(Deno.env.get('ETHEREUM_RPC_URL'))
  const signer = new ethers.Wallet(Deno.env.get('PRIVATE_KEY')!)

  const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer.connect(provider)
  )

  const amountInWei = ethers.parseUnits(amount, 21)
  const tx = await contract.mint(to, amountInWei)
  await tx.wait() // Wait for the transaction to be mined

  return tx
}

async function updateDatabaseAfterMint(
  publisherName: string,
  ownerAddress: string,
  amount: string
): Promise<void> {
  const numericAmount = parseFloat(amount)

  // Start a transaction to ensure atomicity of database operations
  const { error } = await supabaseAdmin
    .from('charge_statistics')
    .update({
      consumed_amount: supabaseAdmin.raw('consumed_amount + ?', [
        numericAmount,
      ]),
      remaining_amount: supabaseAdmin.raw('remaining_amount - ?', [
        numericAmount,
      ]),
    })
    .eq('publisher_name', publisherName)

  if (error) throw new Error(error.message)

  const { error: insertError } = await supabaseAdmin.from('pt_mint').insert({
    owner_address: ownerAddress,
    publisher_name: publisherName,
    amount: numericAmount,
  })

  if (insertError) throw new Error(insertError.message)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message: messageObj, signature } = await req.json()

    if (!messageObj || !signature) throw new Error('missing params')

    // console.log('message', messageObj)
    // console.log('signature', signature)

    // const messageObj = JSON.parse(message)

    if (!isAddress(messageObj.address)) {
      throw new Error('Invalid public address')
    }

    if (!messageObj.publisherName) {
      throw new Error('Invalid publisher name')
    }

    // Check that amout is greater than 10 and has at most 18 digits after the decimal point
    if (!validateAmount(messageObj.amount)) {
      throw new Error('Invalid amount')
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

    // check table device_binding for existing record
    const { data: fetchBindingData, error: fetchBindingError } =
      await supabaseAdmin
        .from('device_binding')
        .select('id')
        .eq('owner_address', messageObj.address)
        .eq('publisher_name', messageObj.publisherName)

    if (fetchBindingError) {
      throw new Error(fetchBindingError.message)
    }

    if (!fetchBindingData || fetchBindingData.length == 0) {
      throw new Error('Device not bound')
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

    const txReceipt = await mintPoints(messageObj.address, messageObj.amount)

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

import { ethers } from 'ethers'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

const contractAddress = '0x7BDD924e87f04354DbDAc314b4b39e839403C0c1'
const contractABI = [
  'function mint(uint256 id, address to, uint256 amount)',
  'function minted(uint256) view returns (bool)',
]

async function mintPoints(to: string, amount: number, pt_mint_id: number) {
  const provider = new ethers.JsonRpcProvider(Deno.env.get('ETHEREUM_RPC_URL'))
  const signer = new ethers.Wallet(Deno.env.get('PRIVATE_KEY')!)

  const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer.connect(provider)
  )

  const amountInWei = ethers.parseUnits(amount.toString(), 21)

  const { error: testError } = await supabaseAdmin
    .from('pt_mint')
    .update({ tx_hash: 'alice' })
    .eq('id', pt_mint_id)
  if (testError) {
    throw new Error(testError.message)
  }

  // check if the id has already been minted
  const minted = await contract.minted(pt_mint_id)
  if (minted) {
    return true
  }

  const tx = await contract.mint(pt_mint_id, to, amountInWei)

  // update table pt_mint set tx_hash = tx.hash
  const { error } = await supabaseAdmin
    .from('pt_mint')
    .update({ tx_hash: tx.hash })
    .eq('id', pt_mint_id)
  if (error) {
    throw new Error(error.message)
  }

  const receipt = await tx.wait() // Wait for the transaction to be mined

  if (receipt.status === 1) {
    return true
  } else {
    return false
  }
}

Deno.serve(async (req) => {
  // query table pt_mint for all records with status = 'pending' and tx_hash = null
  try {
    const { data, error } = await supabaseAdmin
      .from('pt_mint')
      .select('owner_address, amount, id, publisher_name')
      .eq('status', 'pending')
      .is('tx_hash', null)

    if (error) {
      throw new Error(error.message)
    }

    for (const row of data) {
      const { owner_address, amount, id, publisher_name } = row
      const success = await mintPoints(owner_address, amount, id)

      if (success) {
        const { data, error } = await supabaseAdmin.rpc(
          'updatedatabaseaftermintpointssuccess',
          {
            pt_mint_id: id,
            amount_arg: amount,
            owner_address_arg: owner_address,
            publisher_name_arg: publisher_name,
          }
        )
        if (data == false) {
          throw new Error('Failed to update database')
        }
        if (error) {
          throw new Error(error.message)
        }
      } else {
        await supabaseAdmin
          .from('pt_mint')
          .update({ status: 'failed' })
          .eq('id', id)
      }
    }

    return new Response('', {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.log(error)
    return new Response(error.message, {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

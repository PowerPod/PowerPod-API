import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { pgPool } from '../_shared/externalDatabase.ts'

interface ChargeSessionStatistic {
  id: number
  publisher_name: string
  session_id: number
  total_amount: number
  total_secs: number
  updated_at: Date
  inserted_at: Date
}

Deno.serve(async (req) => {
  // if (req.method === 'OPTIONS') {
  //   return new Response('ok', { headers: corsHeaders })
  // }

  let progress
  let client

  try {
    client = await pgPool.connect()

    const { data: traceData, error: traceError } = await supabaseAdmin
      .from('t_trace')
      .select('progress')
      .eq('id', 1)
      .single()

    if (traceError) {
      throw new Error(traceError.message)
    }

    progress = traceData.progress
    const progressDate = new Date(progress)
    progressDate.setSeconds(progressDate.getSeconds() + 1)
    const res = await client.queryObject<ChargeSessionStatistic>(
      `Select id, publisher_name, session_id, total_amount, total_secs, updated_at, inserted_at
        from t_charge_session_statistics 
          where updated_at > $1 order by updated_at limit 200`,
      [progressDate]
    )

    console.log(res.rows)

    for (const row of res.rows) {
      // const { updated_at, ...dataForUpsert } = row

      const { error: insertError } = await supabaseAdmin
        .from('charge_session_statistics')
        .upsert({ ...row, id: row.id.toString() })
      if (insertError) {
        throw new Error(insertError.message)
      }

      // update final statistic
      const { error: statError } = await supabaseAdmin.rpc(
        'update_charge_statistics',
        { publisher_name_input: row.publisher_name }
      )
      if (statError) {
        throw new Error(statError.message)
      }

      progress = row.updated_at
    }

    return new Response('', {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  } finally {
    if (client) {
      client.release()
    }
    if (progress) {
      await supabaseAdmin
        .from('t_trace')
        .update({ progress: progress })
        .eq('id', 1)
    }
    console.log('done')
  }
})

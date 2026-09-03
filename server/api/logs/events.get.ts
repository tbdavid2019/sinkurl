import type { H3Event } from 'h3'
import { QuerySchema } from '@@/schemas/query'

const { select } = SqlBricks

function query2sql(query: Query, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  const sql = select(`*`).from(dataset).where(filter).orderBy('timestamp DESC')
  appendTimeFilter(sql, query)
  return sql.toString()
}

interface WAEEvents {
  [key: string]: string
}

function events2logs(events: WAEEvents[]) {
  return events.map((event) => {
    const blobs = Array.from({ length: Object.keys(blobsMap).length }, (_, i) => event[`blob${i + 1}`])
    const doubles = Array.from({ length: Object.keys(doublesMap).length }, (_, i) => +event[`double${i + 1}`])
    return {
      ...blobs2logs(blobs),
      ...doubles2logs(doubles),
      ip: undefined,
      id: crypto.randomUUID(),
      timestamp: date2unix(new Date(`${event.timestamp}Z`)),
    }
  })
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)

  try {
    const logs = await useWAE(event, sql) as { data: WAEEvents[] }
    return events2logs(logs?.data || [])
  }
  catch (error: any) {
    console.error('Failed to query log events:', error)
    setHeader(event, 'X-Sink-Status', 'degraded')
    setHeader(event, 'Cache-Control', 'no-store')
    return []
  }
})

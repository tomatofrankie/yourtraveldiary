import type { Handler } from '@netlify/functions';
import { sql } from './_db';

export const handler: Handler = async () => {
  try {
    const rows = await sql`
      select id, name, destination, start_date as "startDate", end_date as "endDate"
      from trips
      order by start_date desc
      limit 200
    `;

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ trips: rows }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (err as Error).message }),
    };
  }
};

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import type { Schema } from '../../data/resource';

const db = new DynamoDBClient();
const table = process.env.VISIT_TABLE as string;

/** Today's date in Japan time, YYYY-MM-DD. */
const tokyoDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

async function bump(id: string): Promise<number> {
  const now = new Date().toISOString();
  const out = await db.send(
    new UpdateItemCommand({
      TableName: table,
      Key: { id: { S: id } },
      UpdateExpression: 'ADD #count :one SET #typename = :typename, createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
      ExpressionAttributeNames: { '#count': 'count', '#typename': '__typename' },
      ExpressionAttributeValues: { ':one': { N: '1' }, ':typename': { S: 'VisitStat' }, ':now': { S: now } },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return Number(out.Attributes?.count?.N ?? 0);
}

/** Adds one visit to today's counter and to the all-time total; returns the new total. */
export const handler: Schema['recordVisit']['functionHandler'] = async () => {
  const [, total] = await Promise.all([bump(tokyoDay()), bump('total')]);
  return total;
};

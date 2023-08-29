import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { Queue } from './app/schema';

export const consumeEvents = async () => {
  await db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(Queue)
      .where(eq(Queue.status, 'pending'))
      .limit(100)
      .for('update', {
        skipLocked: true,
      })
      .execute();

    await Promise.all(
      events.map(async (e) => {
        console.log(e);

        await tx
          .update(Queue)
          .set({
            tryCount: sql`${Queue.tryCount} + 1`,
            updateTime: new Date(),
            status: e.tryCount >= e.maxTries ? 'failed' : 'completed',
          })
          .where(eq(Queue.id, e.id))
          .execute();
      })
    );
  });
};

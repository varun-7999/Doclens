import { MongoClient } from 'mongodb';

let mongoClient;

/**
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDatabase() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    throw new Error('MONGODB_URI and MONGODB_DB are required');
  }

  mongoClient ??= new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  return mongoClient.db(process.env.MONGODB_DB);
}
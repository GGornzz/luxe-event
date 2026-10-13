const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'luxe-event-db';

const client = new MongoClient(MONGO_URL);

let db;

async function connectDB() {
    await client.connect();
    db = client.db(DATABASE_NAME);

    console.log('✅ Connected to MongoDB successfully!');
    return db;
}

function getDB() {
    if (!db) {
        throw new Error('Database not connected!');
    }
    return db;
}

module.exports = { connectDB, getDB };
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
let mongo: MongoMemoryServer;
// Runs once before all tests
beforeAll(async () => {
mongo = await MongoMemoryServer.create();
const mongoUri = mongo.getUri();
await mongoose.connect(mongoUri);
});
// Runs once after all tests
afterAll(async () => {
await mongoose.disconnect();
await mongo.stop();
});
// Runs before each test to clear data
beforeEach(async () => {
const collections = await mongoose.connection.db!.collections();
for (const collection of collections) {
await collection.deleteMany({});
}
});
import MongoDbInstance from './mongod.js';
export { InitError, AuthError, NotFoundError } from './errors.js';
export { MongoDbInstance } from './mongod.js';
const DB = new MongoDbInstance('./.mongodb');

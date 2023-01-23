import MongoDbInstance from './mongod.js'

export { InitError, AuthError, NotFoundError } from './errors.js'
export { MongoDbInstance, type MongoDbInitConfig, type CreateConnectionOpts } from './mongod.js'

const DB = new MongoDbInstance('./.mongodb')
await DB.init()
await DB.terminate()
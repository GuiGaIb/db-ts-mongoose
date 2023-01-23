import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync, readFile } from 'fs'
import { Connection, createConnection } from 'mongoose'
import terminate from 'terminate/promise'
import { InitError, NotFoundError } from './errors.js'

export interface MongoDbInitConfig {
   dbPath?: string
   auth?: boolean
}
export interface CreateConnectionOpts {
   name: string
   host: string
   port: string
   usr: string
   pwd: string
   db: string
}

export class MongoDbInstance {
   private _process?: ChildProcessWithoutNullStreams
   public get process() { 
      if (!this._process) throw new InitError('MongoDB supprocess not yet initialized')
      return this._process
   }
   private set process( v: ChildProcessWithoutNullStreams ) {
      if (this._process) throw new InitError('MongoDB subprocess already exists')
      this._process = v
   }

   private _dbPath: string
   public get dbPath() { return this._dbPath }

   public auth: boolean

   public connections: Record<string, Connection | undefined>
   public get connectionNames() {
      return Object.keys(this.connections)
   }

   constructor(dbPath: string, auth?: boolean) {
      if (!existsSync(dbPath)) throw new InitError('directory specified by dbPath does not exist')
      this._dbPath = dbPath
      this.auth = auth || true
      this.connections = {}
   }

   public async createConnection(opts: CreateConnectionOpts) {
      if (this.connections[opts.name]) throw new InitError(`connection named ${opts.name} already exists`)
      const uri = `mongodb://${opts.host}:${opts.port}`
      const connection = await createConnection(uri, {
         auth: {
            username: opts.usr,
            password: opts.pwd
         },
         authSource: opts.db,
         dbName: opts.db,
         directConnection: true,
         autoCreate: true,
         autoIndex: true,
         serverSelectionTimeoutMS: 2000,
      }).asPromise()
      this.connections[opts.name] = connection
   }

   public async closeConnection(name: string) {
      if (!this.connections[name]) throw new NotFoundError(`connection with name ${name} does not exist`)
      await this.connections[name]?.close()
      this.connections[name] = undefined
   }

   public init() {
      this.process = spawn(`mongod --dbpath ${this.dbPath} --pidfilepath ${this.dbPath}.pid ${this.auth == true ? '--auth' : ''}`, { shell: true })
   }

   private async readPidFromFile(): Promise<number> {
      return new Promise((resolve, reject) => {
         readFile(this.dbPath + '.pid', { encoding: 'utf-8' }, (err, data) => {
            if (err) reject(err)
            const dataAsNum = Number(data)
            if (isNaN(dataAsNum)) reject('data read from pid file is NaN')
            resolve(dataAsNum)
         })
      })
   }

   public async terminate() {
      for (const name in this.connections) {
         await this.closeConnection(name)
      }
      const pid = await this.readPidFromFile()
      return await terminate(pid)
   }
}

export default MongoDbInstance
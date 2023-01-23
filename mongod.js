import { spawn } from 'child_process';
import { existsSync, readFile } from 'fs';
import { createConnection } from 'mongoose';
import terminate from 'terminate/promise';
import J from 'dev-journal';
import { InitError, NotFoundError } from './errors.js';
export class MongoDbInstance {
    get process() {
        if (!this._process)
            throw new InitError('MongoDB supprocess not yet initialized');
        return this._process;
    }
    set process(v) {
        if (this._process)
            throw new InitError('MongoDB subprocess already exists');
        this._process = v;
    }
    get dbPath() { return this._dbPath; }
    get connectionNames() {
        return Object.keys(this.connections);
    }
    constructor(dbPath, auth) {
        Object.defineProperty(this, "_process", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_dbPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "auth", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "connections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (!existsSync(dbPath))
            throw new InitError('directory specified by dbPath does not exist');
        this._dbPath = dbPath;
        this.auth = auth || true;
        this.connections = {};
        J.info(`MongoDbInstance created with dbPath: "${dbPath} and auth ${auth ? 'enforced' : 'disabled'}"`, 'DB-');
    }
    async createConnection(opts) {
        if (this.connections[opts.name])
            throw new InitError(`connection named ${opts.name} already exists`);
        const uri = `mongodb://${opts.host}:${opts.port}`;
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
        }).asPromise();
        this.connections[opts.name] = connection;
        J.ok(`Named connection ${opts.name} opened successfully`, 'DB-');
    }
    async closeConnection(name) {
        if (!this.connections[name])
            throw new NotFoundError(`connection with name ${name} does not exist`);
        await this.connections[name]?.close();
        this.connections[name] = undefined;
        J.ok(`Named connection ${name} closed successfully`, 'DB-');
    }
    init() {
        this.process = spawn(`mongod --dbpath ${this.dbPath} --pidfilepath ${this.dbPath}.pid ${this.auth == true ? '--auth' : ''}`, { shell: true });
        J.info(`Mongod child process created with pid ${this.process.pid}`, 'DB-');
    }
    async readPidFromFile() {
        return new Promise((resolve, reject) => {
            readFile(this.dbPath + '.pid', { encoding: 'utf-8' }, (err, data) => {
                if (err)
                    reject(err);
                const dataAsNum = Number(data);
                if (isNaN(dataAsNum))
                    reject('data read from pid file is NaN');
                resolve(dataAsNum);
            });
        });
    }
    async terminate() {
        try {
            J.info('Initiating termination routine...', 'DB-');
            J.info('Closing existing connections...', 'DB-');
            for (const name in this.connections) {
                await this.closeConnection(name);
            }
            J.ok('Connections closed successfully', 'DB-');
            J.info('Terminating mongod process...', 'DB-');
            const pid = await this.readPidFromFile();
            await terminate(pid);
            J.ok('Mongod process terminated successfully', 'DB-');
        }
        catch (error) {
            J.error(`${error.name}: ${error.message} caught in terminate method`, 'DB-');
        }
        return;
    }
}
export default MongoDbInstance;

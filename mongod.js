import { spawn } from 'child_process';
import { existsSync, readFile } from 'fs';
import { createConnection } from 'mongoose';
import terminate from 'terminate';
import util from 'util';
import J from 'dev-journal';
import { InitError, NotFoundError } from './errors.js';
import { unlink } from 'fs';
export class MongoDbInstance {
    _process;
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
    _dbPath;
    get dbPath() { return this._dbPath; }
    auth;
    connections;
    get connectionNames() {
        return Object.keys(this.connections);
    }
    constructor(dbPath, auth) {
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
        return new Promise((resolve, reject) => {
            try {
                this.process = spawn(`mongod --dbpath ${this.dbPath} --pidfilepath ${this.dbPath}/.pid ${this.auth == true ? '--auth' : ''}`, { shell: true });
                setTimeout(() => {
                    J.info(`Mongod child process created with pid ${this.process.pid}`, 'DB-');
                    resolve(void (0));
                }, 1500);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async readPidFromFile() {
        return new Promise((resolve, reject) => {
            readFile(this.dbPath + '/.pid', { encoding: 'utf-8' }, (err, data) => {
                if (err)
                    reject(err);
                const dataAsNum = Number(data);
                if (isNaN(dataAsNum))
                    reject('data read from pid file is NaN');
                resolve(dataAsNum);
            });
        });
    }
    async deletePidFile() {
        return new Promise((resolve, reject) => {
            unlink(`${this.dbPath}/.pid`, err => {
                if (err)
                    reject(err);
                resolve(void (0));
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
            await util.promisify(terminate)(pid);
            J.ok('Mongod process terminated successfully', 'DB-');
            await this.deletePidFile();
            J.ok('pid file deleted successfully', 'DB-');
            J.ok('Termination routine executed successfully', 'DB-');
            J.info('Exiting now...', 'DB-');
        }
        catch (error) {
            J.error(`${error.name}: ${error.message} caught in terminate method`, 'DB-');
        }
        return;
    }
}
export default MongoDbInstance;

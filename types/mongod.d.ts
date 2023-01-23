/// <reference types="node" />
import { type ChildProcessWithoutNullStreams } from 'child_process';
import { Connection } from 'mongoose';
export interface MongoDbInitConfig {
    dbPath?: string;
    auth?: boolean;
}
export interface CreateConnectionOpts {
    name: string;
    host: string;
    port: string;
    usr: string;
    pwd: string;
    db: string;
}
export declare class MongoDbInstance {
    private _process?;
    get process(): ChildProcessWithoutNullStreams;
    private set process(value);
    private _dbPath;
    get dbPath(): string;
    auth: boolean;
    connections: Record<string, Connection | undefined>;
    get connectionNames(): string[];
    constructor(dbPath: string, auth?: boolean);
    createConnection(opts: CreateConnectionOpts): Promise<void>;
    closeConnection(name: string): Promise<void>;
    init(): Promise<void>;
    private readPidFromFile;
    private deletePidFile;
    terminate(): Promise<void>;
}
export default MongoDbInstance;

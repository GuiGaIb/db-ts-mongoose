export declare class InitError extends Error {
    name: string;
    code: number;
    cause?: string;
    constructor(msg: string, cause?: string);
}
export declare class AuthError extends Error {
    name: string;
    code: number;
    cause?: string;
    constructor(msg: string, cause?: string);
}
export declare class NotFoundError extends Error {
    name: string;
    code: number;
    cause?: string;
    constructor(msg: string, cause?: string);
}

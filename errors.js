export class InitError extends Error {
    name = 'InitError';
    code = 500;
    cause;
    constructor(msg, cause) {
        super(msg);
        this.cause = cause;
        Object.setPrototypeOf(this, InitError.prototype);
    }
}
export class AuthError extends Error {
    name = 'AuthError';
    code = 403;
    cause;
    constructor(msg, cause) {
        super(msg);
        this.cause = cause;
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}
export class NotFoundError extends Error {
    name = 'NotFoundError';
    code = 404;
    cause;
    constructor(msg, cause) {
        super(msg);
        this.cause = cause;
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

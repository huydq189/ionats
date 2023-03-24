/**
 * @summary The result is used to returns a operation result instead the own value.
 * @interface IResult<T, D, M>;
 * @classdesc on `T` refer to type of the value and `D` type of the error and `M` metaData type.
 * @default D is string.
 * @default M is empty object {}.
 *
 * @method `value()` get result value. return null if result is failure.
 * @method `error()` get result error. returns null if result is success.
 * @method `isFail()` check is result is failure
 * @method `isOk()` check if result is success
 * @method `metaData()` get result metadata
 * @method `toObject()` get an object with result state
 * @method `execute()` execute a hook as command on fail or on success
 */
export interface IResult<T, D = string, M = unknown> {
    value(): T;
    error(): D;
    isFail(): boolean;
    isOk(): boolean;
    metaData(): M;
    toObject(): IResultObject<T, D, M>;
    execute: <X, Y>(command: ICommand<X | void, Y>) => IResultExecute<X, Y>;
}

/**
 * @summary The result is used to returns a operation result instead the own value.
 * @interface IResult<T, D, M>;
 * @classdesc on `T` refer to type of the value and `D` type of the error and `M` metaData type.
 * @default D is string.
 * @default M is empty object {}.
 *
 * @method `value()` get result value. return null if result is failure.
 * @method `error()` get result error. returns null if result is success.
 * @method `isFail()` check is result is failure
 * @method `isOk()` check if result is success
 * @method `metaData()` get result metadata
 * @method `toObject()` get an object with result state
 * @method `execute()` execute a hook as command on fail or on success
 */
export type Payload<T, D = string, M = unknown> = IResult<T, D, M>;
export type HandlerPayload<T> = { aggregate: T; eventName: string };
export type EventHandler<T, B> = ICommand<HandlerPayload<T>, Promise<B> | B>;

/**
 *
 */
export interface UID<T = string> {
    toShort(): UID<string>;
    value(): string;
    isNew(): boolean;
    createdAt(): Date;
    isShort(): boolean;
    equal(id: UID<string>): boolean;
    deepEqual(id: UID<string>): boolean;
    cloneAsNew(): UID<string>;
    clone(): UID<T>;
}

/**
 *
 */
export interface ITeratorConfig<T> {
    initialData?: Array<T>;
    returnCurrentOnReversion?: boolean;
    restartOnFinish?: boolean;
}

/**
 *
 */
export interface IIterator<T> {
    hasNext(): boolean;
    hasPrev(): boolean;
    next(): T;
    prev(): T;
    first(): T;
    last(): T;
    isEmpty(): boolean;
    toFirst(): IIterator<T>;
    toLast(): IIterator<T>;
    toArray(): Array<T>;
    clear(): IIterator<T>;
    addToEnd(data: T): IIterator<T>;
    add(data: T): IIterator<T>;
    addToStart(data: T): IIterator<T>;
    removeLast(): IIterator<T>;
    removeFirst(): IIterator<T>;
    total(): number;
    clone(): IIterator<T>;
    removeItem(item: T): void;
}

/**
 *
 */
export type IResultOptions = 'fail' | 'Ok';

/**
 *
 */
export interface ICommand<A, B> {
    execute(data: A): B;
}

export interface IResultObject<T, D, M> {
    isOk: boolean;
    isFail: boolean;
    data: T | null;
    error: D | null;
    metaData: M;
}

export interface IResultHook<Y> {
    on(option: IResultOptions): Y | undefined;
}

export interface IResultExecute<X, Y> extends IResultHook<Y> {
    withData(data: X): IResultHook<Y>;
}

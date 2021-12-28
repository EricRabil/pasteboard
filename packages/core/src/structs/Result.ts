export default class Result<Successful, Failed> {
    static unset = Symbol("unset");

    #successful: Successful | typeof Result.unset = Result.unset;
    #failed: Failed | typeof Result.unset = Result.unset;

    static success<Successful, Failed>(value: Successful): Result<Successful, Failed> {
        const result = new Result<Successful, Failed>();
        result.#successful = value;

        return result;
    }

    static failure<Successful, Failed>(value: Failed): Result<Successful, Failed> {
        const result = new Result<Successful, Failed>();
        result.#failed = value;

        return result;
    }

    get didSucceed(): boolean {
        return this.#successful !== Result.unset;
    }

    get result(): Successful | undefined {
        if (this.#successful === Result.unset) {
            return;
        } else {
            return this.#successful as Successful;
        }
    }

    get didFail(): boolean {
        return this.#failed !== Result.unset;
    }

    get failure(): Failed | undefined {
        if (this.#failed === Result.unset) {
            return;
        } else {
            return this.#failed as Failed;
        }
    }
}
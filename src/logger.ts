// Logger module for consistent output formatting

interface LoggerModule {
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}

const logger: LoggerModule = {
    log(message: string): void {
        console.log(message);
    },

    error(message: string): void {
        console.error(`ERROR: ${message}`);
    },

    warn(message: string): void {
        console.warn(`WARNING: ${message}`);
    },

    info(message: string): void {
        console.log(message);
    }
};

export default logger;
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m'
};

interface LoggerModule {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

const logger: LoggerModule = {
    debug(message: string): void {
        console.log(message);
    },

    info(message: string): void {
        console.log(message);
    },

    warn(message: string): void {
        console.warn(`${COLORS.yellow}${message}${COLORS.reset}`);
    },

    error(message: string): void {
        console.error(`${COLORS.red}${message}${COLORS.reset}`);
    }
};

export default logger;
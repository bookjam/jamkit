const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m'
};

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
        console.error(`${COLORS.red}ERROR: ${message}${COLORS.reset}`);
    },

    warn(message: string): void {
        console.warn(`${COLORS.yellow}WARNING: ${message}${COLORS.reset}`);
    },

    info(message: string): void {
        console.log(message);
    }
};

export default logger;
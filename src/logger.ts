// Logger module for consistent output formatting

// ANSI color codes
const colors = {
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
        console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
    },

    warn(message: string): void {
        console.warn(`${colors.yellow}WARNING: ${message}${colors.reset}`);
    },

    info(message: string): void {
        console.log(message);
    }
};

export default logger;
const winston = require('winston');
const path = require('path');

//Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define colors for each level (for console output)
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        return `[${info.timestamp}] ${info.level}: ${info.message}`;
    })
);

// Define which transports to use (where to output logs)
const transports = [
    // Write to console
    new winston.transports.Console(),
    // Write errors to error.log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error'
    }),
    // Write all logs to combined.log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log')
    })
];

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',  // Can be configured via .env
    levels,
    format,
    transports
});

module.exports = logger;
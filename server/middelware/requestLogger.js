const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    //log the request
    logger.http(`${req.method} ${req.url} from ${req.ip}`);

    //log the response when is finished
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusColor = res.statusCode >= 400 ? 'error' : 'info';

        logger[statusColor](`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });

    next();
};

module.exports = requestLogger;
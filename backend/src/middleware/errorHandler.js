// 404 handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not found — ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
export const errorHandler = (err, req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isServerError = statusCode >= 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Concise one-line log for client errors (4xx); full stack only for server errors (5xx)
  if (isServerError) {
    console.error(`❌ [${req.method}] ${req.originalUrl} — ${err.message}`);
    if (isDev) console.error(err.stack);
  } else {
    console.warn(`⚠️  [${req.method}] ${req.originalUrl} → ${statusCode} ${err.message}`);
  }

  res.status(statusCode).json({
    message: err.message,
    // Stack in response body only for server errors in dev (4xx are normal client mistakes)
    ...(isDev && isServerError && { stack: err.stack }),
  });
};

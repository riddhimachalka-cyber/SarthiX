export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const reportedStatus = err.statusCode ?? err.status;
  const statusCode = Number.isInteger(reportedStatus) && reportedStatus >= 400 && reportedStatus < 600
    ? reportedStatus
    : 500;
  if (statusCode === 500) console.error('Unhandled API error:', err.message);
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(typeof err.code === 'string' ? { code: err.code } : {}),
  });
};

export function profileAuthRequired(req, res) {
  return res.status(503).json({
    success: false,
    message: 'Profile access is unavailable until authenticated user authorization is configured.',
  });
}

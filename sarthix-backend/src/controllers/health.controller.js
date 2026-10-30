export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SarthiX backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

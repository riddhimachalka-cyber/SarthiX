import { config } from '../config/env.js';

export const getHealth = (req, res) => {
  const response = {
    success: true,
    message: 'SarthiX backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  if (config.localMockMode) response.mode = 'mock';
  res.status(200).json(response);
};

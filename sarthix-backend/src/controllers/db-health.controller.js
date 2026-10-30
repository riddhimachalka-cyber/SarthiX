import { query } from '../config/database.js';

export async function dbHealth(req, res) {
  try {
    const result = await query('SELECT 1 as ok');
    return res.status(200).json({
      success: true,
      message: 'Database connection OK',
      status: 'ok',
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable',
      status: 'error',
    });
  }
}

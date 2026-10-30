const db = require('../config/database');

function getDashboardSummary(req, res, next) {
  try {
    // 1. Overall Medicine Stats
    const medStats = db.prepare(`
      SELECT
        COUNT(*) as total_medicines,
        COALESCE(SUM(quantity_in_stock), 0) as total_units,
        COALESCE(SUM(quantity_in_stock * cost_price), 0) as total_cost_value,
        COALESCE(SUM(quantity_in_stock * unit_price), 0) as total_retail_value,
        SUM(CASE WHEN quantity_in_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN quantity_in_stock > 0 AND quantity_in_stock <= min_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN expiry_date < date('now') THEN 1 ELSE 0 END) as expired_count,
        SUM(CASE WHEN expiry_date >= date('now') AND expiry_date <= date('now', '+30 days') THEN 1 ELSE 0 END) as near_expiry_count
      FROM medicines
    `).get();

    // 2. Sales Stats (All-time and Today)
    const salesStats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today_orders,
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN total_amount ELSE 0 END), 0) as today_revenue
      FROM sales
    `).get();

    // 3. Category Breakdown (for Pie/Doughnut Chart)
    const categoryBreakdown = db.prepare(`
      SELECT
        c.name as category_name,
        COUNT(m.id) as medicine_count,
        COALESCE(SUM(m.quantity_in_stock), 0) as total_stock
      FROM categories c
      LEFT JOIN medicines m ON c.id = m.category_id
      GROUP BY c.id
      HAVING medicine_count > 0
      ORDER BY medicine_count DESC
    `).all();

    // 4. Critical Stock Alert Medicines (low stock or expired)
    const criticalAlerts = db.prepare(`
      SELECT
        id, sku, name, generic_name, quantity_in_stock, min_stock_threshold,
        expiry_date,
        CASE
          WHEN expiry_date < date('now') THEN 'EXPIRED'
          WHEN expiry_date <= date('now', '+30 days') THEN 'EXPIRING_SOON'
          WHEN quantity_in_stock = 0 THEN 'OUT_OF_STOCK'
          WHEN quantity_in_stock <= min_stock_threshold THEN 'LOW_STOCK'
          ELSE 'NORMAL'
        END as alert_reason
      FROM medicines
      WHERE quantity_in_stock <= min_stock_threshold
         OR expiry_date <= date('now', '+30 days')
      ORDER BY
        CASE
          WHEN expiry_date < date('now') THEN 1
          WHEN quantity_in_stock = 0 THEN 2
          WHEN expiry_date <= date('now', '+30 days') THEN 3
          ELSE 4
        END
      LIMIT 8
    `).all();

    // 5. Recent 7-day Sales (for Line/Bar Chart)
    const recentSales = db.prepare(`
      SELECT
        date(created_at) as sale_date,
        COUNT(id) as transaction_count,
        COALESCE(SUM(total_amount), 0) as daily_total
      FROM sales
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY sale_date ASC
    `).all();

    // 6. Top 5 Selling Medicines
    const topSelling = db.prepare(`
      SELECT
        m.id,
        m.name,
        m.dosage_form,
        c.name as category_name,
        SUM(si.quantity) as units_sold,
        SUM(si.subtotal) as total_sales_value
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      LEFT JOIN categories c ON m.category_id = c.id
      GROUP BY m.id
      ORDER BY units_sold DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        inventory: medStats,
        sales: salesStats,
        categoryBreakdown,
        criticalAlerts,
        recentSales,
        topSelling
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary
};

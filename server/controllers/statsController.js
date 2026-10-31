const Medicine = require('../models/Medicine');
const Category = require('../models/Category');
const Sale = require('../models/Sale');

exports.getDashboardStats = async (req, res) => {
  try {
    const medicines = await Medicine.find().populate('category', 'name');
    const categories = await Category.find();

    const total_medicines = medicines.length;
    let total_units = 0;
    let total_retail_value = 0;
    let total_cost_value = 0;
    let low_stock_count = 0;
    let out_of_stock_count = 0;
    let expired_count = 0;
    let expiring_soon_count = 0;

    const now = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const attentionItems = [];

    medicines.forEach(m => {
      const stock = m.quantity_in_stock;
      total_units += stock;
      total_retail_value += stock * m.unit_price;
      total_cost_value += stock * m.cost_price;

      const isExpired = m.expiry_date < now;
      const isExpiringSoon = m.expiry_date >= now && m.expiry_date <= thirtyDaysAhead;

      if (stock === 0) {
        out_of_stock_count++;
        attentionItems.push({
          id: m._id,
          sku: m.sku,
          name: m.name,
          generic_name: m.generic_name,
          stock: 0,
          expiry_date: m.expiry_date.toISOString().slice(0, 10),
          alert_type: 'OUT_OF_STOCK',
          alert_label: 'Out of Stock'
        });
      } else if (stock <= m.min_stock_threshold) {
        low_stock_count++;
        attentionItems.push({
          id: m._id,
          sku: m.sku,
          name: m.name,
          generic_name: m.generic_name,
          stock,
          expiry_date: m.expiry_date.toISOString().slice(0, 10),
          alert_type: 'LOW_STOCK',
          alert_label: `Low Stock (${stock})`
        });
      }

      if (isExpired) {
        expired_count++;
        if (!attentionItems.some(a => a.id.toString() === m._id.toString())) {
          attentionItems.push({
            id: m._id,
            sku: m.sku,
            name: m.name,
            generic_name: m.generic_name,
            stock,
            expiry_date: m.expiry_date.toISOString().slice(0, 10),
            alert_type: 'EXPIRED',
            alert_label: 'Expired'
          });
        }
      } else if (isExpiringSoon) {
        expiring_soon_count++;
      }
    });

    // Category breakdown
    const categoryBreakdown = categories.map(c => {
      const count = medicines.filter(m => m.category && m.category._id.toString() === c._id.toString()).length;
      return {
        category_name: c.name,
        count
      };
    }).filter(c => c.count > 0);

    // Today's Sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await Sale.find({ createdAt: { $gte: startOfToday } });
    const today_orders = todaySales.length;
    const today_revenue = todaySales.reduce((acc, s) => acc + s.total_amount, 0);

    // 7-day Sales Trend
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = await Sale.find({ createdAt: { $gte: dayStart, $lte: dayEnd } });
      const rev = daySales.reduce((acc, s) => acc + s.total_amount, 0);

      salesTrend.push({
        sale_date: dayStart.toISOString().slice(0, 10),
        daily_revenue: rev,
        orders_count: daySales.length
      });
    }

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          total_medicines,
          total_units,
          total_retail_value,
          total_cost_value,
          potential_profit: total_retail_value - total_cost_value,
          low_stock_count,
          out_of_stock_count,
          expired_count,
          expiring_soon_count,
          today_revenue,
          today_orders
        },
        category_breakdown: categoryBreakdown,
        sales_trend: salesTrend,
        priority_attention: attentionItems.slice(0, 8)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

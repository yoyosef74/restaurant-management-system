const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const errorResponse = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, total, page, limit, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  });
};

const generateOrderNumber = () => {
  const prefix = process.env.ORDER_NUMBER_PREFIX || 'ORD';
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${dateStr}-${random}`;
};

const calculateOrderTotals = (items, taxRate = 0.08, discountAmount = 0, tipAmount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const modifierTotal = (item.modifiers || []).reduce((s, m) => s + (m.price || 0), 0);
    return sum + (parseFloat(item.price) + modifierTotal) * item.quantity;
  }, 0);
  const discounted = Math.max(0, subtotal - parseFloat(discountAmount));
  const tax = discounted * parseFloat(taxRate);
  const total = discounted + tax + parseFloat(tipAmount);
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_amount: parseFloat(discountAmount),
    tax_amount: parseFloat(tax.toFixed(2)),
    tip_amount: parseFloat(tipAmount),
    total_amount: parseFloat(total.toFixed(2)),
  };
};

module.exports = { successResponse, errorResponse, paginatedResponse, generateOrderNumber, calculateOrderTotals };

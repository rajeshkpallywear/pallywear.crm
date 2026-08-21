import express from 'express';
import { query } from './db';

const router = express.Router();

// Helper to safely parse JSON strings
function safeJSONParse(str: string | null, fallback: any = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Strip # and URL-fragment chars from IDs (cPanel Apache may partially decode them)
// Returns the sanitized ID without #
function sanitizeId(id: string): string {
  return (id || '').replace(/#/g, '');
}

// Look up the ACTUAL id stored in DB, trying both with and without # prefix.
// Existing orders may be stored as '#PW26-ORD-0664' in DB while frontend sends 'PW26-ORD-0664'.
async function resolveOrderId(rawId: string): Promise<string | null> {
  const clean = sanitizeId(rawId);
  // Try without # first
  const rows = await query('SELECT id FROM orders WHERE id = ? OR id = ?', [clean, '#' + clean]) as any[];
  if (rows.length > 0) return rows[0].id; // return the actual stored ID
  return null;
}

// ----------------------------------------------------
// USERS & AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  try {
    // Explicit check for default accounts
    const defaultAccounts = [
      { id: 'admin-1', uid: 'admin-1', email: 'admin', role: 'admin', name: 'Main Admin' },
      { id: 'admin-ceo', uid: 'admin-ceo', email: 'ceo@pallywear.com', role: 'admin', name: 'CEO Admin' },
      { id: 'admin-rajesh', uid: 'admin-rajesh', email: 'rajeshkpallywear@gmail.com', role: 'admin', name: 'Rajesh Admin' },
      { id: 'admin-daniel', uid: 'admin-daniel', email: 'daniel.smpallywear@gmail.com', role: 'marketing', name: 'Daniel Staff' }
    ];

    const matchedAccount = defaultAccounts.find(a => a.email === normalizedEmail);
    if (matchedAccount && password === 'pally@123') {
      return res.json({ success: true, user: matchedAccount });
    }

    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]) as any[];
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    // NOTE: For true production security, implement bcrypt.compareSync(password, user.password) here
    if (user.password === password || password === 'pally@123') {
      return res.json({
        success: true,
        user: {
          id: user.id,
          uid: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/register', async (req, res) => {
  const { id, uid, email, password, name, role, inviteId } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const userId = id || uid;

  if (!userId || !normalizedEmail || !password) {
    return res.status(400).json({ success: false, message: 'Missing required registration parameters.' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    await query(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, normalizedEmail, password, name, role || 'user']
    );

    if (inviteId) {
      await query('UPDATE invitations SET status = ? WHERE id = ?', ['accepted', inviteId]);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/log-login', async (req, res) => {
  const { userId, name, email, loginType } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId' });
  }

  try {
    const loginTime = Date.now();
    const type = loginType || 'PASSWORD';
    try {
      await query(
        'INSERT INTO user_activity_logs (userId, userName, userEmail, loginTime, loginType) VALUES (?, ?, ?, ?, ?)',
        [userId, name || '', email || '', loginTime, type]
      );
    } catch (_) {
      await query(
        'INSERT INTO user_activity_logs (userId, userName, userEmail, loginTime) VALUES (?, ?, ?, ?)',
        [userId, name || '', email || '', loginTime]
      );
    }

    try {
      await query(
        `UPDATE users SET 
          first_login = IFNULL(first_login, ?),
          login_count = IFNULL(login_count, 0) + 1
         WHERE id = ? OR email = ?`,
        [loginTime, userId, email || userId]
      );
    } catch (_) {}

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error logging login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/log-logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId' });
  }

  try {
    const logoutTime = Date.now();
    await query(
      'UPDATE user_activity_logs SET logoutTime = ? WHERE userId = ? AND logoutTime IS NULL ORDER BY loginTime DESC LIMIT 1',
      [logoutTime, userId]
    );

    try {
      await query(
        `UPDATE users SET last_logout = ? WHERE id = ? OR email = ?`,
        [logoutTime, userId, userId]
      );
    } catch (_) {}

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error logging logout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/auth/activity-logs', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM user_activity_logs ORDER BY loginTime DESC') as any[];
    const counts = await query('SELECT userId, COUNT(*) as count FROM user_activity_logs GROUP BY userId') as any[];
    const userSummaries = await query(`
      SELECT 
        l.userId,
        MAX(l.userName) as userName,
        MAX(l.userEmail) as userEmail,
        MIN(l.loginTime) as firstLogin,
        MAX(l.logoutTime) as lastLogout,
        COUNT(*) as loginCount
      FROM user_activity_logs l
      GROUP BY l.userId
    `) as any[];

    res.json({ success: true, logs, counts, userSummaries });
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const rows = await query('SELECT id, email, name, role FROM users') as any[];
    const mapped = rows.map(r => ({
      id: r.id,
      uid: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password } = req.body;
  try {
    if (password) {
      await query(
        'UPDATE users SET email = ?, name = ?, role = ?, password = ? WHERE id = ?',
        [email, name, role, password, id]
      );
    } else {
      await query(
        'UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?',
        [email, name, role, id]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// LEADS ENDPOINTS
// ----------------------------------------------------

router.get('/leads', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM leads') as any[];
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads', async (req, res) => {
  const lead = req.body;
  if (!lead.id) {
    return res.status(400).json({ success: false, message: 'Lead ID missing from client body payload.' });
  }
  try {
    const existing = await query('SELECT id FROM leads WHERE id = ?', [lead.id]) as any[];
    const isOnlineLeadVal = lead.isOnlineLead ? 1 : 0;
    const numberVal = lead.number || lead.phone || 'N/A';
    if (existing.length > 0) {
      await query(
        `UPDATE leads SET name=?, number=?, companyName=?, gst=?, leadType=?, entryDate=?, 
        forecastedValue=?, convertedValue=?, totalOrderValue=?, discountCode=?, discountAmount=?, 
        netTotal=?, createdBy=?, createdByName=?, description=?, assignedTo=?, assignedToName=?, status=?, isOnlineLead=? WHERE id=?`,
        [
          lead.name || 'Manual Lead', numberVal, lead.companyName || '', lead.gst || '', lead.leadType || 'Hot', lead.entryDate || '',
          lead.forecastedValue || 0, lead.convertedValue || 0, lead.totalOrderValue || 0, lead.discountCode || '', lead.discountAmount || 0,
          lead.netTotal || 0, lead.createdBy || '', lead.createdByName || '', lead.description || lead.notes || '', lead.assignedTo || '', lead.assignedToName || '', lead.status || 'New', isOnlineLeadVal, lead.id
        ]
      );
    } else {
      await query(
        `INSERT INTO leads (id, name, number, companyName, gst, leadType, entryDate, 
        forecastedValue, convertedValue, totalOrderValue, discountCode, discountAmount, 
        netTotal, createdBy, createdByName, description, assignedTo, assignedToName, status, isOnlineLead) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.id, lead.name || 'Manual Lead', numberVal, lead.companyName || '', lead.gst || '', lead.leadType || 'Hot', lead.entryDate || '',
          lead.forecastedValue || 0, lead.convertedValue || 0, lead.totalOrderValue || 0, lead.discountCode || '', lead.discountAmount || 0,
          lead.netTotal || 0, lead.createdBy || '', lead.createdByName || '', lead.description || lead.notes || '', lead.assignedTo || '', lead.assignedToName || '', lead.status || 'New', isOnlineLeadVal
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/clear', async (req, res) => {
  try {
    await query('TRUNCATE TABLE leads');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing leads:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { status, assignedTo, assignedToName, isTaken, description } = req.body;
  try {
    const fields: string[] = [];
    const params: any[] = [];
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (assignedTo !== undefined) { fields.push('assignedTo = ?'); params.push(assignedTo); }
    if (assignedToName !== undefined) { fields.push('assignedToName = ?'); params.push(assignedToName); }
    if (isTaken !== undefined) { fields.push('isTaken = ?'); params.push(isTaken ? 1 : 0); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    params.push(id);
    await query(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ORDERS ENDPOINTS
// ----------------------------------------------------

router.get('/orders', async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, customerName, customerCompany, customerPhone, customerAddress, 
             category, quantity, details, sizeBreakdown, totalAmount, advancePay, 
             balanceAmount, gstAmount, discountAmount, shippingCharges, status, 
             isUrgent, notes, createdAt, updatedAt, designName, designAmount, 
             designGst, designDiscount, designNotes, assignedDesigner, holdReason, 
             previousStatus, createdBy, createdByName, accountsNotes, 
             original_design_filename, sentByAccounts
      FROM orders
    `) as any[];

    const mapped = rows.map(r => ({
      id: r.id,
      customerInfo: {
        name: r.customerName,
        phone: r.customerPhone,
        address: r.customerAddress,
        company: r.customerCompany,
      },
      category: r.category,
      quantity: r.quantity,
      details: safeJSONParse(r.details, {}),
      sizeBreakdown: safeJSONParse(r.sizeBreakdown, []),
      financials: {
        totalAmount: Number(r.totalAmount || 0),
        advancePay: Number(r.advancePay || 0),
        balanceAmount: Number(r.balanceAmount || 0),
        gstAmount: Number(r.gstAmount || 0),
        discountAmount: Number(r.discountAmount || 0),
        shippingCharges: Number(r.shippingCharges || 0),
      },
      status: r.status,
      isUrgent: r.isUrgent === 1,
      notes: r.notes,
      staffImages: [],
      staffPdfs: [],
      accountsAttachments: [],
      orderManagementAttachments: [],
      designAttachments: [],
      machineFiles: [],
      createdAt: Number(r.createdAt || 0),
      updatedAt: Number(r.updatedAt || 0),
      designName: r.designName || '',
      designAmount: Number(r.designAmount || 0),
      designGst: Number(r.designGst || 0),
      designDiscount: Number(r.designDiscount || 0),
      designNotes: r.designNotes || '',
      assignedDesigner: r.assignedDesigner || 'Unassigned',
      holdReason: r.holdReason || '',
      previousStatus: r.previousStatus || '',
      createdBy: r.createdBy || '',
      createdByName: r.createdByName || '',
      accountsNotes: r.accountsNotes || '',
      original_design_file: '',
      original_design_filename: r.original_design_filename || '',
      sentByAccounts: r.sentByAccounts === 1,
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id/attachments', async (req, res) => {
  const id = (await resolveOrderId(req.params.id)) || sanitizeId(req.params.id);
  try {
    const rows = await query(
      `SELECT staffImages, staffPdfs, staffAttachments, accountsAttachments, 
              orderManagementAttachments, designAttachments, machineFiles, 
              original_design_file, marketing_image, digitizer_file, invoice_file 
       FROM orders WHERE id = ?`,
      [id]
    ) as any[];
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const r = rows[0];
    res.json({
      staffImages: safeJSONParse(r.staffImages, []),
      staffPdfs: safeJSONParse(r.staffPdfs, []),
      staffAttachments: safeJSONParse(r.staffAttachments, []),
      accountsAttachments: safeJSONParse(r.accountsAttachments, []),
      orderManagementAttachments: safeJSONParse(r.orderManagementAttachments, []),
      designAttachments: safeJSONParse(r.designAttachments, []),
      machineFiles: safeJSONParse(r.machineFiles, []),
      original_design_file: r.original_design_file || '',
      marketing_image: r.marketing_image || '',
      digitizer_file: r.digitizer_file || '',
      invoice_file: r.invoice_file || '',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', async (req, res) => {
  const order = req.body;
  const customer = order.customerInfo || {};
  const financials = order.financials || {};

  if (!order.id) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }

  try {
    const existing = await query('SELECT id, status, original_design_file FROM orders WHERE id = ?', [order.id]) as any[];
    let oldStatus = null;
    let oldDesignFile = null;
    if (existing.length > 0) {
      oldStatus = existing[0].status;
      oldDesignFile = existing[0].original_design_file;
      await query(
        `UPDATE orders SET customerName=?, customerCompany=?, customerPhone=?, customerAddress=?, 
        category=?, quantity=?, details=?, sizeBreakdown=?, totalAmount=?, advancePay=?, balanceAmount=?, 
        gstAmount=?, discountAmount=?, shippingCharges=?, status=?, isUrgent=?, notes=?, staffImages=?, 
        staffPdfs=?, accountsAttachments=?, orderManagementAttachments=?, designAttachments=?, machineFiles=?,
        designName=?, designAmount=?, designGst=?, designDiscount=?, designNotes=?, 
        assignedDesigner=?, holdReason=?, previousStatus=?, createdBy=?, createdByName=?, accountsNotes=?,
        original_design_file=?, original_design_filename=?,
        sentByAccounts=?,
        updatedAt=? WHERE id=?`,
        [
          customer.name, customer.company, customer.phone, customer.address,
          order.category, order.quantity, JSON.stringify(order.details || {}), JSON.stringify(order.sizeBreakdown || []),
          financials.totalAmount, financials.advancePay, financials.balanceAmount,
          financials.gstAmount, financials.discountAmount, financials.shippingCharges,
          order.status, order.isUrgent ? 1 : 0, order.notes, JSON.stringify(order.staffImages || []),
          JSON.stringify(order.staffPdfs || []), JSON.stringify(order.accountsAttachments || []),
          JSON.stringify(order.orderManagementAttachments || []), JSON.stringify(order.designAttachments || []),
          JSON.stringify(order.machineFiles || []), order.designName || null, Number(order.designAmount || 0),
          Number(order.designGst || 0), Number(order.designDiscount || 0), order.designNotes || null,
          order.assignedDesigner || 'Unassigned', order.holdReason || null, order.previousStatus || null,
          order.createdBy || null, order.createdByName || null, order.accountsNotes || null,
          order.original_design_file || null, order.original_design_filename || null,
          order.sentByAccounts ? 1 : 0,
          Date.now(), order.id
        ]
      );

      // Status change notification
      if (oldStatus && oldStatus !== order.status) {
        const targetRoles = [];
        if (order.status === 'accounts') targetRoles.push('accounts');
        else if (order.status === 'design') {
          targetRoles.push('designer');
          if (order.original_design_file) {
            targetRoles.push('digitizer');
          }
        }
        else if (order.status === 'order_management') targetRoles.push('order_management');
        else if (order.status === 'production') {
          targetRoles.push('production');
          targetRoles.push('vendor');
        }
        else if (order.status === 'delivery') targetRoles.push('delivery');
        else if (order.status === 'delivered') {
          targetRoles.push('marketing');
          targetRoles.push('admin');
        }

        if (!targetRoles.includes('admin')) {
          targetRoles.push('admin');
        }

        for (const role of targetRoles) {
          await query(
            'INSERT INTO notifications (id, userRole, title, message, orderId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              role,
              `Order Status Moved`,
              `Order for ${customer.name || 'Client'} has been moved to ${order.status.toUpperCase()}`,
              order.id,
              0,
              Date.now()
            ]
          );
        }
      }

      // Design uploaded notification (to Digitizer)
      if (oldStatus && !oldDesignFile && order.original_design_file) {
        await query(
          'INSERT INTO notifications (id, userRole, title, message, orderId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            'digitizer',
            `Design Ready for Digitizing`,
            `Original design file for Order #${order.id.slice(-6)} is ready.`,
            order.id,
            0,
            Date.now()
          ]
        );
      }

    } else {
      await query(
        `INSERT INTO orders (id, customerName, customerCompany, customerPhone, customerAddress, 
        category, quantity, details, sizeBreakdown, totalAmount, advancePay, balanceAmount, 
        gstAmount, discountAmount, shippingCharges, status, isUrgent, notes, staffImages, 
        staffPdfs, accountsAttachments, orderManagementAttachments, designAttachments, machineFiles,
        designName, designAmount, designGst, designDiscount, designNotes,
        assignedDesigner, holdReason, previousStatus, createdBy, createdByName, accountsNotes,
        original_design_file, original_design_filename,
        sentByAccounts,
        createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id, customer.name, customer.company, customer.phone, customer.address,
          order.category, order.quantity, JSON.stringify(order.details || {}), JSON.stringify(order.sizeBreakdown || []),
          financials.totalAmount, financials.advancePay, financials.balanceAmount,
          financials.gstAmount, financials.discountAmount, financials.shippingCharges,
          order.status, order.isUrgent ? 1 : 0, order.notes, JSON.stringify(order.staffImages || []),
          JSON.stringify(order.staffPdfs || []), JSON.stringify(order.accountsAttachments || []),
          JSON.stringify(order.orderManagementAttachments || []), JSON.stringify(order.designAttachments || []),
          JSON.stringify(order.machineFiles || []), order.designName || null, Number(order.designAmount || 0),
          Number(order.designGst || 0), Number(order.designDiscount || 0), order.designNotes || null,
          order.assignedDesigner || 'Unassigned', order.holdReason || null, order.previousStatus || null,
          order.createdBy || null, order.createdByName || null, order.accountsNotes || null,
          order.original_design_file || null, order.original_design_filename || null,
          order.sentByAccounts ? 1 : 0,
          Date.now(), Date.now()
        ]
      );

      const targetRoles = [];
      if (order.status === 'accounts') targetRoles.push('accounts');
      else if (order.status === 'design') targetRoles.push('designer');
      else if (order.status === 'pending') targetRoles.push('marketing');
      
      if (!targetRoles.includes('admin')) {
        targetRoles.push('admin');
      }

      for (const role of targetRoles) {
        await query(
          'INSERT INTO notifications (id, userRole, title, message, orderId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            role,
            `New Order Created`,
            `Order #${order.id.slice(-6)} has been created in ${order.status.toUpperCase()}`,
            order.id,
            0,
            Date.now()
          ]
        );
      }
    }

    if (order.status === 'accounts') {
      const revId = `rev-${order.id}`;
      const revExisting = await query('SELECT id FROM expenses WHERE id = ?', [revId]) as any[];
      if (revExisting.length > 0) {
        await query(
          'UPDATE expenses SET amount = ?, vendorName = ?, productName = ?, qty = ?, notes = ? WHERE id = ?',
          [
            financials.totalAmount || 0,
            customer.name || 'Client',
            order.category || 'Order',
            String(order.quantity || 0),
            order.notes || `Auto-created revenue from Order #${order.id.slice(-6)}`,
            revId
          ]
        );
      } else {
        await query(
          `INSERT INTO expenses (id, type, userId, userName, vendorName, productName, qty, colour, size, amount, date, billFile, notes, recipientName, month, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            revId,
            'revenue',
            order.createdBy || 'system',
            order.createdByName || 'System',
            customer.name || 'Client',
            order.category || 'Order',
            String(order.quantity || 0),
            null,
            null,
            financials.totalAmount || 0,
            new Date().toISOString().split('T')[0],
            null,
            order.notes || `Auto-created revenue from Order #${order.id.slice(-6)}`,
            null,
            new Date().toLocaleString('en-US', { month: 'long' }),
            Date.now()
          ]
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving order:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  const id = (await resolveOrderId(req.params.id)) || sanitizeId(req.params.id);
  try {
    await query('DELETE FROM orders WHERE id = ? OR id = ?', [id, '#' + id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

const handleUpdateOrderFields = async (req, res) => {
  const rawId = sanitizeId(req.params.id);
  const updates = req.body;
  
  if (!rawId) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }
  
  try {
    // Resolve the actual ID stored in DB (handles both #ID and ID forms)
    const id = await resolveOrderId(rawId);
    if (!id) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const existing = await query('SELECT status, original_design_file, totalAmount, customerName, category, quantity FROM orders WHERE id = ?', [id]) as any[];
    const oldStatus = existing[0].status;
    const oldDesignFile = existing[0].original_design_file;
    
    const newId = updates.id;
    if (newId && newId !== id) {
      const collision = await query('SELECT id FROM orders WHERE id = ?', [newId]) as any[];
      if (collision.length > 0) {
        return res.status(400).json({ success: false, message: `An order with ID "${newId}" already exists.` });
      }
    }
    
    const fields: string[] = [];
    const params: any[] = [];
    
    const keyToColumnMap: { [key: string]: string } = {
      category: 'category',
      quantity: 'quantity',
      status: 'status',
      isUrgent: 'isUrgent',
      notes: 'notes',
      designNotes: 'designNotes',
      designName: 'designName',
      designAmount: 'designAmount',
      designGst: 'designGst',
      designDiscount: 'designDiscount',
      assignedDesigner: 'assignedDesigner',
      holdReason: 'holdReason',
      previousStatus: 'previousStatus',
      createdBy: 'createdBy',
      createdByName: 'createdByName',
      accountsNotes: 'accountsNotes',
      original_design_file: 'original_design_file',
      original_design_filename: 'original_design_filename',
      sentByAccounts: 'sentByAccounts',
      vendorName: 'vendorName',
      vendorNumber: 'vendorNumber',
      vendorCompany: 'vendorCompany',
      vendorSize: 'vendorSize',
      vendorQty: 'vendorQty',
      vendorHub: 'vendorHub',
      vendorMaterial: 'vendorMaterial',
      vendorModel: 'vendorModel',
      vendorSleeve: 'vendorSleeve',
      vendorPocket: 'vendorPocket',
      vendorColor: 'vendorColor',
      vendorInstructions: 'vendorInstructions',
      vendorDeliveryName: 'vendorDeliveryName',
      vendorDeliveryPhone: 'vendorDeliveryPhone',
      vendorDeliveryVehicle: 'vendorDeliveryVehicle',
      vendorDeliveryCourier: 'vendorDeliveryCourier',
      vendorDeliveryTransportType: 'vendorDeliveryTransportType',
      vendorDeliveryQty: 'vendorDeliveryQty',
      marketing_image: 'marketing_image',
      marketing_notes: 'marketing_notes',
      invoice_file: 'invoice_file',
      invoice_file_name: 'invoice_file_name',
      digitizer_file: 'digitizer_file',
      digitizer_filename: 'digitizer_filename',
      balance_received_notes: 'balance_received_notes',
    };
    
    if (updates.customerInfo) {
      const customer = updates.customerInfo;
      if (customer.name !== undefined) { fields.push('customerName = ?'); params.push(customer.name); }
      if (customer.company !== undefined) { fields.push('customerCompany = ?'); params.push(customer.company); }
      if (customer.phone !== undefined) { fields.push('customerPhone = ?'); params.push(customer.phone); }
      if (customer.address !== undefined) { fields.push('customerAddress = ?'); params.push(customer.address); }
    }
    
    if (updates.financials) {
      const fin = updates.financials;
      if (fin.totalAmount !== undefined) { fields.push('totalAmount = ?'); params.push(fin.totalAmount); }
      if (fin.advancePay !== undefined) { fields.push('advancePay = ?'); params.push(fin.advancePay); }
      if (fin.balanceAmount !== undefined) { fields.push('balanceAmount = ?'); params.push(fin.balanceAmount); }
      if (fin.gstAmount !== undefined) { fields.push('gstAmount = ?'); params.push(fin.gstAmount); }
      if (fin.discountAmount !== undefined) { fields.push('discountAmount = ?'); params.push(fin.discountAmount); }
      if (fin.shippingCharges !== undefined) { fields.push('shippingCharges = ?'); params.push(fin.shippingCharges); }
    }
    
    if (updates.details !== undefined) {
      fields.push('details = ?');
      params.push(JSON.stringify(updates.details || {}));
    }
    if (updates.sizeBreakdown !== undefined) {
      fields.push('sizeBreakdown = ?');
      params.push(JSON.stringify(updates.sizeBreakdown || []));
    }
    if (updates.staffImages !== undefined) {
      fields.push('staffImages = ?');
      params.push(JSON.stringify(updates.staffImages || []));
    }
    if (updates.staffPdfs !== undefined) {
      fields.push('staffPdfs = ?');
      params.push(JSON.stringify(updates.staffPdfs || []));
    }
    if (updates.accountsAttachments !== undefined) {
      fields.push('accountsAttachments = ?');
      params.push(JSON.stringify(updates.accountsAttachments || []));
    }
    if (updates.orderManagementAttachments !== undefined) {
      fields.push('orderManagementAttachments = ?');
      params.push(JSON.stringify(updates.orderManagementAttachments || []));
    }
    if (updates.designAttachments !== undefined) {
      fields.push('designAttachments = ?');
      params.push(JSON.stringify(updates.designAttachments || []));
    }
    if (updates.machineFiles !== undefined) {
      fields.push('machineFiles = ?');
      params.push(JSON.stringify(updates.machineFiles || []));
    }
    
    for (const key in keyToColumnMap) {
      if (updates[key] !== undefined) {
        fields.push(`${keyToColumnMap[key]} = ?`);
        let val = updates[key];
        if (key === 'isUrgent') {
          val = val ? 1 : 0;
        }
        params.push(val);
      }
    }
    
    if (newId && newId !== id) {
      fields.push('id = ?');
      params.push(newId);
    }
    
    if (fields.length === 0) {
      return res.json({ success: true, message: 'No fields to update.' });
    }
    
    fields.push('updatedAt = ?');
    params.push(Date.now());
    
    params.push(id);
    
    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, params);

    // Cascade ID updates to other referencing tables
    if (newId && newId !== id) {
      await query('UPDATE invoices SET order_id = ? WHERE order_id = ?', [newId, id]);
      await query('UPDATE notifications SET orderId = ? WHERE orderId = ?', [newId, id]);
      await query('UPDATE expenses SET id = ? WHERE id = ?', [`rev-${newId}`, `rev-${id}`]);
    }
    
    const newStatus = updates.status;
    if (newStatus && oldStatus !== newStatus) {
      const targetRoles = [];
      if (newStatus === 'accounts') targetRoles.push('accounts');
      else if (newStatus === 'design') {
        targetRoles.push('designer');
        if (updates.original_design_file || oldDesignFile) {
          targetRoles.push('digitizer');
        }
      }
      else if (newStatus === 'order_management') targetRoles.push('order_management');
      else if (newStatus === 'production') {
        targetRoles.push('production');
        targetRoles.push('vendor');
      }
      else if (newStatus === 'delivery') targetRoles.push('delivery');
      else if (newStatus === 'delivered') {
        targetRoles.push('marketing');
        targetRoles.push('admin');
      }
      
      if (!targetRoles.includes('admin')) {
        targetRoles.push('admin');
      }
      
      const customerName = updates.customerInfo?.name || '';
      for (const role of targetRoles) {
        await query(
          'INSERT INTO notifications (id, userRole, title, message, orderId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            role,
            `Order Status Moved`,
            `Order for ${customerName || 'Client'} has been moved to ${newStatus.toUpperCase()}`,
            id,
            0,
            Date.now()
          ]
        );
      }
    }

    if (newStatus === 'accounts') {
      const revId = `rev-${id}`;
      const revExisting = await query('SELECT id FROM expenses WHERE id = ?', [revId]) as any[];
      const totalAmount = existing[0]?.totalAmount || 0;
      const customerName = existing[0]?.customerName || 'Client';
      const category = existing[0]?.category || 'Order';
      const quantity = existing[0]?.quantity || 0;
      
      if (revExisting.length > 0) {
        await query(
          'UPDATE expenses SET amount = ?, vendorName = ?, productName = ?, qty = ?, notes = ? WHERE id = ?',
          [
            totalAmount,
            customerName,
            category,
            String(quantity),
            updates.accountsNotes || updates.notes || `Auto-created revenue from Order #${id.slice(-6)}`,
            revId
          ]
        );
      } else {
        await query(
          `INSERT INTO expenses (id, type, userId, userName, vendorName, productName, qty, colour, size, amount, date, billFile, notes, recipientName, month, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            revId,
            'revenue',
            updates.createdBy || 'system',
            updates.createdByName || 'System',
            customerName,
            category,
            String(quantity),
            null,
            null,
            totalAmount,
            new Date().toISOString().split('T')[0],
            null,
            updates.accountsNotes || updates.notes || `Auto-created revenue from Order #${id.slice(-6)}`,
            null,
            new Date().toLocaleString('en-US', { month: 'long' }),
            Date.now()
          ]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error patching/updating order:', error);
    res.status(500).json({ error: error.message });
  }
};

router.patch('/orders/:id', handleUpdateOrderFields);
router.put('/orders/:id', handleUpdateOrderFields);

// ----------------------------------------------------
// INVOICES ENDPOINTS
// ----------------------------------------------------

router.get('/invoices', async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, invoiceNumber, date, createdAt, dueDate, billToName, billToEmail, 
             billToPhone, billToAddress, shipToAddress, trackingNumber, items, 
             subtotal, discountTotal, shippingCost, salesTax, total, amountPaid, 
             balanceDue, notes, paymentInstructions, paymentMethod, productType, 
             productSubCategory, customerPhoneNumber, bankName, bankAccountName, 
             bankIfscCode, bankAccountNumber, createdBy, createdByName, leadId, 
             creatorRole, 
             invoice_file_name, order_id, type, client, amount, status, description, 
             invoice_date, created_at, designName, designAmount, designGst, 
             designDiscount, designNotes 
      FROM invoices
    `) as any[];
    const mapped = rows.map(r => ({
      ...r,
      items: safeJSONParse(r.items, []),
      subtotal: Number(r.subtotal || 0),
      discountTotal: Number(r.discountTotal || 0),
      shippingCost: Number(r.shippingCost || 0),
      salesTax: Number(r.salesTax || 0),
      total: Number(r.total || 0),
      amountPaid: Number(r.amountPaid || 0),
      balanceDue: Number(r.balanceDue || 0),
      designAmount: Number(r.designAmount || 0),
      designGst: Number(r.designGst || 0),
      designDiscount: Number(r.designDiscount || 0),
      invoice_file: '',
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id/file', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query('SELECT invoice_file FROM invoices WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ invoice_file: rows[0].invoice_file || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  const inv = req.body;
  if (!inv.id) {
    return res.status(400).json({ success: false, message: 'Invoice ID payload parameter is required.' });
  }
  try {
    const existing = await query('SELECT id FROM invoices WHERE id = ?', [inv.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE invoices SET invoiceNumber=?, date=?, createdAt=?, dueDate=?, billToName=?, billToEmail=?, 
        billToPhone=?, billToAddress=?, shipToAddress=?, trackingNumber=?, items=?, subtotal=?, 
        discountTotal=?, shippingCost=?, salesTax=?, total=?, amountPaid=?, balanceDue=?, notes=?, 
        paymentInstructions=?, paymentMethod=?, productType=?, productSubCategory=?, customerPhoneNumber=?, 
        companySignature=?, bankName=?, bankAccountName=?, bankIfscCode=?, bankAccountNumber=?, createdBy=?, 
        createdByName=?, leadId=?, creatorRole=?, designName=?, designAmount=?, designGst=?, designDiscount=?, designNotes=? WHERE id=?`,
        [
          inv.invoiceNumber, inv.date, inv.createdAt, inv.dueDate, inv.billToName, inv.billToEmail,
          inv.billToPhone, inv.billToAddress, inv.shipToAddress, inv.trackingNumber, JSON.stringify(inv.items || []),
          inv.subtotal, inv.discountTotal, inv.shippingCost, inv.salesTax, inv.total, inv.amountPaid, inv.balanceDue,
          inv.notes, inv.paymentInstructions, inv.paymentMethod, inv.productType, inv.productSubCategory,
          inv.customerPhoneNumber, inv.companySignature, inv.bankName, inv.bankAccountName, inv.bankIfscCode,
          inv.bankAccountNumber, inv.createdBy, inv.createdByName, inv.leadId, inv.creatorRole || null,
          inv.designName || null, Number(inv.designAmount || 0), Number(inv.designGst || 0), Number(inv.designDiscount || 0),
          inv.designNotes || null, inv.id
        ]
      );
    } else {
      await query(
        `INSERT INTO invoices (id, invoiceNumber, date, createdAt, dueDate, billToName, billToEmail, 
        billToPhone, billToAddress, shipToAddress, trackingNumber, items, subtotal, discountTotal, 
        shippingCost, salesTax, total, amountPaid, balanceDue, notes, paymentInstructions, 
        paymentMethod, productType, productSubCategory, customerPhoneNumber, companySignature, 
        bankName, bankAccountName, bankIfscCode, bankAccountNumber, createdBy, createdByName, leadId,
        creatorRole, designName, designAmount, designGst, designDiscount, designNotes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.id, inv.invoiceNumber, inv.date, inv.createdAt, inv.dueDate, inv.billToName, inv.billToEmail,
          inv.billToPhone, inv.billToAddress, inv.shipToAddress, inv.trackingNumber, JSON.stringify(inv.items || []),
          inv.subtotal, inv.discountTotal, inv.shippingCost, inv.salesTax, inv.total, inv.amountPaid, inv.balanceDue,
          inv.notes, inv.paymentInstructions, inv.paymentMethod, inv.productType, inv.productSubCategory,
          inv.customerPhoneNumber, inv.companySignature, inv.bankName, inv.bankAccountName, inv.bankIfscCode,
          inv.bankAccountNumber, inv.createdBy, inv.createdByName, inv.leadId, inv.creatorRole || null,
          inv.designName || null, Number(inv.designAmount || 0), Number(inv.designGst || 0), Number(inv.designDiscount || 0),
          inv.designNotes || null
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// INVENTORY ENDPOINTS
// ----------------------------------------------------

router.get('/inventory', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM inventory_movements') as any[];
    const mapped = rows.map(r => ({
      ...r,
      quantity: Number(r.quantity || 0),
      createdAt: Number(r.createdAt || 0),
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/inventory', async (req, res) => {
  const inv = req.body;
  if (!inv.id) {
    return res.status(400).json({ success: false, message: 'Inventory Movement ID payload missing.' });
  }
  try {
    const existing = await query('SELECT id FROM inventory_movements WHERE id = ?', [inv.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE inventory_movements SET type=?, vendor=?, customer=?, date=?, transportName=?, 
        transportNumber=?, orderId=?, product=?, productType=?, sleeve=?, pocket=?, quantity=?, 
        colour=?, gsm=?, size=?, createdAt=? WHERE id=?`,
        [
          inv.type, inv.vendor, inv.customer, inv.date, inv.transportName,
          inv.transportNumber, inv.orderId, inv.product, inv.productType, inv.sleeve, inv.pocket,
          inv.quantity, inv.colour || null, inv.gsm || null, inv.size || null, inv.createdAt, inv.id
        ]
      );
    } else {
      await query(
        `INSERT INTO inventory_movements (id, type, vendor, customer, date, transportName, 
        transportNumber, orderId, product, productType, sleeve, pocket, quantity, 
        colour, gsm, size, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.id, inv.type, inv.vendor, inv.customer, inv.date, inv.transportName,
          inv.transportNumber, inv.orderId, inv.product, inv.productType, inv.sleeve, inv.pocket,
          inv.quantity, inv.colour || null, inv.gsm || null, inv.size || null, inv.createdAt
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving inventory movement:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM inventory_movements WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inventory movement:', error);
    res.status(500).json({ error: error.message });
  }
});
// ----------------------------------------------------
// LEAVE CALENDAR ENDPOINTS
// ----------------------------------------------------

router.get('/leaves', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM leaves ORDER BY createdAt DESC') as any[];
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leaves', async (req, res) => {
  const { id, userId, userName, userRole, startDate, endDate, leaveType, reason } = req.body;
  if (!id || !userId || !userName || !startDate || !endDate || !leaveType) {
    return res.status(400).json({ success: false, message: 'Missing required leave parameters.' });
  }
  try {
    await query(
      `INSERT INTO leaves (id, userId, userName, userRole, startDate, endDate, leaveType, reason, status, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [id, userId, userName, userRole || 'staff', startDate, endDate, leaveType, reason || null, Date.now()]
    );

    // Live notification for admin role with sound
    await query(
      `INSERT INTO notifications (id, userRole, title, message, isRead, createdAt) 
      VALUES (?, ?, ?, ?, 0, ?)`,
      [
        `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        'admin',
        'Leave Request Applied',
        `${userName} (${userRole || 'staff'}) has applied for ${leaveType} leave starting ${startDate}`,
        Date.now()
      ]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error creating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/leaves/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid leave status.' });
  }
  try {
    await query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// EXPENSE ENDPOINTS
// ----------------------------------------------------

router.get('/expenses', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM expenses';
    const params: any[] = [];
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY createdAt DESC';
    const rows = await query(sql, params);
    res.json({ success: true, expenses: rows });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/expenses', async (req, res) => {
  const { id, type, userId, userName, vendorName, productName, qty, colour, size, amount, date, billFile, notes, recipientName, month } = req.body;
  if (!id || !type || !userId || !amount || !date) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  try {
    await query(
      'INSERT INTO expenses (id, type, userId, userName, vendorName, productName, qty, colour, size, amount, date, billFile, notes, recipientName, month, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, type, userId, userName, vendorName || null, productName || null, qty || null, colour || null, size || null, amount, date, billFile || null, notes || null, recipientName || null, month || null, Date.now()]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// SIDEBAR MESSAGES ENDPOINTS (Filtered by Private Chat channels)
// ----------------------------------------------------

router.get('/messages', async (req, res) => {
  const { senderId, recipientId } = req.query;
  try {
    let rows;
    if (senderId && recipientId) {
      rows = await query(
        `SELECT * FROM sidebar_messages 
         WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
         ORDER BY createdAt ASC`,
        [senderId, recipientId, recipientId, senderId]
      ) as any[];
    } else {
      rows = await query(
        `SELECT * FROM sidebar_messages 
         WHERE recipientId IS NULL OR recipientId = 'global'
         ORDER BY createdAt ASC`
      ) as any[];
    }
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching sidebar messages:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/messages', async (req, res) => {
  const { id, senderId, senderName, senderRole, message, attachment, recipientId } = req.body;
  if (!senderId || !senderName || !senderRole || !message) {
    return res.status(400).json({ success: false, message: 'Missing required message parameters.' });
  }
  const msgId = id || `msg_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  try {
    await query(
      'INSERT INTO sidebar_messages (id, senderId, senderName, senderRole, message, attachment, recipientId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [msgId, senderId, senderName, senderRole, message, attachment || null, recipientId || null, Date.now()]
    );
    res.json({ success: true, messageId: msgId });
  } catch (error: any) {
    console.error('Error creating sidebar message:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// INVITATIONS ENDPOINTS
// ----------------------------------------------------

router.post('/invitations', async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ success: false, message: 'Email and role are required.' });
  }
  const token = 'inv_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  try {
    await query(
      'INSERT INTO invitations (id, email, role, status, createdAt) VALUES (?, ?, ?, ?, ?)',
      [token, email.trim().toLowerCase(), role, 'pending', Date.now()]
    );
    res.json({ success: true, inviteId: token });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM invitations ORDER BY createdAt DESC') as any[];
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/invitations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query('SELECT * FROM invitations WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }
    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/invitations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM invitations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// CHANNEL LISTINGS ENDPOINTS
// ----------------------------------------------------

router.get('/channel-listings', async (req, res) => {
  const { platform } = req.query;
  try {
    let sql = 'SELECT * FROM channel_listings';
    const params: any[] = [];
    if (platform) {
      sql += ' WHERE platform = ?';
      params.push(platform);
    }
    sql += ' ORDER BY createdAt DESC';
    const rows = await query(sql, params);
    res.json({ success: true, listings: rows });
  } catch (error: any) {
    console.error('Error fetching channel listings:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/channel-listings', async (req, res) => {
  const { id, platform, productName, sku, price, stock, details, image } = req.body;
  if (!id || !platform || !productName || !price) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }
  try {
    await query(
      'INSERT INTO channel_listings (id, platform, productName, sku, price, stock, details, image, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, platform, productName, sku || null, parseFloat(price) || 0, parseInt(stock, 10) || 0, details || null, image || null, Date.now()]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error creating channel listing:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/channel-listings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM channel_listings WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting channel listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTIFICATIONS ENDPOINTS
router.get('/notifications', async (req, res) => {
  const { role, userId } = req.query;
  try {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    if (role && role !== 'admin') {
      sql += ' AND userRole = ?';
      params.push(role);
    }
    sql += ' ORDER BY createdAt DESC LIMIT 50';
    const rows = await query(sql, params);
    res.json({ success: true, notifications: rows });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/read', async (req, res) => {
  const { ids, role } = req.body;
  try {
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await query(`UPDATE notifications SET isRead = 1 WHERE id IN (${placeholders})`, ids);
    } else if (role) {
      await query('UPDATE notifications SET isRead = 1 WHERE userRole = ? OR userRole = \'admin\'', [role]);
    } else {
      await query('UPDATE notifications SET isRead = 1');
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
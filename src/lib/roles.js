export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
};

// Assignable via Admin > Staff (super_admin is only assignable by an existing super_admin)
export const ASSIGNABLE_ROLES = ['super_admin', 'admin', 'manager', 'cashier', 'kitchen'];

// Configurable via Admin > Access Control (super_admin excluded — it's not configurable, always full access)
export const CONFIGURABLE_ROLES = ['admin', 'manager', 'cashier', 'kitchen'];

// All nav pages, in display order
export const PAGES = [
  { id: 'pos', icon: '🛒', label: 'POS' },
  { id: 'orders', icon: '🧾', label: 'Orders' },
  { id: 'kds', icon: '🔥', label: 'KDS' },
  { id: 'tables', icon: '🪑', label: 'Tables' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'sales', icon: '💰', label: 'Sales' },
  { id: 'products', icon: '📦', label: 'Products' },
  { id: 'area', icon: '📍', label: 'Area' },
  { id: 'customers', icon: '👥', label: 'Customers' },
  { id: 'admin', icon: '⚙️', label: 'Admin' },
];

// access: Map<role, Set<page_id>> fetched from role_page_access (see RoleAccessContext)
export function canAccess(role, pageId, access) {
  if (role === 'super_admin') return true;
  return !!access?.[role]?.has(pageId);
}

export function firstAllowedPage(role, access) {
  if (role === 'super_admin') return PAGES[0].id;
  return PAGES.find((p) => canAccess(role, p.id, access))?.id || 'kds';
}

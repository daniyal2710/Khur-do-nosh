export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
};

// Which roles can see which nav pages
export const PAGE_ACCESS = {
  pos: ['admin', 'manager', 'cashier'],
  orders: ['admin', 'manager', 'cashier'],
  kds: ['admin', 'manager', 'cashier', 'kitchen'],
  dashboard: ['admin', 'manager'],
  sales: ['admin', 'manager'],
  products: ['admin', 'manager'],
  area: ['admin', 'manager'],
  customers: ['admin', 'manager', 'cashier'],
  admin: ['admin'],
};

export function canAccess(role, pageId) {
  return (PAGE_ACCESS[pageId] || []).includes(role);
}

export function firstAllowedPage(role) {
  return Object.keys(PAGE_ACCESS).find((p) => canAccess(role, p)) || 'kds';
}

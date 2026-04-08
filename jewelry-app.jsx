import React, { useState, useEffect, useContext, createContext } from 'react';
import { createRoot } from 'react-dom/client';

// ============================================
// CONFIGURAÇÃO E ESTILOS
// ============================================

const COLORS = {
  bg: '#0a0a0a',
  bgSecondary: '#111111',
  bgCard: '#1a1a1a',
  gold: '#c9a84c',
  goldLight: '#d4bc6a',
  goldDark: '#a08530',
  white: '#ffffff',
  gray: '#888888',
  grayLight: '#cccccc',
  success: '#4ade80',
  danger: '#f87171'
};

const generateStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: ${COLORS.bg};
    color: ${COLORS.white};
    min-height: 100vh;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Playfair Display', serif;
  }

  .app-container {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar Navigation */
  .sidebar {
    width: 260px;
    background: linear-gradient(180deg, ${COLORS.bgSecondary} 0%, ${COLORS.bg} 100%);
    border-right: 1px solid rgba(201, 168, 76, 0.2);
    padding: 30px 20px;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    z-index: 100;
  }

  .logo {
    text-align: center;
    margin-bottom: 40px;
  }

  .logo-icon {
    font-size: 48px;
    margin-bottom: 10px;
  }

  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 600;
    color: ${COLORS.gold};
    letter-spacing: 2px;
  }

  .nav-menu {
    list-style: none;
  }

  .nav-item {
    margin-bottom: 8px;
  }

  .nav-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    color: ${COLORS.grayLight};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .nav-button:hover {
    background: rgba(201, 168, 76, 0.1);
    border-color: rgba(201, 168, 76, 0.3);
    color: ${COLORS.goldLight};
  }

  .nav-button.active {
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.2) 0%, rgba(201, 168, 76, 0.05) 100%);
    border-color: ${COLORS.gold};
    color: ${COLORS.gold};
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    opacity: 0.8;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: 260px;
    padding: 40px;
    min-height: 100vh;
  }

  .page-title {
    font-size: 32px;
    font-weight: 600;
    color: ${COLORS.gold};
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.3);
  }

  /* Cards */
  .card {
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 16px;
    padding: 24px;
    transition: all 0.3s ease;
  }

  .card:hover {
    border-color: ${COLORS.gold};
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(201, 168, 76, 0.15);
  }

  /* Forms */
  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: ${COLORS.goldLight};
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 14px 16px;
    background: ${COLORS.bgSecondary};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 10px;
    color: ${COLORS.white};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: ${COLORS.gold};
    box-shadow: 0 0 20px rgba(201, 168, 76, 0.2);
  }

  .form-textarea {
    min-height: 100px;
    resize: vertical;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  /* Buttons */
  .btn {
    padding: 14px 28px;
    border-radius: 10px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary {
    background: linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%);
    color: ${COLORS.bg};
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(201, 168, 76, 0.4);
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid ${COLORS.gold};
    color: ${COLORS.gold};
  }

  .btn-secondary:hover {
    background: rgba(201, 168, 76, 0.1);
  }

  .btn-danger {
    background: ${COLORS.danger};
    color: ${COLORS.white};
  }

  .btn-success {
    background: ${COLORS.success};
    color: ${COLORS.bg};
  }

  .btn-sm {
    padding: 8px 16px;
    font-size: 12px;
  }

  /* Grid Layouts */
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }

  /* Jewelry Card */
  .jewelry-card {
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 16px;
    padding: 24px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .jewelry-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold});
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .jewelry-card:hover {
    border-color: ${COLORS.gold};
    transform: translateY(-4px);
    box-shadow: 0 15px 50px rgba(201, 168, 76, 0.2);
  }

  .jewelry-card:hover::before {
    opacity: 1;
  }

  .jewelry-code {
    display: inline-block;
    background: linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%);
    color: ${COLORS.bg};
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }

  .jewelry-name {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: ${COLORS.white};
  }

  .jewelry-type {
    font-size: 12px;
    color: ${COLORS.goldLight};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }

  .jewelry-description {
    font-size: 13px;
    color: ${COLORS.gray};
    margin-bottom: 16px;
    line-height: 1.6;
  }

  .jewelry-price {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 600;
    color: ${COLORS.gold};
    margin-bottom: 16px;
  }

  .jewelry-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid rgba(201, 168, 76, 0.2);
  }

  .jewelry-material {
    font-size: 11px;
    color: ${COLORS.gray};
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .status-available {
    background: rgba(74, 222, 128, 0.2);
    color: ${COLORS.success};
  }

  .status-sold {
    background: rgba(248, 113, 113, 0.2);
    color: ${COLORS.danger};
  }

  /* Dashboard Stats */
  .stat-card {
    background: linear-gradient(135deg, ${COLORS.bgCard} 0%, ${COLORS.bgSecondary} 100%);
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 16px;
    padding: 28px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    border-color: ${COLORS.gold};
    transform: translateY(-4px);
  }

  .stat-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 600;
    color: ${COLORS.gold};
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 12px;
    color: ${COLORS.gray};
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Chart */
  .chart-container {
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 16px;
    padding: 24px;
    margin-top: 30px;
  }

  .chart-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: ${COLORS.gold};
    margin-bottom: 20px;
  }

  .chart-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    height: 200px;
    padding: 20px 0;
  }

  .chart-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .bar {
    width: 50px;
    background: linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%);
    border-radius: 8px 8px 0 0;
    transition: all 0.3s ease;
  }

  .bar:hover {
    opacity: 0.8;
    transform: scaleY(1.05);
  }

  .bar-label {
    font-size: 12px;
    color: ${COLORS.gray};
  }

  /* Cart Sidebar */
  .cart-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 200;
    display: flex;
    justify-content: flex-end;
  }

  .cart-sidebar {
    width: 420px;
    background: ${COLORS.bgSecondary};
    border-left: 1px solid rgba(201, 168, 76, 0.3);
    padding: 30px;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.2);
  }

  .cart-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    color: ${COLORS.gold};
  }

  .cart-close {
    background: transparent;
    border: none;
    color: ${COLORS.gray};
    font-size: 24px;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .cart-close:hover {
    color: ${COLORS.gold};
  }

  .cart-items {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
  }

  .cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: ${COLORS.bgCard};
    border-radius: 10px;
    margin-bottom: 12px;
    border: 1px solid rgba(201, 168, 76, 0.1);
  }

  .cart-item-info {
    flex: 1;
  }

  .cart-item-code {
    font-weight: 600;
    color: ${COLORS.gold};
    font-size: 14px;
  }

  .cart-item-name {
    font-size: 13px;
    color: ${COLORS.grayLight};
  }

  .cart-item-price {
    font-weight: 600;
    color: ${COLORS.white};
  }

  .cart-item-remove {
    background: transparent;
    border: none;
    color: ${COLORS.danger};
    cursor: pointer;
    padding: 4px 8px;
    font-size: 18px;
    transition: all 0.3s ease;
  }

  .cart-item-remove:hover {
    transform: scale(1.2);
  }

  .cart-summary {
    background: ${COLORS.bgCard};
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(201, 168, 76, 0.2);
  }

  .cart-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .cart-row.total {
    font-size: 18px;
    font-weight: 600;
    color: ${COLORS.gold};
    padding-top: 12px;
    border-top: 1px solid rgba(201, 168, 76, 0.2);
  }

  /* Discount Section */
  .discount-section {
    margin: 20px 0;
    padding: 16px;
    background: ${COLORS.bgCard};
    border-radius: 10px;
    border: 1px solid rgba(201, 168, 76, 0.2);
  }

  .discount-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .discount-tab {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 8px;
    color: ${COLORS.grayLight};
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
  }

  .discount-tab.active {
    background: rgba(201, 168, 76, 0.2);
    border-color: ${COLORS.gold};
    color: ${COLORS.gold};
  }

  /* Filters */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 12px 20px;
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 10px;
    color: ${COLORS.white};
    font-size: 14px;
    cursor: pointer;
    min-width: 180px;
  }

  .filter-select:focus {
    outline: none;
    border-color: ${COLORS.gold};
  }

  /* Search Box */
  .search-box {
    position: relative;
    margin-bottom: 30px;
  }

  .search-input {
    width: 100%;
    padding: 16px 20px 16px 50px;
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 12px;
    color: ${COLORS.white};
    font-size: 16px;
    transition: all 0.3s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: ${COLORS.gold};
    box-shadow: 0 0 30px rgba(201, 168, 76, 0.15);
  }

  .search-icon {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: ${COLORS.gray};
  }

  /* Product Search Result */
  .search-result {
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-result-info {
    flex: 1;
  }

  .search-result-code {
    color: ${COLORS.gold};
    font-weight: 600;
    margin-bottom: 4px;
  }

  .search-result-name {
    font-size: 16px;
    margin-bottom: 4px;
  }

  .search-result-price {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: ${COLORS.gold};
  }

  /* Sales History */
  .sales-history {
    margin-top: 30px;
  }

  .sales-list {
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 12px;
    overflow: hidden;
  }

  .sale-item {
    padding: 20px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.3s ease;
  }

  .sale-item:hover {
    background: rgba(201, 168, 76, 0.05);
  }

  .sale-item:last-child {
    border-bottom: none;
  }

  .sale-info {
    flex: 1;
  }

  .sale-customer {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .sale-date {
    font-size: 12px;
    color: ${COLORS.gray};
  }

  .sale-total {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: ${COLORS.gold};
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: ${COLORS.gray};
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
  }

  .empty-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    margin-bottom: 10px;
    color: ${COLORS.goldLight};
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fade-in {
    animation: fadeIn 0.5s ease;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .sidebar {
      width: 200px;
    }
    .main-content {
      margin-left: 200px;
      padding: 20px;
    }
    .grid-3, .grid-4 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      height: auto;
      position: relative;
      border-right: none;
      border-bottom: 1px solid rgba(201, 168, 76, 0.2);
    }
    .main-content {
      margin-left: 0;
    }
    .grid-2, .grid-3, .grid-4 {
      grid-template-columns: 1fr;
    }
    .form-row {
      grid-template-columns: 1fr;
    }
    .cart-sidebar {
      width: 100%;
    }
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
  }

  .modal-content {
    background: ${COLORS.bgSecondary};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 16px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: ${COLORS.gold};
    margin-bottom: 20px;
  }

  /* Toast Notification */
  .toast {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${COLORS.bgCard};
    border: 1px solid rgba(201, 168, 76, 0.3);
    border-radius: 12px;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 400;
    animation: slideInRight 0.3s ease;
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .toast-success {
    border-left: 3px solid ${COLORS.success};
  }

  .toast-error {
    border-left: 3px solid ${COLORS.danger};
  }
`;

// ============================================
// CONTEXT & DATA MANAGEMENT
// ============================================

const AppContext = createContext();

const JEWELRY_TYPES = {
  BRINCO: { code: 'B', label: 'Brinco' },
  COLAR: { code: 'C', label: 'Colar' },
  ANEL: { code: 'A', label: 'Anel' },
  PULSEIRA: { code: 'P', label: 'Pulseira' },
  CONJUNTO: { code: 'S', label: 'Conjunto' },
  BRACELETE: { code: 'T', label: 'Bracelete' },
  PIERCING: { code: 'G', label: 'Piercing' }
};

const MATERIALS = ['Prata 925', 'Prata 925 rodinada', 'Semi Joia'];

const INITIAL_DATA = {
  jewelry: [],
  sales: [],
  deletedCodes: []
};

function AppProvider({ children }) {
  const [jewelry, setJewelry] = useState(() => {
    const saved = localStorage.getItem('jewelryData');
    return saved ? JSON.parse(saved).jewelry : INITIAL_DATA.jewelry;
  });

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('jewelryData');
    return saved ? JSON.parse(saved).sales : INITIAL_DATA.sales;
  });

  const [deletedCodes, setDeletedCodes] = useState(() => {
    const saved = localStorage.getItem('jewelryData');
    return saved ? JSON.parse(saved).deletedCodes : INITIAL_DATA.deletedCodes;
  });

  useEffect(() => {
    localStorage.setItem('jewelryData', JSON.stringify({ jewelry, sales, deletedCodes }));
  }, [jewelry, sales, deletedCodes]);

  const getNextCode = (type) => {
    const typeKey = Object.keys(JEWELRY_TYPES).find(k => JEWELRY_TYPES[k].label === type);
    if (!typeKey) return null;

    const prefix = JEWELRY_TYPES[typeKey].code;

    // Check for deleted codes of this type that can be reused
    const availableDeleted = deletedCodes.filter(dc => dc.code.startsWith(prefix));
    if (availableDeleted.length > 0) {
      // Sort by number and get the smallest
      availableDeleted.sort((a, b) => {
        const numA = parseInt(a.code.substring(1));
        const numB = parseInt(b.code.substring(1));
        return numA - numB;
      });
      const reused = availableDeleted[0].code;
      setDeletedCodes(prev => prev.filter(dc => dc.code !== reused));
      return reused;
    }

    // Get next available number
    const existingCodes = jewelry
      .filter(j => j.type === type)
      .map(j => j.code)
      .filter(c => c.startsWith(prefix));

    let nextNum = 1;
    while (existingCodes.includes(`${prefix}${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }

    return `${prefix}${String(nextNum).padStart(2, '0')}`;
  };

  const addJewelry = (data) => {
    const code = getNextCode(data.type);
    const newItem = {
      ...data,
      code,
      id: Date.now().toString(),
      status: 'available',
      createdAt: new Date().toISOString()
    };
    setJewelry(prev => [...prev, newItem]);
    return newItem;
  };

  const updateJewelry = (id, data) => {
    setJewelry(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const deleteJewelry = (id) => {
    const item = jewelry.find(j => j.id === id);
    if (item) {
      setDeletedCodes(prev => [...prev, { code: item.code, type: item.type }]);
      setJewelry(prev => prev.filter(j => j.id !== id));
    }
  };

  const markAsSold = (id) => {
    updateJewelry(id, { status: 'sold' });
  };

  const markAsAvailable = (id) => {
    updateJewelry(id, { status: 'available' });
  };

  const addSale = (saleData) => {
    setSales(prev => [...prev, saleData]);
    // Mark items as sold
    saleData.items.forEach(item => {
      markAsSold(item.id);
    });
  };

  const getSalesByMonth = (month, year) => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === month && saleDate.getFullYear() === year;
    });
  };

  const getDashboardData = () => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const monthSales = getSalesByMonth(lastMonth, lastMonthYear);

    const totalRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = monthSales.reduce((sum, sale) => sum + sale.items.length, 0);
    const totalProfit = monthSales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => itemSum + (item.costPrice || 0), 0);
      return sum + (sale.total - saleCost);
    }, 0);

    const avgTicket = monthSales.length > 0 ? totalRevenue / monthSales.length : 0;

    // Weekly breakdown
    const weeks = [[], [], [], []];
    monthSales.forEach(sale => {
      const day = new Date(sale.date).getDate();
      const weekIndex = Math.floor((day - 1) / 7);
      if (weekIndex < 4) weeks[weekIndex].push(sale);
    });

    const weeklySales = weeks.map(week =>
      week.reduce((sum, sale) => sum + sale.total, 0)
    );

    // Most sold products
    const productCount = {};
    monthSales.forEach(sale => {
      sale.items.forEach(item => {
        productCount[item.name] = (productCount[item.name] || 0) + 1;
      });
    });

    const mostSold = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalRevenue,
      totalItems,
      avgTicket,
      totalProfit,
      weeklySales,
      mostSold,
      totalSales: monthSales.length
    };
  };

  const value = {
    jewelry,
    sales,
    addJewelry,
    updateJewelry,
    deleteJewelry,
    markAsSold,
    markAsAvailable,
    addSale,
    getDashboardData,
    getNextCode
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// ============================================
// COMPONENTS
// ============================================

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
    </div>
  );
}

function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'register', label: 'Cadastro', icon: '✦' },
    { id: 'inventory', label: 'Estoque', icon: '◈' },
    { id: 'dashboard', label: 'Dashboard', icon: '◆' },
    { id: 'sales', label: 'Vendas', icon: '❖' }
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">💎</div>
        <div className="logo-text">LUXE JOIAS</div>
      </div>
      <ul className="nav-menu">
        {navItems.map(item => (
          <li key={item.id} className="nav-item">
            <button
              className={`nav-button ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function JewelryForm({ onSuccess }) {
  const { addJewelry, getNextCode } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    material: 'Prata 925',
    type: 'Brinco',
    description: '',
    costPrice: '',
    sellPrice: ''
  });
  const [previewCode, setPreviewCode] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const code = getNextCode(formData.type);
    setPreviewCode(code);
  }, [formData.type, getNextCode]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.sellPrice) {
      setToast({ message: 'Preencha todos os campos obrigatórios', type: 'error' });
      return;
    }

    const newItem = addJewelry({
      ...formData,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellPrice: parseFloat(formData.sellPrice)
    });

    setToast({ message: `Joia ${newItem.code} cadastrada com sucesso!`, type: 'success' });
    setFormData({
      name: '',
      material: 'Prata 925',
      type: 'Brinco',
      description: '',
      costPrice: '',
      sellPrice: ''
    });

    if (onSuccess) onSuccess();
  };

  return (
    <div className="fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome da Joia *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Brinco Solitário"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select
              className="form-select"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              {Object.values(JEWELRY_TYPES).map(t => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Material</label>
            <select
              className="form-select"
              value={formData.material}
              onChange={e => setFormData({ ...formData, material: e.target.value })}
            >
              {MATERIALS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Código Gerado</label>
            <div className="form-input" style={{ fontFamily: 'Playfair Display', fontWeight: 700, color: COLORS.gold }}>
              {previewCode}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detalhes adicionais sobre a peça..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Preço de Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.costPrice}
              onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preço de Venda (R$) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.sellPrice}
              onChange={e => setFormData({ ...formData, sellPrice: e.target.value })}
              placeholder="0,00"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>
          ✦ Cadastrar Joia
        </button>
      </form>
    </div>
  );
}

function RegisterPage() {
  return (
    <div>
      <h1 className="page-title">Cadastro de Joias</h1>
      <div className="card">
        <JewelryForm />
      </div>
    </div>
  );
}

function JewelryCard({ item, onSell, onDelete, onToggleStatus }) {
  const formatPrice = (price) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  return (
    <div className="jewelry-card fade-in">
      <span className="jewelry-code">{item.code}</span>
      <h3 className="jewelry-name">{item.name}</h3>
      <p className="jewelry-type">{item.type}</p>
      {item.description && <p className="jewelry-description">{item.description}</p>}
      <div className="jewelry-price">{formatPrice(item.sellPrice)}</div>

      <div className="jewelry-meta">
        <span className="jewelry-material">{item.material}</span>
        <span className={`status-badge ${item.status === 'available' ? 'status-available' : 'status-sold'}`}>
          {item.status === 'available' ? 'Disponível' : 'Vendido'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {item.status === 'available' ? (
          <button className="btn btn-success btn-sm" onClick={() => onSell(item.id)}>
            Vender
          </button>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => onToggleStatus(item.id)}>
            Disponibilizar
          </button>
        )}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>
          Excluir
        </button>
      </div>
    </div>
  );
}

function InventoryPage() {
  const { jewelry, markAsSold, markAsAvailable, deleteJewelry } = useApp();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState(null);

  const filteredItems = jewelry.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const availableCount = jewelry.filter(j => j.status === 'available').length;
  const soldCount = jewelry.filter(j => j.status === 'sold').length;

  const handleSell = (id) => {
    markAsSold(id);
    setToast({ message: 'Produto marcado como vendido', type: 'success' });
  };

  const handleToggleStatus = (id) => {
    markAsAvailable(id);
    setToast({ message: 'Produto disponibilizado', type: 'success' });
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta joia? O código será liberado para reutilização.')) {
      deleteJewelry(id);
      setToast({ message: 'Joia excluída com sucesso', type: 'success' });
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h1 className="page-title">Controle de Estoque</h1>

      <div className="grid-4" style={{ marginBottom: 30 }}>
        <div className="stat-card">
          <div className="stat-value">{jewelry.length}</div>
          <div className="stat-label">Total de Joias</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: COLORS.success }}>{availableCount}</div>
          <div className="stat-label">Disponíveis</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: COLORS.danger }}>{soldCount}</div>
          <div className="stat-label">Vendidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(JEWELRY_TYPES).length}</div>
          <div className="stat-label">Tipos</div>
        </div>
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Todos os Tipos</option>
          {Object.values(JEWELRY_TYPES).map(t => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>

        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos os Status</option>
          <option value="available">Disponíveis</option>
          <option value="sold">Vendidos</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">Nenhuma joia encontrada</div>
          <p>Cadastre novas joias ou ajuste os filtros</p>
        </div>
      ) : (
        <div className="grid-3">
          {filteredItems.map(item => (
            <JewelryCard
              key={item.id}
              item={item}
              onSell={handleSell}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const { getDashboardData, sales } = useApp();
  const data = getDashboardData();

  const formatPrice = (price) => `R$ ${price.toFixed(2).replace('.', ',')}`;
  const weekLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
  const maxWeekly = Math.max(...data.weeklySales, 1);

  return (
    <div>
      <h1 className="page-title">Dashboard de Vendas</h1>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatPrice(data.totalRevenue)}</div>
          <div className="stat-label">Total Vendido (Mês)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{data.totalItems}</div>
          <div className="stat-label">Peças Vendidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{formatPrice(data.avgTicket)}</div>
          <div className="stat-label">Ticket Médio</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{formatPrice(data.totalProfit)}</div>
          <div className="stat-label">Lucro Total</div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Vendas por Semana</h3>
        <div className="chart-bars">
          {data.weeklySales.map((value, index) => (
            <div className="chart-bar" key={index}>
              <div
                className="bar"
                style={{ height: `${(value / maxWeekly) * 150}px`, minHeight: value > 0 ? 20 : 5 }}
              />
              <span className="bar-label">{weekLabels[index]}</span>
              <span className="bar-label" style={{ color: COLORS.gold, fontWeight: 600 }}>
                {formatPrice(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: 24 }}>
        <h3 className="chart-title">Produtos Mais Vendidos</h3>
        {data.mostSold.length === 0 ? (
          <p style={{ color: COLORS.gray }}>Nenhuma venda registrada neste período</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.mostSold.map((product, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.bgSecondary, borderRadius: 8 }}>
                <span style={{ color: COLORS.white }}>{product.name}</span>
                <span style={{ color: COLORS.gold, fontWeight: 600 }}>{product.count}x</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sales-history">
        <h3 className="chart-title" style={{ marginBottom: 16 }}>Histórico de Vendas (Mês)</h3>
        {sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❖</div>
            <div className="empty-title">Nenhuma venda registrada</div>
          </div>
        ) : (
          <div className="sales-list">
            {sales.slice().reverse().map((sale, index) => (
              <div key={index} className="sale-item">
                <div className="sale-info">
                  <div className="sale-customer">{sale.customer || 'Cliente não informado'}</div>
                  <div className="sale-date">
                    {new Date(sale.date).toLocaleDateString('pt-BR')} • {sale.items.length} item(s)
                  </div>
                </div>
                <div className="sale-total">{formatPrice(sale.total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CartSidebar({ isOpen, onClose, cart, onRemoveItem, onCheckout, customerName, setCustomerName, discountType, setDiscountType, discountValue, setDiscountValue }) {
  const formatPrice = (price) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  const subtotal = cart.reduce((sum, item) => sum + item.sellPrice, 0);
  const discount = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : discountValue;
  const total = Math.max(0, subtotal - discount);

  if (!isOpen) return null;

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h2 className="cart-title">🛒 Carrinho</h2>
          <button className="cart-close" onClick={onClose}>×</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-state">
              <p>Carrinho vazio</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-code">{item.code}</div>
                  <div className="cart-item-name">{item.name}</div>
                </div>
                <div className="cart-item-price">{formatPrice(item.sellPrice)}</div>
                <button className="cart-item-remove" onClick={() => onRemoveItem(index)}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="discount-section">
              <label className="form-label" style={{ marginBottom: 8 }}>Desconto</label>
              <div className="discount-tabs">
                <button
                  className={`discount-tab ${discountType === 'percent' ? 'active' : ''}`}
                  onClick={() => setDiscountType('percent')}
                >
                  Percentual (%)
                </button>
                <button
                  className={`discount-tab ${discountType === 'fixed' ? 'active' : ''}`}
                  onClick={() => setDiscountType('fixed')}
                >
                  Valor Fixo (R$)
                </button>
              </div>
              <input
                type="number"
                className="form-input"
                value={discountValue}
                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'percent' ? 'Digite a % de desconto' : 'Digite o valor em R$'}
                step={discountType === 'percent' ? 1 : 0.01}
              />
            </div>

            <div className="cart-summary">
              <div className="cart-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-row" style={{ color: COLORS.success }}>
                <span>Desconto</span>
                <span>- {formatPrice(discount)}</span>
              </div>
              <div className="cart-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Nome do Cliente</label>
              <input
                type="text"
                className="form-input"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={onCheckout}>
              ✦ Finalizar Venda
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SalesPage() {
  const { jewelry, addSale } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [toast, setToast] = useState(null);

  const searchResults = jewelry.filter(item => {
    if (item.status !== 'available') return false;
    if (!cart.find(c => c.id === item.id)) {
      return item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  const addToCart = (item) => {
    setCart([...cart, item]);
    setSearchTerm('');
    setToast({ message: `${item.name} adicionado ao carrinho`, type: 'success' });
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + item.sellPrice, 0);
    const discount = discountType === 'percent'
      ? subtotal * (discountValue / 100)
      : discountValue;
    const total = Math.max(0, subtotal - discount);

    const saleData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      customer: customerName,
      items: cart.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        sellPrice: item.sellPrice,
        costPrice: item.costPrice
      })),
      subtotal,
      discount,
      discountType,
      total
    };

    addSale(saleData);
    setCart([]);
    setIsCartOpen(false);
    setCustomerName('');
    setDiscountValue(0);
    setToast({ message: 'Venda realizada com sucesso!', type: 'success' });
  };

  const formatPrice = (price) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h1 className="page-title">Vendas</h1>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Busque por código (ex: B01) ou nome da joia..."
        />
      </div>

      {searchResults.length > 0 && (
        <div className="grid-3" style={{ marginBottom: 30 }}>
          {searchResults.map(item => (
            <div key={item.id} className="search-result fade-in">
              <div className="search-result-info">
                <div className="search-result-code">{item.code}</div>
                <div className="search-result-name">{item.name}</div>
                <div className="search-result-price">{formatPrice(item.sellPrice)}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                + Adicionar
              </button>
            </div>
          ))}
        </div>
      )}

      {searchTerm && searchResults.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Nenhum produto encontrado</div>
          <p>Tente buscar por outro código ou nome</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <button
          className="btn btn-secondary"
          onClick={() => setIsCartOpen(true)}
          style={{ position: 'relative' }}
        >
          🛒 Ver Carrinho ({cart.length})
        </button>
      </div>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        customerName={customerName}
        setCustomerName={setCustomerName}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
      />
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const [currentPage, setCurrentPage] = useState('register');

  const renderPage = () => {
    switch (currentPage) {
      case 'register':
        return <RegisterPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'sales':
        return <SalesPage />;
      default:
        return <RegisterPage />;
    }
  };

  return (
    <AppProvider>
      <style>{generateStyles()}</style>
      <div className="app-container">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}

// Render the app
const root = createRoot(document.getElementById('root'));
root.render(<App />);

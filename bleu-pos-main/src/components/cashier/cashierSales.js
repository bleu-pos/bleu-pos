import React, { useState, useMemo } from 'react';
import './cashierSales.css';
import Navbar from '../navbar';
import DataTable from "react-data-table-component";
import {
  faMoneyBillWave,
  faShoppingCart,
  faChartLine,
  faReceipt,
  faArrowTrendUp,
  faArrowTrendDown,
  faTimes,
  faCalendarAlt,
  faExclamationTriangle,
  faCheckCircle,
  faCoins,
  faCashRegister
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function CashierSales({ employeeName = "Lim Alcovendas", shiftLabel = "Morning Shift", shiftTime = "6:00AM – 2:00PM", date }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [modalType, setModalType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Cash drawer state
  const [cashCounts, setCashCounts] = useState({
    bills1000: 0,
    bills500: 0,
    bills200: 0,
    bills100: 0,
    bills50: 0,
    bills20: 0,
    coins10: 0,
    coins5: 0,
    coins1: 0,
    cents25: 0,
    cents10: 0,
    cents05: 0
  });

  const today = new Date();
  const formattedDate = date || today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const salesMetrics = [
    {
      title: 'Total Sales',
      current: 10300.5,
      previous: 9200,
      format: 'currency',
      icon: faMoneyBillWave,
    },
    {
      title: 'Cash Sales',
      current: 6180.3,
      previous: 5520,
      format: 'currency',
      icon: faReceipt,
    },
    {
      title: 'GCash Sales',
      current: 4120.2,
      previous: 3680,
      format: 'currency',
      icon: faChartLine,
    },
    {
      title: 'Items Sold',
      current: 74,
      previous: 75,
      format: 'number',
      icon: faShoppingCart,
    },
  ];

  // Cash denominations configuration
  const denominations = [
    { key: 'bills1000', label: '₱1000 Bills', value: 1000 },
    { key: 'bills500', label: '₱500 Bills', value: 500 },
    { key: 'bills200', label: '₱200 Bills', value: 200 },
    { key: 'bills100', label: '₱100 Bills', value: 100 },
    { key: 'bills50', label: '₱50 Bills', value: 50 },
    { key: 'bills20', label: '₱20 Bills', value: 20 },
    { key: 'coins10', label: '₱10 Coins', value: 10 },
    { key: 'coins5', label: '₱5 Coins', value: 5 },
    { key: 'coins1', label: '₱1 Coins', value: 1 },
    { key: 'cents25', label: '25¢ Coins', value: 0.25 },
    { key: 'cents10', label: '10¢ Coins', value: 0.10 },
    { key: 'cents05', label: '5¢ Coins', value: 0.05 }
  ];

  // Cash flow values (this would typically come from POS system)
  const initialCash = 2000.00; // Starting cash in drawer
  const cashSales = 6180.30; // Cash sales from the day
  const expectedCash = initialCash + cashSales; // Total expected cash

  // Calculate actual cash
  const actualCash = denominations.reduce((total, denom) => {
    return total + (cashCounts[denom.key] * denom.value);
  }, 0);

  const cashDiscrepancy = actualCash - expectedCash;
  const hasDiscrepancy = Math.abs(cashDiscrepancy) > 0.01; // Allow for small rounding differences

  // Extended data for modals
  const allTopProducts = [
    { id: 1, name: 'TIRAMISU LATTE', sales: 10, revenue: 450 },
    { id: 2, name: 'SPANISH LATTE', sales: 8, revenue: 360 },
    { id: 3, name: 'JAVA CHIP FRAPPE', sales: 7, revenue: 385 },
    { id: 4, name: 'SALTED CARAMEL', sales: 6, revenue: 330 },
    { id: 5, name: 'CARAMEL MACCHIATO - ICED', sales: 6, revenue: 300 },
    { id: 6, name: 'AMERICANO - ICED', sales: 4, revenue: 160 },
    { id: 7, name: 'MATCHA FRAPPE', sales: 3, revenue: 165 },
    { id: 8, name: 'DARK MOCHA', sales: 3, revenue: 135 },
    { id: 9, name: 'VANILLA LATTE', sales: 2, revenue: 90 },
    { id: 10, name: 'CAPPUCCINO', sales: 2, revenue: 80 },
    { id: 11, name: 'FLAT WHITE', sales: 1, revenue: 50 },
    { id: 12, name: 'ESPRESSO', sales: 1, revenue: 35 }
  ];

  const allCancelledProducts = [
    { id: 1, product: 'Espresso', qty: 2, reason: 'Customer Changed Mind', time: '10:30 AM', value: 70 },
    { id: 2, product: 'Latte', qty: 1, reason: 'Wrong Order', time: '11:45 AM', value: 45 },
    { id: 3, product: 'Mocha', qty: 3, reason: 'Payment Issue', time: '1:15 PM', value: 135 },
    { id: 4, product: 'Americano', qty: 1, reason: 'Out of Stock', time: '2:30 PM', value: 40 },
    { id: 5, product: 'Frappe', qty: 2, reason: 'Customer Changed Mind', time: '3:45 PM', value: 110 },
    { id: 6, product: 'Macchiato', qty: 1, reason: 'Machine Issue', time: '4:20 PM', value: 50 },
    { id: 7, product: 'Cappuccino', qty: 2, reason: 'Wrong Size', time: '5:10 PM', value: 80 },
    { id: 8, product: 'Flat White', qty: 1, reason: 'Customer Request', time: '6:30 PM', value: 50 }
  ];

  // DataTable columns configuration
  const cancelledProductsColumns = [
    {
      name: "TIME",
      selector: (row) => row.time,
      sortable: true,
      width: "25%",
    },
    {
      name: "PRODUCT",
      selector: (row) => row.product,
      sortable: true,
      width: "25%",
    },
    {
      name: "QTY",
      selector: (row) => row.qty,
      center: true,
      sortable: true,
      width: "25%",
    },
    {
      name: "VALUE",
      selector: (row) => `₱${row.value}`,
      center: true,
      sortable: true,
      width: "25%",
    }
  ];

  const topProductsColumns = [
    {
      name: "RANK",
      selector: (row, index) => `#${index + 1}`,
      width: "15%",
      center: true,
    },
    {
      name: "PRODUCT NAME",
      selector: (row) => row.name,
      sortable: true,
      width: "60%",
    },
    {
      name: "QUANTITY SOLD",
      selector: (row) => row.sales,
      center: true,
      sortable: true,
      width: "25%",
    }
  ];

  const modalCancelledColumns = [
    {
      name: "TIME",
      selector: (row) => row.time,
      sortable: true,
      width: "25%",
    },
    {
      name: "PRODUCT",
      selector: (row) => row.product,
      sortable: true,
      width: "35%",
    },
    {
      name: "QTY",
      selector: (row) => row.qty,
      center: true,
      sortable: true,
      width: "20%",
    },
    {
      name: "VALUE",
      selector: (row) => `₱${row.value}`,
      center: true,
      sortable: true,
      width: "20%",
    }
  ];

  // Custom styles for DataTable (matching your reference)
  const customTableStyles = {
    headCells: {
      style: {
        fontWeight: "600",
        fontSize: "14px",
        padding: "12px",
        textTransform: "uppercase",
        textAlign: "center",
        letterSpacing: "1px",
      },
    },
    rows: {
      style: {
        minHeight: "55px",
        padding: "5px",
        cursor: "pointer",
      },
    },
  };

  // Get limited data for summary view
  const limitedCancelledProducts = useMemo(() => {
    return allCancelledProducts.slice(0, 3);
  }, []);

  const formatMetricValue = (val, format) =>
    format === 'currency' ? `₱${val.toLocaleString()}` : val.toLocaleString();

  const handleCashCountChange = (denomination, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setCashCounts(prev => ({
      ...prev,
      [denomination]: numValue
    }));
  };

  const openModal = (type) => {
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  const getFilteredData = (data) => {
    // In a real application, you would filter based on the selected date
    // For now, we'll just return all data
    return data;
  };

  const handleReportDiscrepancy = () => {
    // This would typically send a report to management
    alert(`Discrepancy of ₱${Math.abs(cashDiscrepancy).toFixed(2)} has been reported.`);
  };

  const handleConfirmCount = () => {
    // This would typically save the count to the database
    alert('Cash count has been confirmed and saved.');
  };

  const renderModal = () => {
    if (!modalType) return null;

    const isTopProducts = modalType === 'topProducts';
    const modalTitle = isTopProducts ? 'Top Selling Products' : 'Cancelled Products';
    const data = isTopProducts ? getFilteredData(allTopProducts) : getFilteredData(allCancelledProducts);
    const columns = isTopProducts ? topProductsColumns : modalCancelledColumns;

    return (
      <div className="cashier-modal-overlay" onClick={closeModal}>
        <div className="cashier-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cashier-modal-header">
            <h2>{modalTitle}</h2>
            <button className="cashier-modal-close" onClick={closeModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="cashier-modal-content">
            <div className="cashier-modal-table-container">
              <DataTable 
                columns={columns}
                data={data}
                striped 
                highlightOnHover 
                responsive 
                pagination
                fixedHeader
                fixedHeaderScrollHeight="60vh"
                noDataComponent={<div style={{ padding: "24px" }}>No data available.</div>}
                customStyles={customTableStyles}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cashier-sales">
      <Navbar />
      <div className="cashier-sales-container">
        <div className="cashier-tabs-header-row">
          <div className="cashier-sales-tabs">
            <button 
              className={`cashier-sales-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`cashier-sales-tab ${activeTab === 'cash' ? 'active' : ''}`}
              onClick={() => setActiveTab('cash')}
            >
              Cash Tally
            </button>
          </div>

          {/* Only show header in summary tab */}
          {activeTab === 'summary' && (
            <div className="cashier-sales-header">
              <div className="cashier-date">
                <span>Date:</span>
                <input 
                  type="date"
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="cashier-date-input"
                />
              </div>
              <div className="cashier-employee">Employee: {employeeName}</div>
            </div>
          )}
        </div>

        {activeTab === 'summary' && (
          <div className="cashier-sales-summary">
            <div className="cashier-sales-main">
              <div className="cashier-sales-metrics">
                {salesMetrics.map((metric, index) => {
                  const { current, previous } = metric;
                  const diff = current - previous;
                  const percent = previous !== 0 ? (diff / previous) * 100 : 0;
                  const isImproved = current > previous;
                  const hasChange = current !== previous;

                  return (
                    <div key={index} className="cashier-sales-card">
                      <div className="cashier-sales-icon">
                        <FontAwesomeIcon icon={metric.icon} />
                      </div>
                      <div className="cashier-sales-info">
                        <div className="cashier-sales-title">{metric.title}</div>
                        <div className="cashier-sales-value">
                          {formatMetricValue(current, metric.format)}
                        </div>
                        {hasChange && (
                          <div className={`cashier-sales-percent ${isImproved ? 'green' : 'red'}`}>
                            <FontAwesomeIcon icon={isImproved ? faArrowTrendUp : faArrowTrendDown} />
                            &nbsp;{Math.abs(percent).toFixed(1)}% from yesterday
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cashier-cancelled-section">
                <div className="cashier-section-header">
                  <h3>Cancelled Products</h3>
                  <button 
                    className="cashier-view-all-btn"
                    onClick={() => openModal('cancelled')}
                  >
                    View All
                  </button>
                </div>
                <div className="cashier-cancelled-table-container">
                  <DataTable 
                    columns={cancelledProductsColumns}
                    data={limitedCancelledProducts}
                    striped 
                    highlightOnHover 
                    responsive 
                    noDataComponent={<div style={{ padding: "24px" }}>No cancelled products.</div>}
                    customStyles={customTableStyles}
                    pagination={false}
                  />
                </div>
              </div>
            </div>

            <div className="cashier-sales-side">
              <div className="cashier-section-header">
                <h3>Top Selling Products</h3>
                <button 
                  className="cashier-view-all-btn"
                  onClick={() => openModal('topProducts')}
                >
                  View All
                </button>
              </div>
              <div className="cashier-top-products">
                {allTopProducts
                  .slice(0, 7)
                  .map((product, idx) => (
                    <div key={idx} className="cashier-top-product-bar">
                      <span className="cashier-product-name">{product.name}</span>
                      <div className="cashier-product-bar">
                        <div style={{ width: `${product.sales * 10}%` }} />
                        <span>{product.sales}</span>
                      </div>
                    </div>
                  ))}   
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cash' && (
          <div className="cashier-cash-tally">
            <div className="cashier-cash-tally-container">
              <div className="cashier-cash-count-section">
                <div className="cashier-cash-header">
                  <div className="cashier-cash-title">
                    <FontAwesomeIcon icon={faCashRegister} />
                    <h2>Cash Drawer Count</h2>
                  </div>
                </div>
                
                <div className="cashier-cash-table">
                  <div className="cashier-cash-table-header">
                    <span>Denomination</span>
                    <span>Count</span>
                    <span>Total Value</span>
                  </div>
                  
                  {denominations.map((denom) => (
                    <div key={denom.key} className="cashier-cash-row">
                      <span className="cashier-denom-label">{denom.label}</span>
                      <div className="cashier-count-input-container">
                        <input
                          type="number"
                          min="0"
                          value={cashCounts[denom.key]}
                          onChange={(e) => handleCashCountChange(denom.key, e.target.value)}
                          className="cashier-count-input"
                        />
                      </div>
                      <span className="cashier-total-value">
                        ₱{(cashCounts[denom.key] * denom.value).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cashier-cash-summary-section">
                <div className="cashier-cash-summary-card">
                  <div className="cashier-summary-header">
                    <FontAwesomeIcon icon={faCoins} />
                    <h3>Cash Summary</h3>
                  </div>
                  
                  <div className="cashier-summary-row">
                    <span>Initial Cash</span>
                    <span className="cashier-initial-amount">₱{initialCash.toFixed(2)}</span>
                  </div>
                  
                  <div className="cashier-summary-row">
                    <span>Cash Sales</span>
                    <span className="cashier-sales-amount">₱{cashSales.toFixed(2)}</span>
                  </div>
                  
                  <div className="cashier-summary-row">
                    <span>Expected Cash (Initial + Sales)</span>
                    <span className="cashier-expected-amount">₱{expectedCash.toFixed(2)}</span>
                  </div>
                  
                  <div className="cashier-summary-row">
                    <span>Actual Cash (Counted)</span>
                    <span className="cashier-actual-amount">₱{actualCash.toFixed(2)}</span>
                  </div>
                  
                  <div className={`cashier-summary-row cashier-discrepancy ${hasDiscrepancy ? 'has-discrepancy' : 'no-discrepancy'}`}>
                    <span className="cashier-discrepancy-label">
                      <FontAwesomeIcon icon={hasDiscrepancy ? faExclamationTriangle : faCheckCircle} />
                      Discrepancy
                    </span>
                    <span className={`cashier-discrepancy-amount ${cashDiscrepancy > 0 ? 'positive' : cashDiscrepancy < 0 ? 'negative' : 'zero'}`}>
                      {cashDiscrepancy >= 0 ? '+' : ''}₱{cashDiscrepancy.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="cashier-action-buttons">
                    {hasDiscrepancy && (
                      <button className="cashier-report-btn" onClick={handleReportDiscrepancy}>
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                        Report Discrepancy
                      </button>
                    )}
                    <button className="cashier-confirm-btn" onClick={handleConfirmCount}>
                      <FontAwesomeIcon icon={faCheckCircle} />
                      Confirm Count
                    </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  );
}

export default CashierSales;
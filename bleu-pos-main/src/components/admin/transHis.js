import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/transHis.css";
import Sidebar from "../sidebar";
import Header from "../admin/header";
import DataTable from "react-data-table-component";

const getAuthToken = () => localStorage.getItem("authToken");

function TransactionHistory() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("store");
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  const sampleTransactions = [
    {
      id: "ST-067",
      date: "2025-06-23T11:36:00Z",
      orderType: "Dine in",
      items: [{ name: "Matcha Frappe", quantity: 1, price: 145, code: "₱145" }],
      total: 145,
      subtotal: 145,
      discount: 0,
      status: "Completed",
      paymentMethod: "Cash",
      type: "store",
      discountsAndPromotions: "None"
    },
    {
      id: "ON-034",
      date: "2025-06-23T14:45:00Z",
      orderType: "Delivery",
      items: [
        { name: "Iced Americano", quantity: 2, price: 120, code: "₱120" },
        { name: "Chocolate Croissant", quantity: 1, price: 85, code: "₱85" },
        { name: "Cappuccino", quantity: 1, price: 110, code: "₱110" },
        { name: "Blueberry Muffin", quantity: 2, price: 75, code: "₱75" }
      ],
      total: 325,
      subtotal: 325,
      discount: 0,
      status: "Completed",
      paymentMethod: "Card",
      type: "online",
      discountsAndPromotions: "None"
    },
    {
      id: "ST-068",
      date: "2025-06-23T16:20:00Z",
      orderType: "Take out",
      items: [
        { name: "Cappuccino", quantity: 1, price: 110, code: "₱110" },
        { name: "Blueberry Muffin", quantity: 2, price: 75, code: "₱75" }
      ],
      total: 260,
      subtotal: 285,
      discount: 25,
      status: "Processing",
      paymentMethod: "GCash",
      referenceNumber: "GC-2025062316200001",
      type: "store",
      discountsAndPromotions: "Student Discount - 10%"
    },
    {
      id: "ON-035",
      date: "2025-06-23T18:15:00Z",
      orderType: "For Pickup",
      items: [
        { name: "Vanilla Latte", quantity: 1, price: 135, code: "₱135" },
        { name: "Caesar Salad", quantity: 1, price: 185, code: "₱185" }
      ],
      total: 320,
      subtotal: 320,
      discount: 0,
      status: "Processing",
      paymentMethod: "Digital Wallet",
      type: "online",
      discountsAndPromotions: "None"
    },
    {
      id: "ST-069",
      date: "2025-06-24T09:30:00Z",
      orderType: "Dine in",
      items: [
        { name: "Club Sandwich", quantity: 1, price: 165, code: "₱165" },
        { 
          name: "Americano", quantity: 1, price: 205, code: "₱205", 
          details: "1 Espresso Shot(s) (+₱50) · 1 Sea Salt Cream (+₱30) · 1 Syrup/Sauce(s) (+₱20)" 
        }
      ],
      total: 296,
      subtotal: 370,
      discount: 74,
      status: "Completed",
      paymentMethod: "GCash",
      referenceNumber: "GC-2025062409300001",
      type: "store",
      discountsAndPromotions: "Senior Citizen"
    }
  ];

  const fetchTransactions = useCallback(async (token) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTransactions(sampleTransactions);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/');
      return;
    }
    setIsLoading(true);
    fetchTransactions(token)
      .catch(err => {
        console.error("Error during data fetching:", err);
        setError("Could not load transaction data.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigate, fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesTab = activeTab === "store" ? transaction.type === "store" : transaction.type === "online";
      const matchesSearch = (transaction.id || '').toString().includes(searchTerm);
      const matchesStatus = statusFilter === "" || transaction.status === statusFilter;

      // Date filtering - compare only the date part (YYYY-MM-DD)
      const transactionDate = new Date(transaction.date).toISOString().slice(0, 10);
      const matchesDate = filterDate === "" || transactionDate === filterDate;

      return matchesTab && matchesSearch && matchesStatus && matchesDate;
    });
  }, [activeTab, transactions, searchTerm, statusFilter, filterDate]);

  useEffect(() => {
    setStatusFilter("");
    setSearchTerm("");
    setFilterDate("");
  }, [activeTab]);

  const uniqueStatuses = useMemo(() => {
    const currentTabTransactions = transactions.filter(transaction => 
      activeTab === "store" ? transaction.type === "store" : transaction.type === "online"
    );
    return [...new Set(currentTabTransactions.map(item => item.status).filter(Boolean))];
  }, [activeTab, transactions]);

  useEffect(() => {
    setStatusFilter("");
    setSearchTerm("");
  }, [activeTab]);

  const handleRowClick = (row) => {
    setSelectedTransaction(row);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const columns = [
    {
      name: "TRANSACTION ID",
      selector: (row) => row.id,
      sortable: true,
      width: "17%",
    },
    {
      name: "DATE",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
      width: "17%",
    },
    {
      name: "ITEMS",
      selector: (row) => row.items?.length || 0,
      center: true,
      width: "17%",
    },
    {
      name: "TOTAL",
      selector: (row) => `₱${parseFloat(row.total).toFixed(2)}`,
      center: true,
      sortable: true,
      width: "17%",
    },
    {
      name: "STATUS",
      selector: (row) => row.status,
      cell: (row) => (
        <span className={`status-badge ${row.status.toLowerCase()}`}>
          {row.status}
        </span>
      ),
      center: true,
      sortable: true,
      width: "16%",
    },
    {
      name: "PAYMENT METHOD",
      selector: (row) => row.paymentMethod || "N/A",
      center: true,
      width: "16%",
    },
  ];

  return (
    <div className='transaction-history'>
      <Sidebar />
      <div className='transHis'>
        <Header pageTitle="Transaction History" />
        
        <div className="transHis-content">
          <div className="tabs">
            <button className={`tab ${activeTab === "store" ? "active-tab" : ""}`} onClick={() => setActiveTab("store")}>Store</button>
            <button className={`tab ${activeTab === "online" ? "active-tab" : ""}`} onClick={() => setActiveTab("online")}>Online</button>
          </div>
          
          <div className="tab-content">
            <div className="filter-bar">
              <input 
                type="text" 
                placeholder="Search by Transaction ID..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                title="Filter by Date"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Status: All</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {isLoading ? (
              <p>Loading Transactions...</p>
            ) : error ? (
              <div style={{ color: "red" }}>Error: {error}</div>
            ) : (
              <div className="transactions-table-container">
                <DataTable 
                  columns={columns} 
                  data={filteredTransactions} 
                  striped 
                  highlightOnHover 
                  responsive 
                  pagination
                  fixedHeader
                  fixedHeaderScrollHeight="60vh"
                  onRowClicked={handleRowClick}
                  pointerOnHover
                  noDataComponent={<div style={{ padding: "24px" }}>No transactions found for {activeTab} transactions.</div>}
                  conditionalRowStyles={[
                  {
                    when: row => selectedTransaction && row.id === selectedTransaction.id,
                    style: {
                      backgroundColor: "#e9f9ff",
                      boxShadow: "inset 0 0 0 1px #2a9fbf",
                    },
                  },
                ]}
                  customStyles={{
                    headCells: {
                      style: {
                        backgroundColor: "#4B929D",
                        color: "#fff",
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
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {isModalOpen && selectedTransaction && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Transaction Details</h2>
                <button className="modal-close-btn" onClick={closeModal}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="modal-section">
                  <div className="modal-row">
                    <div className="modal-col">
                      <label>Order Type:</label>
                      <span>{selectedTransaction.orderType}</span>
                    </div>
                    <div className="modal-col">
                      <label>Payment Method:</label>
                      <span>{selectedTransaction.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="modal-row">
                    <div className="modal-col">
                      <label>Status:</label>
                      <span>{selectedTransaction.status}</span>
                    </div>
                    <div className="modal-col">
                      <label>Date & Time:</label>
                      <span>{new Date(selectedTransaction.date).toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedTransaction.paymentMethod === "GCash" && selectedTransaction.referenceNumber && (
                    <div className="modal-row">
                      <div className="modal-col">
                        <label>Reference Number:</label>
                        <span>{selectedTransaction.referenceNumber}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-section">
                  <h3>Order Items</h3>
                  <div className="items-list">
                    {selectedTransaction.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                          <div className="item-qty">Qty: {item.quantity}</div>
                          {item.details && <div className="item-details">{item.details}</div>}
                        </div>
                        <div className="item-price">₱{(item.price * item.quantity).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTransaction.discountsAndPromotions !== "None" && (
                  <div className="modal-section">
                    <div className="applied-discount">
                      <label>Applied Discount</label>
                      <span className="discount-badge">{selectedTransaction.discountsAndPromotions}</span>
                    </div>
                  </div>
                )}

                <div className="modal-section">
                  <div className="bill-summary">
                    <div className="bill-row">
                      <span>Subtotal:</span>
                      <span>₱{selectedTransaction.subtotal}</span>
                    </div>
                    {selectedTransaction.discount > 0 && (
                      <div className="bill-row discount-row">
                        <span>Discount:</span>
                        <span>-₱{selectedTransaction.discount}</span>
                      </div>
                    )}
                    <div className="bill-row total-row">
                      <span>Total Amount:</span>
                      <span>₱{selectedTransaction.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;

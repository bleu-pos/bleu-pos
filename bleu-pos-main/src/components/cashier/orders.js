import React, { useState, useEffect, useCallback } from "react";
import "./orders.css";
import Navbar from "../navbar";
import DataTable from "react-data-table-component";
import OrderPanel from "./orderPanel";

// --- Base URL for the sales service ---
const SALES_API_BASE_URL = 'https://sales-service-bm35.onrender.com';

function Orders() {
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [username, setUsername] = useState('');
  const [storeOrders, setStoreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const storedUsername = localStorage.getItem('username'); 
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const getLocalDateString = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  
  const getTodayLocalDate = useCallback(() => getLocalDateString(new Date()), [getLocalDateString]);

  // --- Simplified fetch function for store orders only ---
  const fetchOrders = useCallback(async () => {
    if (storeOrders.length === 0) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("Authentication error: You must be logged in to view orders.");
      const headers = { 'Authorization': `Bearer ${token}` };

      // Note: Using the query parameter version as it is more likely to be correct.
      // If `?status=processing` fails, you can try `/status/processing` again.
      const response = await fetch(`${SALES_API_BASE_URL}/auth/purchase_orders?status=processing`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to load store orders. Status: ${response.status}`);
      }
      
      const data = await response.json();
      const orders = Array.isArray(data) ? data : [];

      const newStoreOrders = orders.map(order => ({
        id: order.id,
        customerName: 'In-Store',
        date: new Date(order.date),
        orderType: order.orderType,
        paymentMethod: order.paymentMethod || 'N/A',
        total: order.total,
        status: order.status ? order.status.toUpperCase() : 'UNKNOWN',
        items: order.orderItems ? order.orderItems.reduce((acc, item) => acc + item.quantity, 0) : 0,
        orderItems: order.orderItems ? order.orderItems.map(item => ({...item, size: item.size || 'Standard', extras: item.extras || []})) : [],
        source: 'store', // Keeping source for consistency with OrderPanel if needed
      })).filter(o => o.orderType === 'Dine in' || o.orderType === 'Take out');

      const processAndSort = (orders) => orders.map(o => ({
          ...o,
          localDateString: getLocalDateString(o.date),
          dateDisplay: o.date.toLocaleString("en-US", { month: "long", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
      })).sort((a, b) => b.date - a.date);
      
      setStoreOrders(processAndSort(newStoreOrders));

    } catch (e) {
      console.error("Failed to fetch store orders:", e);
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [getLocalDateString, storeOrders.length]);

  useEffect(() => {
    fetchOrders();
    // Refresh data every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);


  const storeColumns = [
    { name: "ORDER ID", selector: (row) => row.id, sortable: true, width: "25%" },
    { name: "DATE & TIME", selector: (row) => row.dateDisplay, sortable: true, width: "30%" },
    { name: "ITEMS", selector: (row) => `${row.items} Items`, sortable: true, width: "15%" },
    { name: "TOTAL", selector: (row) => `₱${row.total.toFixed(2)}`, sortable: true, width: "15%" },
    { name: "STATUS", selector: (row) => row.status, cell: (row) => (<span className={`orderpanel-status-badge orderpanel-${row.status.toLowerCase().replace(/\s+/g, '')}`}>{row.status}</span>), width: "15%" },
  ];

  // --- Simplified update function for store orders only ---
  const handleUpdateStatus = async (orderToUpdate, newStatus) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert("Authentication error. Please log in again.");
      return;
    }
    
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const url = `${SALES_API_BASE_URL}/auth/purchase_orders/${orderToUpdate.id}/status`;
    const body = JSON.stringify({ newStatus: newStatus.toLowerCase() });

    try {
        const response = await fetch(url, { method: 'PATCH', headers, body });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.detail || 'Failed to update order status.');
        }
        alert(responseData.message || "Order status updated successfully!");
    } catch (err) {
        console.error("Error updating status:", err);
        alert(`Error: ${err.message}`);
    }

    // Refresh all data and update UI state
    await fetchOrders();
    setSelectedOrder(prev => prev && prev.id === orderToUpdate.id ? { ...prev, status: newStatus.toUpperCase() } : null);
  };

  const filteredData = storeOrders.filter(order => {
    const text = searchText.toLowerCase();
    const matchesSearch = String(order.id).toLowerCase().includes(text) || (order.dateDisplay && order.dateDisplay.toLowerCase().includes(text)) || (order.customerName && order.customerName.toLowerCase().includes(text)) || order.status.toLowerCase().includes(text);
    const matchesDate = filterDate ? order.localDateString === filterDate : true;
    const matchesStatus = filterStatus ? order.status === filterStatus : true;
    return matchesSearch && matchesDate && matchesStatus;
  });

  const clearFilters = () => { setSearchText(""); setFilterDate(getTodayLocalDate()); setFilterStatus(""); };
  useEffect(() => { if (filteredData.length > 0) { if (!selectedOrder || !filteredData.find(o => o.id === selectedOrder.id)) { setSelectedOrder(filteredData[0]); } } else { setSelectedOrder(null); } }, [filteredData, selectedOrder]);
  useEffect(() => { if (storeOrders.length > 0) { const mostRecentDate = storeOrders[0].localDateString; setFilterDate(mostRecentDate); } else { setFilterDate(getTodayLocalDate()); } }, [storeOrders, getTodayLocalDate]);

  return (
    <div className="orders-main-container">
      <Navbar isOrderPanelOpen={true} username={username} />
      <div className="orders-content-container orders-panel-open">
        {/* Removed the tab container */}
        <div className="orders-filter-bar">
          <input type="text" placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="orders-filter-input" />
          <input type="date" value={filterDate || ''} onChange={(e) => setFilterDate(e.target.value)} className="orders-filter-input" max={getTodayLocalDate()} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="orders-filter-input">
            <option value="">All Status</option>
            {/* Simplified status options for store orders only */}
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="orders-clear-btn" onClick={clearFilters}>Clear Filters</button>
        </div>
        <div className="orders-table-container">
          {loading && storeOrders.length === 0 ? (<div className="orders-message-container">Loading orders...</div>) : error ? (<div className="orders-message-container orders-error">{error}</div>) : (
            <DataTable
              columns={storeColumns}
              data={filteredData}
              pagination highlightOnHover responsive fixedHeader fixedHeaderScrollHeight="60vh"
              conditionalRowStyles={[{ when: row => row.id === selectedOrder?.id, style: { backgroundColor: "#e9f9ff", boxShadow: "inset 0 0 0 1px #2a9fbf" } }]}
              onRowClicked={(row) => setSelectedOrder(row)}
              noDataComponent={<div className="orders-message-container">No store orders found for the selected filters.</div>}
              customStyles={{ headCells: { style: { backgroundColor: "#4B929D", color: "#fff", fontWeight: "600", fontSize: "14px", padding: "15px", textTransform: "uppercase", letterSpacing: "1px" } }, rows: { style: { minHeight: "60px", padding: "10px", fontSize: "14px", color: "#333" } }, cells: { style: { fontSize: "14px" } }, }}
            />
          )}
        </div>
        {selectedOrder && ( <OrderPanel order={selectedOrder} isOpen={true} onClose={() => setSelectedOrder(null)} isStore={true} onUpdateStatus={handleUpdateStatus} /> )}
      </div>
    </div>
  );
}

export default Orders;
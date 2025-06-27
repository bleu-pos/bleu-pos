import React, { useState, useEffect, useCallback } from "react";
import "./orders.css";
import Navbar from "../navbar";
import DataTable from "react-data-table-component";
import OrderPanel from "./orderPanel";

// --- For easy configuration, define the base URL for your sales service ---
const API_BASE_URL = 'http://127.0.0.1:9000'; // Replace with your Sales Service port if different

function Orders() {
  const [activeTab, setActiveTab] = useState("store");
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [username, setUsername] = useState('');
  const [storeOrders, setStoreOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
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

  const getTodayLocalDate = useCallback(() => {
    return getLocalDateString(new Date());
  }, [getLocalDateString]);

  // --- REFACTORED fetchOrders into a useCallback hook for reusability ---
  const fetchOrders = useCallback(async () => {
    // Don't show the main "Loading..." text on background refreshes
    if (storeOrders.length === 0 && onlineOrders.length === 0) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("Authentication error: You must be logged in to view orders.");

      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_BASE_URL}/auth/purchase_orders/status/processing`, { headers });

      if (response.status === 401 || response.status === 403) {
         throw new Error('Authorization failed. Your session may have expired. Please log in again.');
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const orders = Array.isArray(data) ? data : [];
      const transformedOrders = orders.map(order => ({
        ...order,
        status: order.status ? order.status.toUpperCase() : 'UNKNOWN',
        items: order.items || (order.orderItems ? order.orderItems.reduce((acc, item) => acc + item.quantity, 0) : 0),
        orderItems: order.orderItems ? order.orderItems.map(item => ({...item, size: item.size || 'Standard', extras: item.extras || []})) : [],
        localDateString: getLocalDateString(new Date(order.date)),
        dateDisplay: new Date(order.date).toLocaleString("en-US", { month: "long", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
      }));

      const sortedOrders = transformedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      const newStoreOrders = sortedOrders.filter(o => o.orderType === 'Dine in' || o.orderType === 'Take out');
      const newOnlineOrders = sortedOrders.filter(o => o.orderType !== 'Dine in' && o.orderType !== 'Take out');

      setStoreOrders(newStoreOrders);
      setOnlineOrders(newOnlineOrders);

    } catch (e) {
      console.error("Failed to fetch orders:", e);
      setError(e.message || "Failed to load orders. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [getLocalDateString, storeOrders.length, onlineOrders.length]);

  // Fetch orders on component mount and set up an interval
  useEffect(() => {
    fetchOrders(); // Initial fetch
    const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [fetchOrders]);


  const getMostRecentOrderDate = useCallback((orders) => {
    if (!orders || orders.length === 0) return null;
    const orderDates = orders.map(order => order.localDateString).filter(Boolean);
    if (orderDates.length === 0) return null;
    return orderDates.sort((a, b) => new Date(b) - new Date(a))[0];
  }, []);

  const ordersData = activeTab === "store" ? storeOrders : onlineOrders;
  const filteredData = ordersData.filter(order => {
    const text = searchText.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(text) ||
      (order.dateDisplay && order.dateDisplay.toLowerCase().includes(text)) ||
      order.status.toLowerCase().includes(text);

    const matchesDate = filterDate ? order.localDateString === filterDate : true;
    const matchesStatus = filterStatus ? order.status === filterStatus : true;

    return matchesSearch && matchesDate && matchesStatus;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- NEW: The function that makes the API call to update status ---
  const handleUpdateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert("Authentication error. Please log in again.");
      return;
    }

    // The API expects 'completed' or 'cancelled' (all lowercase)
    const statusPayload = newStatus.toLowerCase();
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/purchase_orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newStatus: statusPayload }),
      });
      
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.detail || 'Failed to update order status.');
      }

      // Success!
      alert(responseData.message); // Show success message from API
      
      // Refresh the list of orders to reflect the change
      await fetchOrders(); 
      
      // Close the order panel for a better user experience
      setSelectedOrder(null);

    } catch (err) {
      console.error("Error updating status:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleCompleteOrder = (orderId) => {
    // This now correctly calls the real API update function
    handleUpdateStatus(orderId, "COMPLETED");
  };

  const columns = [
    { name: "ORDER ID", selector: (row) => row.id, sortable: true, width: "20%" },
    { name: "DATE & TIME", selector: (row) => row.dateDisplay, sortable: true, width: "25%" },
    { name: "ITEMS", selector: (row) => `${row.items} Items`, sortable: true, width: "20%" },
    { name: "TOTAL", selector: (row) => `₱${row.total.toFixed(2)}`, sortable: true, width: "20%" },
    { name: "STATUS", selector: (row) => row.status,
      cell: (row) => (<span className={`orderpanel-status-badge ${row.status === "COMPLETED" ? "orderpanel-completed" : row.status === "REQUEST TO ORDER" ? "orderpanel-request" : row.status === "PROCESSING" ? "orderpanel-processing" : row.status === "FOR PICK UP" ? "orderpanel-forpickup" : "orderpanel-cancelled"}`}>{row.status}</span>),
      width: "15%",
    },
  ];

  const clearFilters = () => {
    setSearchText("");
    setFilterDate(getTodayLocalDate());
    setFilterStatus("");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearFilters();
    setSelectedOrder(null);
  };
  
  useEffect(() => {
    if (filteredData.length > 0) {
      if (!selectedOrder || !filteredData.find(o => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredData[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [filteredData, selectedOrder]);
  
  useEffect(() => {
    const currentOrders = activeTab === "store" ? storeOrders : onlineOrders;
    if (currentOrders.length > 0) {
      const todayDate = getTodayLocalDate();
      const hasOrdersToday = currentOrders.some(order => order.localDateString === todayDate);
      if (hasOrdersToday) {
        setFilterDate(todayDate);
      } else {
        const mostRecentDate = getMostRecentOrderDate(currentOrders);
        setFilterDate(mostRecentDate || todayDate);
      }
    } else {
      setFilterDate(getTodayLocalDate());
    }
  }, [activeTab, storeOrders, onlineOrders, getTodayLocalDate, getMostRecentOrderDate]);

  return (
    <div className="orders-main-container">
      <Navbar isOrderPanelOpen={true} username={username} />
      <div className="orders-content-container orders-panel-open">
        <div className="orders-tab-container">
          <button className={`orders-tab ${activeTab === "store" ? "active" : ""}`} onClick={() => handleTabChange("store")}>Store</button>
          <button className={`orders-tab ${activeTab === "online" ? "active" : ""}`} onClick={() => handleTabChange("online")}>Online</button>
        </div>

        <div className="orders-filter-bar">
          <input type="text" placeholder="Search Order ID" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="orders-filter-input" />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="orders-filter-input" max={getTodayLocalDate()} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="orders-filter-input">
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="CANCELLED">Cancelled</option>
            {activeTab === "online" && (<><option value="REQUEST TO ORDER">Request to Order</option><option value="FOR PICK UP">For Pick Up</option></>)}
          </select>
          <button className="orders-clear-btn" onClick={clearFilters}>Clear Filters</button>
        </div>

        <div className="orders-table-container">
          {loading && ordersData.length === 0 ? (
            <div className="orders-message-container">Loading orders...</div>
          ) : error ? (
            <div className="orders-message-container orders-error">{error}</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              responsive
              fixedHeader
              fixedHeaderScrollHeight="60vh"
              conditionalRowStyles={[{ when: row => row.id === selectedOrder?.id, style: { backgroundColor: "#e9f9ff", boxShadow: "inset 0 0 0 1px #2a9fbf" } }]}
              onRowClicked={(row) => setSelectedOrder(row)}
              noDataComponent={
                <div className="orders-message-container">
                  {activeTab === 'store' 
                    ? 'No store orders found for the selected filters.' 
                    : 'No online orders found for the selected filters.'
                  }
                </div>
              }
              customStyles={{
                headCells: { style: { backgroundColor: "#4B929D", color: "#fff", fontWeight: "600", fontSize: "14px", padding: "15px", textTransform: "uppercase", textAlign: "center", letterSpacing: "1px" } },
                header: { style: { minHeight: "60px", paddingTop: "5px", paddingBottom: "5px" } },
                rows: { style: { minHeight: "60px", padding: "10px", fontSize: "14px", color: "#333" } },
                cells: { style: { fontSize: "14px" } },
              }}
            />
          )}
        </div>
        
        {selectedOrder && (
          <OrderPanel
            order={selectedOrder}
            isOpen={true}
            onClose={() => setSelectedOrder(null)} // Simplified onClose for better UX
            isStore={activeTab === 'store'}
            onCompleteOrder={handleCompleteOrder}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}

export default Orders;
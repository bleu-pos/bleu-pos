import React, { useState, useEffect, useCallback } from "react";
import "./orders.css";
import Navbar from "../navbar";
import DataTable from "react-data-table-component";
import OrderPanel from "./orderPanel";

function Orders() {
  const [activeTab, setActiveTab] = useState("store");
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State for username, retrieved from local storage
  const [username, setUsername] = useState('');

  // State will now be populated by the API call
  const [storeOrders, setStoreOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);

  // State for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get username from local storage on component mount
  useEffect(() => {
    // Ensure the key 'username' matches what your login process saves.
    const storedUsername = localStorage.getItem('username'); 
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper function to get today's date in local timezone
  const getTodayLocalDate = useCallback(() => {
    return getLocalDateString(new Date());
  }, [getLocalDateString]);

  // Fetch orders from the API on component mount and at regular intervals
  useEffect(() => {
    const fetchOrders = async () => {
      // Don't show the main "Loading..." text on background refreshes
      if (storeOrders.length === 0 && onlineOrders.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      try {
        // 1. Get the authentication token from local storage.
        //    Ensure the key 'authToken' matches what your login process saves.
        const token = localStorage.getItem('authToken');

        // 2. If no token is found, stop the process and show an error.
        if (!token) {
          throw new Error("Authentication error: You must be logged in to view orders.");
        }

        // 3. Create the headers for the fetch request.
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // 4. Make the fetch call with the new headers.
        const response = await fetch('http://127.0.0.1:9000/auth/purchase_orders/status/processing', { headers });

        // Handle specific auth errors like an expired token
        if (response.status === 401 || response.status === 403) {
           throw new Error('Authorization failed. Your session may have expired. Please log in again.');
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const orders = Array.isArray(data) ? data : [];

        // Transform API data to match the component's expected structure
        const transformedOrders = orders.map(order => ({
          ...order,
          status: order.status ? order.status.toUpperCase() : 'UNKNOWN',
          items: order.items || (order.orderItems ? order.orderItems.reduce((acc, item) => acc + item.quantity, 0) : 0),
          orderItems: order.orderItems ? order.orderItems.map(item => ({...item, size: item.size || 'Standard', extras: item.extras || []})) : [],
          localDateString: getLocalDateString(new Date(order.date)),
          dateDisplay: new Date(order.date).toLocaleString("en-US", {
            month: "long", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
          }),
        }));

        // Sort orders by date (most recent first) before segregating
        const sortedOrders = transformedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Segregate orders into "Store" and "Online" based on orderType
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
    };

    fetchOrders(); // Initial fetch
    
    // Set up an interval to automatically refresh orders
    const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [getLocalDateString, storeOrders.length, onlineOrders.length]);


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
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort filtered data by date (most recent first)

  useEffect(() => {
    if (ordersData.length > 0 && filteredData.length === 0 && !searchText && !filterStatus) {
      const mostRecentDate = getMostRecentOrderDate(ordersData);
      if (mostRecentDate && mostRecentDate !== filterDate) {
        setFilterDate(mostRecentDate);
      }
    }
  }, [ordersData, filteredData, searchText, filterStatus, filterDate, getMostRecentOrderDate]);

  const clearFilters = () => {
    setSearchText("");
    setFilterDate(getTodayLocalDate());
    setFilterStatus("");
  };
  
  const handleUpdateStatus = (orderId, newStatus) => {
    const updateOrderList = (orders) => orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );

    if (activeTab === "store") {
      setStoreOrders(updateOrderList(storeOrders));
    } else {
      setOnlineOrders(updateOrderList(onlineOrders));
    }

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    }
  };

  const handleCompleteOrder = (orderId) => {
    handleUpdateStatus(orderId, "COMPLETED");
  };

  const columns = [
    { name: "ORDER ID", selector: (row) => row.id, sortable: true, width: "20%" },
    { name: "DATE & TIME", selector: (row) => row.dateDisplay, sortable: true, width: "25%" },
    { name: "ITEMS", selector: (row) => `${row.items} Items`, sortable: true, width: "20%" },
    { name: "TOTAL", selector: (row) => `₱${row.total.toFixed(2)}`, sortable: true, width: "20%" },
    {
      name: "STATUS", selector: (row) => row.status,
      cell: (row) => (<span className={`orderpanel-status-badge ${row.status === "COMPLETED" ? "orderpanel-completed" : row.status === "REQUEST TO ORDER" ? "orderpanel-request" : row.status === "PROCESSING" ? "orderpanel-processing" : row.status === "FOR PICK UP" ? "orderpanel-forpickup" : "orderpanel-cancelled"}`}>{row.status}</span>),
      width: "15%",
    },
  ];

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
      {/* The username state is passed here. The Navbar component can now use it. */}
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
              headCells: {
                  style: {
                  backgroundColor: "#4B929D",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "14px",     // Increased font size
                  padding: "15px",
                  textTransform: "uppercase",
                  textAlign: "center",
                  letterSpacing: "1px",
                  },
              },
              header: {
                  style: {
                  minHeight: "60px",
                  paddingTop: "5px",
                  paddingBottom: "5px",
                  },
              },
              rows: {
                  style: {
                  minHeight: "60px",
                  padding: "10px",
                  fontSize: "14px",     // Increased row text size
                  color: "#333",
                  },
              },
              cells: {
                  style: {
                  fontSize: "14px",     // Also apply size to individual cells
                  },
              },
              }}
            />
          )}
        </div>
        
        {selectedOrder && (
          <OrderPanel
            order={selectedOrder}
            isOpen={true}
            onClose={() => setSelectedOrder(filteredData[0] || null)}
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
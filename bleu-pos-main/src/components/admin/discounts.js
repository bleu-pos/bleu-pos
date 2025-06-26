import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/discounts.css";
import Sidebar from "../sidebar";
import Header from "../admin/header";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import DataTable from "react-data-table-component";
import DiscountModal from "../admin/discountModal";
import PromotionModal from "../admin/promotionModal";

// Sample data
const sampleDiscounts = [
  {
    id: 1,
    name: "Summer Sale",
    application: "All Products",
    discount: "20.0%",
    minSpend: 500,
    validFrom: "2024-06-01",
    validTo: "2024-08-31",
    status: "active",
    type: "percentage"
  },
  {
    id: 2,
    name: "Electronics Discount",
    application: "Electronics Category",
    discount: "₱100.00",
    minSpend: 1000,
    validFrom: "2024-07-01",
    validTo: "2024-07-31",
    status: "active",
    type: "fixed"
  },
  {
    id: 3,
    name: "New Customer Discount",
    application: "All Products",
    discount: "15.0%",
    minSpend: 200,
    validFrom: "2024-01-01",
    validTo: "2024-12-31",
    status: "inactive",
    type: "percentage"
  }
];

const samplePromotions = [
  {
    id: 1,
    name: "Buy 2 Get 1 Free",
    description: "Buy any 2 items and get the 3rd one free",
    products: ["Smartphone", "Laptop"],
    type: "bogo",
    value: "Buy 2 Get 1",
    minQuantity: 2,
    maxUses: 5,
    validFrom: "2024-06-01",
    validTo: "2024-12-31",
    status: "active",
    buyQuantity: 2,
    getQuantity: 1
  },
  {
    id: 2,
    name: "Flash Sale",
    description: "Limited time 30% off on selected items",
    products: ["Headphones", "Tablet"],
    type: "percentage",
    value: "30.0%",
    minQuantity: 1,
    maxUses: 10,
    validFrom: "2024-07-15",
    validTo: "2024-07-20",
    status: "active",
    buyQuantity: 1,
    getQuantity: 1
  }
];

const sampleProducts = [
  { ProductID: 1, ProductName: "Smartphone" },
  { ProductID: 2, ProductName: "Laptop" },
  { ProductID: 3, ProductName: "Headphones" },
  { ProductID: 4, ProductName: "Tablet" },
  { ProductID: 5, ProductName: "Camera" },
  { ProductID: 6, ProductName: "Speaker" }
];

const sampleCategories = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Clothing" },
  { id: 3, name: "Books" },
  { id: 4, name: "Home & Garden" },
  { id: 5, name: "Sports" }
];

function Discounts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationFilter, setApplicationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const today = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState("discounts");

  // Discounts state
  const [discounts, setDiscounts] = useState(sampleDiscounts);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);
  const [errorDiscounts, setErrorDiscounts] = useState(null);

  // Promotions state
  const [promotions, setPromotions] = useState(samplePromotions);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [errorPromotions, setErrorPromotions] = useState(null);

  // Common data
  const [availableProducts, setAvailableProducts] = useState(sampleProducts);
  const [categories, setCategories] = useState(sampleCategories);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState(null);

  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState(null);
  const [editingPromotionId, setEditingPromotionId] = useState(null);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);

  // Form states
  const [discountForm, setDiscountForm] = useState({
    discountName: '',
    applicationType: 'all',
    selectedCategories: [],
    selectedProducts: [],
    discountType: 'percentage',
    discountValue: '',
    minSpend: '',
    validFrom: '',
    validTo: '',
    status: 'active'
  });

  const [promotionForm, setPromotionForm] = useState({
    promotionName: '',
    description: '',
    selectedProducts: [],
    promotionType: 'percentage',
    promotionValue: '',
    buyQuantity: 1,
    getQuantity: 1,
    minQuantity: '',
    maxUsesPerCustomer: '',
    validFrom: '',
    validTo: '',
    status: 'active'
  });

  const navigate = useNavigate();

  // Mock fetch functions - no longer needed but kept for structure
  const fetchDiscounts = useCallback(async () => {
    setIsLoadingDiscounts(true);
    // Simulate API delay
    setTimeout(() => {
      setIsLoadingDiscounts(false);
    }, 500);
  }, []);

  const fetchPromotions = useCallback(async () => {
    setIsLoadingPromotions(true);
    // Simulate API delay
    setTimeout(() => {
      setIsLoadingPromotions(false);
    }, 500);
  }, []);

  const fetchAvailableProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    // Simulate API delay
    setTimeout(() => {
      setIsLoadingProducts(false);
    }, 500);
  }, []);

  const fetchCategories = useCallback(async () => {
    // Categories are already set in state
  }, []);

  // Load promotions when switching to promotions tab
  useEffect(() => {
    if (activeTab === "promotions" && promotions.length === 0) {
      fetchPromotions();
    }
  }, [activeTab, fetchPromotions, promotions.length]);

  useEffect(() => {
    fetchDiscounts();
    fetchAvailableProducts();
    fetchCategories();
  }, [fetchDiscounts, fetchAvailableProducts, fetchCategories]);

  // Modal handlers
  const handleDiscountModalOpen = (discount = null) => {
    if (discount) {
      setEditingDiscountId(discount.id);
      setDiscountForm({
        discountName: discount.name,
        applicationType: discount.application === 'All Products' ? 'all' : 'products',
        selectedCategories: [],
        selectedProducts: discount.application !== 'All Products' ? [discount.application] : [],
        discountType: discount.type ? discount.type.toLowerCase() : 'percentage',
        discountValue: parseFloat(discount.discount) || '',
        minSpend: discount.minSpend || '',
        validFrom: discount.validFrom,
        validTo: discount.validTo,
        status: discount.status ? discount.status.toLowerCase() : 'active',
      });
    } else {
      setEditingDiscountId(null);
      setDiscountForm({
        discountName: '',
        applicationType: 'all',
        selectedCategories: [],
        selectedProducts: [],
        discountType: 'percentage',
        discountValue: '',
        minSpend: '',
        validFrom: today,
        validTo: '',
        status: 'active'
      });
    }
    setShowDiscountModal(true);
  };

  const handlePromotionModalOpen = (promotion = null) => {
    if (promotion) {
      setEditingPromotionId(promotion.id);
      setPromotionForm({
        promotionName: promotion.name,
        description: promotion.description,
        selectedProducts: promotion.products || [],
        promotionType: promotion.type,
        promotionValue: parseFloat(promotion.value) || '',
        buyQuantity: promotion.buyQuantity || 1,
        getQuantity: promotion.getQuantity || 1,
        minQuantity: promotion.minQuantity || '',
        maxUsesPerCustomer: promotion.maxUses || '',
        validFrom: promotion.validFrom,
        validTo: promotion.validTo,
        status: promotion.status ? promotion.status.toLowerCase() : 'active',
      });
    } else {
      setEditingPromotionId(null);
      setPromotionForm({
        promotionName: '',
        description: '',
        selectedProducts: [],
        promotionType: 'percentage',
        promotionValue: '',
        buyQuantity: 1,
        getQuantity: 1,
        minQuantity: '',
        maxUsesPerCustomer: '',
        validFrom: today,
        validTo: '',
        status: 'active'
      });
    }
    setShowPromotionModal(true);
  };

  // Form change handlers
  const handleDiscountFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDiscountForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePromotionFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPromotionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save handlers
  const handleSaveDiscount = async () => {
    // Validation
    if (!discountForm.discountName.trim()) {
      alert("Please enter a discount name.");
      return;
    }
    if (!discountForm.discountValue || parseFloat(discountForm.discountValue) <= 0) {
      alert("Please enter a valid discount value.");
      return;
    }
    if (discountForm.applicationType === 'categories' && discountForm.selectedCategories.length === 0) {
      alert("Please select at least one category.");
      return;
    }
    if (discountForm.applicationType === 'products' && discountForm.selectedProducts.length === 0) {
      alert("Please select at least one product.");
      return;
    }
    if (!discountForm.validFrom || !discountForm.validTo) {
      alert("Please select valid from and to dates.");
      return;
    }
    if (new Date(discountForm.validFrom) >= new Date(discountForm.validTo)) {
      alert("'Valid From' must be before 'Valid To'");
      return;
    }

    setIsSavingDiscount(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newDiscount = {
        id: editingDiscountId || discounts.length + 1,
        name: discountForm.discountName,
        application: discountForm.applicationType === 'all' ? 'All Products' : 
                    discountForm.applicationType === 'categories' ? 'Selected Categories' : 'Selected Products',
        discount: discountForm.discountType === 'percentage' 
          ? `${parseFloat(discountForm.discountValue).toFixed(1)}%`
          : `₱${parseFloat(discountForm.discountValue).toFixed(2)}`,
        minSpend: parseFloat(discountForm.minSpend) || 0,
        validFrom: discountForm.validFrom,
        validTo: discountForm.validTo,
        status: discountForm.status,
        type: discountForm.discountType
      };

      if (editingDiscountId) {
        setDiscounts(prev => prev.map(d => d.id === editingDiscountId ? newDiscount : d));
      } else {
        setDiscounts(prev => [...prev, newDiscount]);
      }

      alert(`Discount '${discountForm.discountName}' saved successfully.`);
      setShowDiscountModal(false);
      setIsSavingDiscount(false);
    }, 1000);
  };

  const handleSavePromotion = async () => {
    // Validation
    if (!promotionForm.promotionName.trim()) {
      alert("Please enter a promotion name.");
      return;
    }
    if (promotionForm.selectedProducts.length === 0) {
      alert("Please select at least one product.");
      return;
    }
    if (promotionForm.promotionType !== 'bogo' && (!promotionForm.promotionValue || parseFloat(promotionForm.promotionValue) <= 0)) {
      alert("Please enter a valid promotion value.");
      return;
    }
    if (!promotionForm.validFrom || !promotionForm.validTo) {
      alert("Please select valid from and to dates.");
      return;
    }
    if (new Date(promotionForm.validFrom) >= new Date(promotionForm.validTo)) {
      alert("'Valid From' must be before 'Valid To'");
      return;
    }

    setIsSavingPromotion(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newPromotion = {
        id: editingPromotionId || promotions.length + 1,
        name: promotionForm.promotionName,
        description: promotionForm.description,
        products: promotionForm.selectedProducts.map(id => 
          availableProducts.find(p => p.ProductID === id)?.ProductName || `Product ${id}`
        ),
        type: promotionForm.promotionType,
        value: promotionForm.promotionType === 'percentage' 
          ? `${parseFloat(promotionForm.promotionValue).toFixed(1)}%`
          : promotionForm.promotionType === 'fixed'
          ? `₱${parseFloat(promotionForm.promotionValue).toFixed(2)}`
          : `Buy ${promotionForm.buyQuantity} Get ${promotionForm.getQuantity}`,
        minQuantity: promotionForm.minQuantity,
        maxUses: promotionForm.maxUsesPerCustomer,
        validFrom: promotionForm.validFrom,
        validTo: promotionForm.validTo,
        status: promotionForm.status,
        buyQuantity: promotionForm.buyQuantity,
        getQuantity: promotionForm.getQuantity
      };

      if (editingPromotionId) {
        setPromotions(prev => prev.map(p => p.id === editingPromotionId ? newPromotion : p));
      } else {
        setPromotions(prev => [...prev, newPromotion]);
      }

      alert(`Promotion '${promotionForm.promotionName}' saved successfully.`);
      setShowPromotionModal(false);
      setIsSavingPromotion(false);
    }, 1000);
  };

  // Filter functions
  const filteredDiscounts = discounts.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (applicationFilter === "" || d.applicationType === applicationFilter) &&
    (statusFilter === "" || d.status.toLowerCase() === statusFilter.toLowerCase())
  );

  const filteredPromotions = promotions.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (applicationFilter === "" || p.type === applicationFilter) &&
    (statusFilter === "" || p.status.toLowerCase() === statusFilter.toLowerCase())
  );

  // Action handlers
  const handleEditDiscount = (discount) => {
    handleDiscountModalOpen(discount);
  };

  const handleEditPromotion = (promotion) => {
    handlePromotionModalOpen(promotion);
  };

  const handleDeleteDiscount = async (discountId) => {
    if (!window.confirm("Are you sure you want to delete this discount?")) {
      return;
    }

    setDiscounts(prev => prev.filter(d => d.id !== discountId));
    alert("Discount deleted successfully.");
  };

  const handleDeletePromotion = async (promotionId) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) {
      return;
    }

    setPromotions(prev => prev.filter(p => p.id !== promotionId));
    alert("Promotion deleted successfully.");
  };

  // Column definitions
  const discountColumns = [
    { 
      name: "NAME", 
      selector: row => row.name, 
      sortable: true,
      minWidth: "150px"
    },
    { 
      name: "DISCOUNT", 
      selector: row => row.discount, 
      sortable: true,
      minWidth: "100px"
    },
    { 
      name: "MIN SPEND", 
      selector: row => `₱${row.minSpend}`, 
      sortable: true,
      minWidth: "120px"
    },
    { 
      name: "APPLICATION", 
      selector: row => row.application,
      minWidth: "150px"
    },
    { 
      name: "VALIDITY", 
      selector: row => `${row.validFrom} - ${row.validTo}`,
      minWidth: "200px"
    },
    { 
      name: "STATUS", 
      selector: row => row.status, 
      sortable: true,
      cell: row => (
        <span className={`status-badge ${row.status.toLowerCase()}`}>
          {row.status.toUpperCase()}
        </span>
      ),
      minWidth: "100px"
    },
    {
      name: "ACTIONS",
      cell: row => (
        <div className="action-buttons">
          <button 
            className="edit-btn" 
            onClick={() => handleEditDiscount(row)}
            title="Edit"
          >
            <FaEdit />
          </button>
          <button 
            className="delete-btn" 
            onClick={() => handleDeleteDiscount(row.id)}
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      minWidth: "120px"
    }
  ];

  const promotionColumns = [
    { 
      name: "NAME", 
      selector: row => row.name, 
      sortable: true,
      minWidth: "150px"
    },
    { 
      name: "DESCRIPTION", 
      selector: row => row.description,
      minWidth: "200px",
      cell: row => (
        <div className="description-cell" title={row.description}>
          {row.description && row.description.length > 50 
            ? `${row.description.substring(0, 50)}...` 
            : row.description || 'No description'}
        </div>
      )
    },
    { 
      name: "TYPE", 
      selector: row => row.type,
      sortable: true,
      minWidth: "100px",
      cell: row => (
        <span className={`type-badge ${row.type}`}>
          {row.type.toUpperCase()}
        </span>
      )
    },
    { 
      name: "VALUE", 
      selector: row => row.value,
      sortable: true,
      minWidth: "100px"
    },
    { 
      name: "PRODUCTS", 
      selector: row => row.products.length,
      sortable: true,
      minWidth: "100px",
      cell: row => `${row.products.length} product${row.products.length !== 1 ? 's' : ''}`
    },
    { 
      name: "VALIDITY", 
      selector: row => `${row.validFrom} - ${row.validTo}`,
      minWidth: "200px"
    },
    { 
      name: "STATUS", 
      selector: row => row.status, 
      sortable: true,
      cell: row => (
        <span className={`status-badge ${row.status.toLowerCase()}`}>
          {row.status.toUpperCase()}
        </span>
      ),
      minWidth: "100px"
    },
    {
      name: "ACTIONS",
      cell: row => (
        <div className="action-buttons">
          <button 
            className="edit-btn" 
            onClick={() => handleEditPromotion(row)}
            title="Edit"
          >
            <FaEdit />
          </button>
          <button 
            className="delete-btn" 
            onClick={() => handleDeletePromotion(row.id)}
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      minWidth: "120px"
    }
  ];

  return (
    <div className="mng-discounts">
      <Sidebar />
      <div className="discounts">
        <Header pageTitle="Manage Discounts & Promotions" />

        <div className="discounts-admin-content">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === "discounts" ? "active-tab" : ""}`} 
              onClick={() => setActiveTab("discounts")}
            >
              Discounts
            </button>
            <button 
              className={`tab ${activeTab === "promotions" ? "active-tab" : ""}`} 
              onClick={() => setActiveTab("promotions")}
            >
              Promotions
            </button>
          </div>

          {activeTab === "discounts" && (
            <>
              <div className="filter-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Discount Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={applicationFilter}
                  onChange={(e) => setApplicationFilter(e.target.value)}
                >
                  <option value="">All Application Types</option>
                  <option value="all">All Products</option>
                  <option value="categories">Specific Categories</option>
                  <option value="products">Individual Products</option>
                </select>
                <select 
                  className="filter-select"
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
                <button 
                  className="add-btn" 
                  onClick={() => handleDiscountModalOpen()}
                >
                  <FaPlus /> Add Discount
                </button>
              </div>

              {isLoadingDiscounts ? (
                <div className="loading">Loading discounts...</div>
              ) : errorDiscounts ? (
                <div className="error">Error: {errorDiscounts}</div>
              ) : (
                <DataTable
                  columns={discountColumns}
                  data={filteredDiscounts}
                  pagination
                  striped
                  highlightOnHover
                  noDataComponent="No discounts found"
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[10, 20, 30]}
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
                          },
                        },
                      }}
                />
              )}
            </>
          )}

          {activeTab === "promotions" && (
            <>
              <div className="filter-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Promotion Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={applicationFilter}
                  onChange={(e) => setApplicationFilter(e.target.value)}
                >
                  <option value="">All Promotion Types</option>
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount Discount</option>
                  <option value="bogo">Buy One Get One (BOGO)</option>
                </select>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
                <button 
                  className="add-btn" 
                  onClick={() => handlePromotionModalOpen()}
                >
                  <FaPlus /> Add Promotion
                </button>
              </div>

              {isLoadingPromotions ? (
                <div className="loading">Loading promotions...</div>
              ) : errorPromotions ? (
                <div className="error">Error: {errorPromotions}</div>
              ) : (
                <DataTable
                  columns={promotionColumns}
                  data={filteredPromotions}
                  pagination
                  striped
                  highlightOnHover
                  noDataComponent="No promotions found"
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[10]}
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
                          },
                        },
                      }}
                />
              )}
            </>
          )}

          {/* Discount Modal */}
          <DiscountModal
            showModal={showDiscountModal}
            onClose={() => setShowDiscountModal(false)}
            editingId={editingDiscountId}
            form={discountForm}
            onChange={handleDiscountFormChange}
            onSave={handleSaveDiscount}
            isSaving={isSavingDiscount}
            availableProducts={availableProducts}
            categories={categories}
            today={today}
          />

          {/* Promotion Modal */}
          <PromotionModal
            showModal={showPromotionModal}
            onClose={() => setShowPromotionModal(false)}
            editingId={editingPromotionId}
            form={promotionForm}
            onChange={handlePromotionFormChange}
            onSave={handleSavePromotion}
            isSaving={isSavingPromotion}
            availableProducts={availableProducts}
            today={today}
          />
        </div>
      </div>
    </div>
  );
}

export default Discounts;
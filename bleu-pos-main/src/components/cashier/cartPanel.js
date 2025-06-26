import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMoneyBills, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FiMinus, FiPlus } from "react-icons/fi";
import './cartPanel.css';
import { 
  AddonsModal, 
  DiscountsModal, 
  TransactionSummaryModal, 
  GCashReferenceModal,
  OrderConfirmationModal 
} from './cartModals';

// --- FIX: Swapped the API URLs to point to the correct servers ---
const SALES_API_URL = 'http://127.0.0.1:9000';
const DISCOUNTS_API_URL = 'http://127.0.0.1:9002';

const CartPanel = ({
  cartItems,
  setCartItems,
  isCartOpen,
  orderType,
  setOrderType,
  paymentMethod,
  setPaymentMethod,
  addonPrices
}) => {
  // Define drink categories
  const drinkCategories = [
    'Barista Choice', 'Specialty Coffee', 'Premium Coffee', 'Non-Coffee',
    'Frappe', 'Sparkling Series', 'Milktea'
  ];

  const isDrinkItem = (item) => drinkCategories.includes(item.category);

  // Component states
  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [addons, setAddons] = useState({ espressoShots: 0, seaSaltCream: 0, syrupSauces: 0 });
  const [showDiscountsModal, setShowDiscountsModal] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [stagedDiscounts, setStagedDiscounts] = useState([]);
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);
  const [showGCashReference, setShowGCashReference] = useState(false);
  const [gcashReference, setGCashReference] = useState('');
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch active discounts from the backend when the cart is opened
  useEffect(() => {
    const fetchDiscounts = async () => {
      if (!isCartOpen || availableDiscounts.length > 0) {
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError("Authentication error. Please log in to view discounts.");
        setIsLoading(false);
        return;
      }

      try {
        // This now correctly points to http://127.0.0.1:9002/discounts
        const response = await fetch(`${DISCOUNTS_API_URL}/discounts?active_only=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch discounts. Please log in again.');
        }

        const data = await response.json();

        const mappedDiscounts = data.map(d => ({
          id: d.DiscountName,
          name: d.DiscountName,
          type: d.DiscountType.toLowerCase(),
          value: d.DiscountType === 'Percentage' ? d.PercentageValue : d.FixedValue,
          description: d.Description,
          minAmount: d.MinimumSpend || 0,
        }));

        setAvailableDiscounts(mappedDiscounts);

      } catch (err) {
        setError(err.message);
        console.error("Error fetching discounts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDiscounts();

  }, [isCartOpen, availableDiscounts.length]);

  const openAddonsModal = (itemIndex) => {
    setSelectedItemIndex(itemIndex);
    setAddons(cartItems[itemIndex].addons || { espressoShots: 0, seaSaltCream: 0, syrupSauces: 0 });
    setShowAddonsModal(true);
  };

  const closeAddonsModal = () => {
    setShowAddonsModal(false);
    setSelectedItemIndex(null);
    setAddons({ espressoShots: 0, seaSaltCream: 0, syrupSauces: 0 });
  };

  const openDiscountsModal = () => {
    setStagedDiscounts([...appliedDiscounts]);
    setShowDiscountsModal(true);
  };

  const closeDiscountsModal = () => {
    setShowDiscountsModal(false);
    setStagedDiscounts([]);
  };

  const applyDiscounts = () => {
    setAppliedDiscounts([...stagedDiscounts]);
    setShowDiscountsModal(false);
    setStagedDiscounts([]);
  };

  const toggleStagedDiscount = (discountId) => {
    setStagedDiscounts(prev => {
      if (prev.includes(discountId)) {
        return prev.filter(id => id !== discountId);
      } else {
        return [...prev, discountId];
      }
    });
  };

  const updateAddons = (addonType, value) => {
    setAddons(prev => ({ ...prev, [addonType]: Math.max(0, value) }));
  };

  const saveAddons = () => {
    if (selectedItemIndex !== null) {
      const currentItem = cartItems[selectedItemIndex];
      const isSameAddons = (a, b) => (a.espressoShots === b.espressoShots && a.seaSaltCream === b.seaSaltCream && a.syrupSauces === b.syrupSauces);
      const existingIndex = cartItems.findIndex((item, index) => (index !== selectedItemIndex && item.name === currentItem.name && isSameAddons(item.addons || { espressoShots: 0, seaSaltCream: 0, syrupSauces: 0 }, addons)));

      if (existingIndex !== -1) {
        const updatedCart = [...cartItems];
        updatedCart[existingIndex].quantity += currentItem.quantity;
        updatedCart.splice(selectedItemIndex, 1);
        setCartItems(updatedCart);
      } else {
        const updatedCart = [...cartItems];
        updatedCart[selectedItemIndex].addons = { ...addons };
        setCartItems(updatedCart);
      }
    }
    closeAddonsModal();
  };

  useEffect(() => {
    if (!isCartOpen) {
      setCartItems([]);
      setAppliedDiscounts([]);
      setStagedDiscounts([]);
      setAvailableDiscounts([]);
      setPaymentMethod('Cash');
      setOrderType('Dine in');
      setGCashReference('');
    }
  }, [isCartOpen, setCartItems, setPaymentMethod, setOrderType]);

  const getAddonPrice = (addon, quantity) => (addonPrices?.[addon] || 0) * quantity;
  const getTotalAddonsPrice = (itemAddons) => {
    if (!itemAddons) return 0;
    return Object.entries(itemAddons).reduce((total, [addon, quantity]) => total + getAddonPrice(addon, quantity), 0);
  };
  const getSubtotal = () => cartItems.reduce((acc, item) => (acc + (item.price * item.quantity) + (getTotalAddonsPrice(item.addons) * item.quantity)), 0);
  const getDiscount = () => {
    const subtotal = getSubtotal();
    let totalDiscount = appliedDiscounts.reduce((acc, discountId) => {
        const discount = availableDiscounts.find(d => d.id === discountId);
        if (discount && (!discount.minAmount || subtotal >= discount.minAmount)) {
            if (discount.type === 'percentage') return acc + (subtotal * parseFloat(discount.value)) / 100;
            if (discount.type === 'fixed') return acc + parseFloat(discount.value);
        }
        return acc;
    }, 0);
    return Math.min(totalDiscount, subtotal);
  };
  const getStagedDiscount = () => {
    const subtotal = getSubtotal();
    let totalDiscount = stagedDiscounts.reduce((acc, discountId) => {
        const discount = availableDiscounts.find(d => d.id === discountId);
        if (discount && (!discount.minAmount || subtotal >= discount.minAmount)) {
            if (discount.type === 'percentage') return acc + (subtotal * parseFloat(discount.value)) / 100;
            if (discount.type === 'fixed') return acc + parseFloat(discount.value);
        }
        return acc;
    }, 0);
    return Math.min(totalDiscount, subtotal);
  };
  const getTotal = () => Math.max(0, getSubtotal() - getDiscount());
  const updateQuantity = (index, amount) => {
    setCartItems(prev => {
        const updated = [...prev];
        updated[index].quantity += amount;
        return updated[index].quantity <= 0 ? updated.filter((_, i) => i !== index) : updated;
    });
  };
  const removeFromCart = (index) => setCartItems(prev => prev.filter((_, i) => i !== index));
  const handleProcessTransaction = () => {
    if (cartItems.length === 0) {
      alert('Please add items to your cart before processing the transaction.');
      return;
    }
    setShowTransactionSummary(true);
  };

  const handleConfirmTransaction = () => {
    if (paymentMethod === 'GCash') {
      setShowTransactionSummary(false);
      setShowGCashReference(true);
    } else {
      confirmTransaction();
    }
  };

  const handleGCashSubmit = (reference) => {
    setGCashReference(reference);
    setShowGCashReference(false);
    confirmTransaction(reference);
  };

  const confirmTransaction = async (gcashRef = null) => {
    setIsProcessing(true);
    setError(null);
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Authentication error. Please log in again.");
        setIsProcessing(false);
        return;
    }

    const appliedDiscountNames = appliedDiscounts.map(discountId => {
        const discount = availableDiscounts.find(d => d.id === discountId);
        return discount ? discount.name : null;
    }).filter(name => name !== null);

    const saleData = {
        cartItems: cartItems.map(item => ({...item, addons: item.addons || {}})),
        orderType: orderType,
        paymentMethod: paymentMethod,
        appliedDiscounts: appliedDiscountNames,
        gcashReference: gcashRef || gcashReference || null
    };

    try {
        const response = await fetch(`${SALES_API_URL}/auth/sales/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(saleData)
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.detail || 'Failed to process transaction.');
        }

        setCartItems([]);
        setAppliedDiscounts([]);
        setGCashReference('');
        setShowTransactionSummary(false);
        setShowGCashReference(false);
        setShowConfirmation(true);

    } catch (err) {
        setError(err.message);
        alert(`Error: ${err.message}`);
        console.error("Transaction failed:", err);
    } finally {
        setIsProcessing(false);
    }
  };

  const getAppliedDiscountNames = () => appliedDiscounts.map(discountId => {
    const discount = availableDiscounts.find(d => d.id === discountId);
    return discount ? discount.name : '';
  }).filter(name => name !== '');

  return (
    <>
        <div className={`cart-panel ${isCartOpen ? 'open' : ''}`}>
            <div className="order-section">
                <h2>Order Details</h2>
                <div className="order-type-toggle">
                    <button className={orderType === 'Dine in' ? 'active' : ''} onClick={() => setOrderType('Dine in')}>Dine in</button>
                    <button className={orderType === 'Take out' ? 'active' : ''} onClick={() => setOrderType('Take out')}>Take out</button>
                </div>
                <div className="cart-items">
                    {cartItems.length > 0 ? (cartItems.map((item, index) => (
                        <div key={index} className="cart-item">
                            <img src={item.image} alt={item.name} />
                            <div className="item-details">
                                <div className="item-name">{item.name}</div>
                                {isDrinkItem(item) && (
                                    <div className="addons-link" onClick={() => openAddonsModal(index)}>Add ons</div>
                                )}
                                {item.addons && getTotalAddonsPrice(item.addons) > 0 && (
                                    <div className="addons-summary">
                                        {item.addons.espressoShots > 0 && <span>+{item.addons.espressoShots} Espresso</span>}
                                        {item.addons.seaSaltCream > 0 && <span>+{item.addons.seaSaltCream} Sea Salt Cream</span>}
                                        {item.addons.syrupSauces > 0 && <span>+{item.addons.syrupSauces} Syrups</span>}
                                    </div>
                                )}
                                <div className="flex-spacer" />
                                <div className="qty-price">
                                    <button onClick={() => updateQuantity(index, -1)}><FiMinus /></button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(index, 1)}><FiPlus /></button>
                                    <span className="item-price">₱{((item.price + getTotalAddonsPrice(item.addons)) * item.quantity).toFixed(0)}</span>
                                </div>
                            </div>
                            <button className="remove-item" onClick={() => removeFromCart(index)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    ))) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#999', fontSize: '14px' }}>
                            No products added.
                        </div>
                    )}
                </div>
                <div className="discount-section">
                    <div className="discount-input-wrapper" onClick={openDiscountsModal}>
                        <input 
                            type="text" 
                            placeholder="Discounts and Promotions" 
                            value={appliedDiscounts.length > 0 ? `${getAppliedDiscountNames().join(', ')}` : ''} 
                            readOnly 
                        />
                    </div>
                    <div className="summary">
                        <div className="line"><span>Subtotal:</span><span>₱{getSubtotal().toFixed(0)}</span></div>
                        <div className="line"><span>Discount:</span><span>₱{getDiscount().toFixed(0)}</span></div>
                        <hr />
                        <div className="line total"><span>Total:</span><span>₱{getTotal().toFixed(0)}</span></div>
                    </div>
                </div>
                <div className="payment-section">
                    <h3>Payment Method</h3>
                    <div className="payment-options">
                        <button className={`cash ${paymentMethod === 'Cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('Cash')}>
                            <FontAwesomeIcon icon={faMoneyBills} />
                            <span>Cash</span>
                        </button>
                        <button className={`gcash ${paymentMethod === 'GCash' ? 'active' : ''}`} onClick={() => setPaymentMethod('GCash')}>
                            <FontAwesomeIcon icon={faQrcode} />
                            <span>GCash</span>
                        </button>
                    </div>
                </div>
                <button className="process-button" onClick={handleProcessTransaction}>Process Transaction</button>
            </div>
        </div>

        {/* Modal Components */}
        <AddonsModal
          showAddonsModal={showAddonsModal}
          closeAddonsModal={closeAddonsModal}
          addons={addons}
          updateAddons={updateAddons}
          saveAddons={saveAddons}
          addonPrices={addonPrices}
        />

        <DiscountsModal
          showDiscountsModal={showDiscountsModal}
          closeDiscountsModal={closeDiscountsModal}
          isLoading={isLoading}
          error={error}
          availableDiscounts={availableDiscounts}
          stagedDiscounts={stagedDiscounts}
          toggleStagedDiscount={toggleStagedDiscount}
          applyDiscounts={applyDiscounts}
          getStagedDiscount={getStagedDiscount}
          getSubtotal={getSubtotal}
        />

        <TransactionSummaryModal
          showTransactionSummary={showTransactionSummary}
          setShowTransactionSummary={setShowTransactionSummary}
          cartItems={cartItems}
          orderType={orderType}
          paymentMethod={paymentMethod}
          getSubtotal={getSubtotal}
          getDiscount={getDiscount}
          getTotal={getTotal}
          getTotalAddonsPrice={getTotalAddonsPrice}
          appliedDiscounts={appliedDiscounts}
          availableDiscounts={availableDiscounts}
          confirmTransaction={handleConfirmTransaction}
          isProcessing={isProcessing}
        />

        <GCashReferenceModal
          showGCashReference={showGCashReference}
          setShowGCashReference={setShowGCashReference}
          onSubmit={handleGCashSubmit}
          isProcessing={isProcessing}
        />

        <OrderConfirmationModal
          showConfirmation={showConfirmation}
          setShowConfirmation={setShowConfirmation}
        />
    </>
  );
};

export default CartPanel;
import React, { useState } from "react";
import "./orderPanel.css";
import dayjs from 'dayjs';

function OrderPanel({ order, onClose, isOpen, isStore, onCompleteOrder, onUpdateStatus }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const MANAGER_PIN = "1234";

  if (!order) return null;

  // Calculate subtotal
  const subtotal = order.orderItems.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  // Calculate discount amount
  const discount = subtotal - order.total;

  const availableDiscounts = [
    { id: 'senior', name: 'Senior Citizen', type: 'percentage', value: 20, description: '20% off total' },
    { id: 'pwd', name: 'PWD', type: 'percentage', value: 20, description: '20% off total' },
    { id: 'student', name: 'Student', type: 'percentage', value: 10, description: '10% off total' },
    { id: 'employee', name: 'Employee', type: 'percentage', value: 15, description: '15% off total' },
    { id: 'loyalty', name: 'Loyalty Card', type: 'fixed', value: 25, description: '₱25 off' },
    { id: 'promo100', name: 'Buy ₱100 Get ₱10 Off', type: 'fixed', value: 10, description: '₱10 off for orders ≥₱100', minAmount: 100 },
    { id: 'firsttime', name: 'First Time Customer', type: 'percentage', value: 5, description: '5% off total' }
  ];

  const handleCancelOrder = () => {
    setShowPinModal(true);
  };

  const confirmCancelOrder = () => {
    if (enteredPin === MANAGER_PIN) {
      setShowPinModal(false);
      setEnteredPin("");
      setPinError("");
      onUpdateStatus(order.id, "CANCELLED");
    } else {
      setPinError("Invalid credentials");
    }
  };

  const handlePrintReceipt = () => {
    setShowReceiptModal(true);
  };

  const confirmPrintReceipt = () => {
    setShowReceiptModal(false);
    window.print();
  };

  const handleCompleteOrder = () => {
    if (onCompleteOrder) {
      onCompleteOrder(order.id);
    }
  };

  const getDiscountDisplay = () => {
    if (order.appliedDiscount) {
      if (typeof order.appliedDiscount === "string") {
        const discount = availableDiscounts.find(d => d.id === order.appliedDiscount);
        if (discount) return `${discount.name} - ${discount.description}`;
      }
      if (typeof order.appliedDiscount === "object" && order.appliedDiscount.id) {
        const discount = availableDiscounts.find(d => d.id === order.appliedDiscount.id);
        if (discount) return `${discount.name} - ${discount.description}`;
      }
    }
    return 'None';
  };

  return (
    <div className={`orderpanel-container ${isOpen ? 'orderpanel-open' : ''}`}>
      <div className="orderpanel-header">
        <h2 className="orderpanel-title">Order Details</h2>
      </div>

      <div className="orderpanel-content">
        <div className="orderpanel-info">
          <p className="orderpanel-info-item"><span className="orderpanel-label">Order ID:</span> #{order.id}</p>
          <p className="orderpanel-info-item"><span className="orderpanel-label">Order Type:</span> {order.orderType || (isStore ? "Store" : "Online")}</p>
          <p className="orderpanel-info-item"><span className="orderpanel-label">Date:</span> {dayjs(order.date).format("MMMM D, YYYY - h:mm A")}</p>
          <p className="orderpanel-info-item"><span className="orderpanel-label">Payment Method:</span> {order.paymentMethod}</p>
          <p className="orderpanel-info-item">
            <span className="orderpanel-label">Status:</span> 
            <span className={`orderpanel-status-badge ${
              order.status === "COMPLETED" ? "orderpanel-completed" :
              order.status === "REQUEST TO ORDER" ? "orderpanel-request" :
              order.status === "PROCESSING" ? "orderpanel-processing" :
              order.status === "FOR PICK UP" ? "orderpanel-forpickup" :
              "orderpanel-cancelled"
            }`}>{order.status}</span>
          </p>
        </div>

        <div className="orderpanel-items-header">
          <span className="orderpanel-column-item">Item</span>
          <span className="orderpanel-column-qty">Qty</span>
          <span className="orderpanel-column-subtotal">Subtotal</span>
        </div>

        <div className="orderpanel-items-section">
          {order.orderItems.map((item, idx) => (
            <div key={idx} className="orderpanel-item">
              <div className="orderpanel-item-details">
                <div className="orderpanel-item-name">{item.name}</div>
                <div className="orderpanel-item-price">₱{item.basePrice ?? item.price}</div>
                {item.extras?.length > 0 && (
                  <div className="orderpanel-extras">
                    {item.extras.map((extra, i) => (
                      <div key={i} className="orderpanel-extra">{extra}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="orderpanel-item-qty">{item.quantity}</div>
              <div className="orderpanel-item-subtotal">₱{(item.price * item.quantity).toFixed(0)}</div>
            </div>
          ))}
        </div>

        <div className="orderpanel-summary">
          <div className="orderpanel-promotions">
            <span className="orderpanel-promotions-label">Discounts and Promotions used:</span>
            <span className="orderpanel-promotions-value">{getDiscountDisplay()}</span>
          </div>

          <div className="orderpanel-calculation">
            <div className="orderpanel-calc-row">
              <span className="orderpanel-calc-label">Subtotal:</span>
              <span className="orderpanel-calc-value">₱{subtotal.toFixed(0)}</span>
            </div>
            <div className="orderpanel-calc-row">
              <span className="orderpanel-calc-label">Discount:</span>
              <span className="orderpanel-calc-value">₱{discount.toFixed(0)}</span>
            </div>
            <div className="orderpanel-calc-row orderpanel-total-row">
              <span className="orderpanel-calc-label">Total:</span>
              <span className="orderpanel-calc-value">₱{order.total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Hide actions if cancelled */}
        {order.status !== "CANCELLED" && (
          <div className="orderpanel-actions">
            {isStore && order.status === "PROCESSING" && (
              <button className="orderpanel-btn orderpanel-btn-complete" onClick={handleCompleteOrder}>
                Mark as Completed
              </button>
            )}

            {!isStore && (
              <>
                {order.status === "REQUEST TO ORDER" && (
                  <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order.id, "PROCESSING")}>
                    Accept Order
                  </button>
                )}
                {order.status === "PROCESSING" && (
                  <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order.id, "FOR PICK UP")}>
                    Mark as For Pick Up
                  </button>
                )}
                {order.status === "FOR PICK UP" && (
                  <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order.id, "COMPLETED")}>
                    Mark as Completed
                  </button>
                )}
                {/* Cancel button for online orders - only show if not completed */}
                {order.status !== "COMPLETED" && (
                  <button className="orderpanel-btn orderpanel-btn-refund" onClick={handleCancelOrder}>
                    Cancel Order
                  </button>
                )}
              </>
            )}

            {isStore && (
              <>
                {/* Always show print receipt for store orders */}
                <button className="orderpanel-btn orderpanel-btn-print" onClick={handlePrintReceipt}>
                  Print Receipt
                </button>
                {/* Only show cancel button if order is not completed */}
                {order.status !== "COMPLETED" && (
                  <button className="orderpanel-btn orderpanel-btn-refund" onClick={handleCancelOrder}>
                    Cancel Order
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {showPinModal && (
          <div className="orderpanel-modal-overlay" onClick={() => setShowPinModal(false)}>
            <div className="orderpanel-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="orderpanel-modal-title">Manager PIN Required</h3>
              <p className="orderpanel-modal-description">
                Please ask a manager to enter their PIN to cancel this order.
              </p>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="orderpanel-modal-input"
                placeholder="Enter Manager PIN"
                value={enteredPin}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setEnteredPin(value);
                    setPinError("");
                  }
                }}
              />
              {pinError && <p className="orderpanel-modal-error">{pinError}</p>}
              <div className="orderpanel-modal-buttons">
                <button
                  className="orderpanel-modal-btn orderpanel-modal-cancel"
                  onClick={() => {
                    setShowPinModal(false);
                    setEnteredPin("");
                    setPinError("");
                  }}
                >
                  Cancel
                </button>
                <button className="orderpanel-modal-btn orderpanel-modal-confirm" onClick={confirmCancelOrder}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {showReceiptModal && (
          <div className="orderpanel-modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="orderpanel-modal-content orderpanel-receipt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="orderpanel-receipt-print" id="orderpanel-print-section">
              <div className="orderpanel-receipt-header">
                <div className="orderpanel-store-name">Bleu Bean Cafe</div>
                <div className="orderpanel-receipt-date">Date: {dayjs(order.date).format("MMMM D, YYYY - h:mm A")}</div>
                <div className="orderpanel-receipt-id">Order #: {order.id}</div>
              </div>

              <div className="orderpanel-receipt-body">
                {order.orderItems.map((item, i) => (
                  <div key={i} className="orderpanel-receipt-item">
                    <div className="orderpanel-receipt-line">
                      <span className="orderpanel-receipt-item-name">{item.name} x{item.quantity}</span>
                      <span className="orderpanel-receipt-item-price">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.extras?.length > 0 && item.extras.map((extra, j) => (
                      <div key={j} className="orderpanel-receipt-line">
                        <span className="orderpanel-receipt-extra">+ {extra}</span>
                        <span className="orderpanel-receipt-extra-price"></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="orderpanel-receipt-summary">
                <div className="orderpanel-receipt-line">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="orderpanel-receipt-line">
                  <span>Discount:</span>
                  <span>₱{discount.toFixed(2)}</span>
                </div>
                <div className="orderpanel-receipt-line orderpanel-receipt-total">
                  <strong>Total:</strong>
                  <strong>₱{order.total.toFixed(2)}</strong>
                </div>
              </div>

              <div className="orderpanel-receipt-footer">
                <div className="orderpanel-thankyou">*** THANK YOU ***</div>
                <div className="orderpanel-served-by">Served by: Cashier</div>
              </div>
            </div>

              <div className="orderpanel-modal-buttons">
                <button
                  className="orderpanel-modal-btn orderpanel-modal-cancel"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="orderpanel-modal-btn orderpanel-modal-confirm"
                  onClick={confirmPrintReceipt}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderPanel;
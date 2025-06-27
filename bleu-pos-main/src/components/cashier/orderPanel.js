import React, { useState } from "react";
import "./orderPanel.css";
import dayjs from 'dayjs';

/**
 * OrderPanel Component
 * Displays the detailed view of a selected order (both store and online).
 * It provides actions like changing order status, cancelling, and printing receipts.
 * This component is controlled by its parent (`orders.js`).
 */
function OrderPanel({ order, onClose, isOpen, isStore, onUpdateStatus }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // This should be stored in a more secure way in a real application (e.g., environment variable)
  const MANAGER_PIN = "1234"; 

  // Don't render anything if there's no order selected
  if (!order) return null;

  // --- Calculations ---
  const subtotal = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal - order.total;

  // --- Event Handlers ---
  const handleCancelOrder = () => {
    setShowPinModal(true);
  };

  const confirmCancelOrder = () => {
    if (enteredPin === MANAGER_PIN) {
      setShowPinModal(false);
      setEnteredPin("");
      setPinError("");
      // Pass the full order object for consistency, parent handles API call
      onUpdateStatus(order, "CANCELLED");
    } else {
      setPinError("Invalid credentials");
    }
  };

  const handlePrintReceipt = () => setShowReceiptModal(true);
  const confirmPrintReceipt = () => { 
    setShowReceiptModal(false); 
    // This uses the browser's print functionality, targeting the receipt modal's content
    const printContents = document.getElementById("orderpanel-print-section").innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore event listeners if needed
  };

  const getDiscountDisplay = () => {
    // This is a placeholder. A real implementation would look up discount details.
    if (discount > 0) {
        return `Discount Applied`;
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
                <span className={`orderpanel-status-badge orderpanel-${order.status.toLowerCase().replace(/ /g, '')}`}>{order.status}</span>
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
                {/* For online orders, item.price might be 0, so don't show it */}
                {isStore && <div className="orderpanel-item-price">₱{item.price.toFixed(2)}</div>}
              </div>
              <div className="orderpanel-item-qty">{item.quantity}</div>
              <div className="orderpanel-item-subtotal">₱{(item.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="orderpanel-summary">
            <div className="orderpanel-promotions">
                <span className="orderpanel-promotions-label">Discounts and Promotions used:</span>
                <span className="orderpanel-promotions-value">{getDiscountDisplay()}</span>
            </div>
            <div className="orderpanel-calculation">
                <div className="orderpanel-calc-row"><span className="orderpanel-calc-label">Subtotal:</span><span className="orderpanel-calc-value">₱{subtotal.toFixed(2)}</span></div>
                <div className="orderpanel-calc-row"><span className="orderpanel-calc-label">Discount:</span><span className="orderpanel-calc-value">- ₱{discount.toFixed(2)}</span></div>
                <div className="orderpanel-calc-row orderpanel-total-row"><span className="orderpanel-calc-label">Total:</span><span className="orderpanel-calc-value">₱{order.total.toFixed(2)}</span></div>
            </div>
        </div>

        {/* --- DYNAMIC ACTION BUTTONS --- */}
        {/* Hide all actions if the order is in a final state */}
        {order.status !== "CANCELLED" && order.status !== "COMPLETED" && order.status !== "DELIVERED" && (
          <div className="orderpanel-actions">
            {/* Store-specific actions */}
            {isStore && order.status === "PROCESSING" && (
              <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order, "COMPLETED")}>
                Mark as Completed
              </button>
            )}

            {/* Online-specific actions */}
            {!isStore && (
              <>
                {order.status === "PENDING" && (
                  <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order, "PREPARING")}>
                    Accept Order
                  </button>
                )}
                {order.status === "PREPARING" && (
                  <button className="orderpanel-btn orderpanel-btn-complete" onClick={() => onUpdateStatus(order, "DELIVERED")}>
                    Mark as Delivered
                  </button>
                )}
                <button className="orderpanel-btn orderpanel-btn-refund" onClick={handleCancelOrder}>
                  Cancel Order
                </button>
              </>
            )}

            {/* Shared actions for store orders */}
            {isStore && (
              <>
                <button className="orderpanel-btn orderpanel-btn-print" onClick={handlePrintReceipt}>Print Receipt</button>
                <button className="orderpanel-btn orderpanel-btn-refund" onClick={handleCancelOrder}>Cancel Order</button>
              </>
            )}
          </div>
        )}

        {/* Actions for completed store orders */}
        {(order.status === "COMPLETED" || order.status === "DELIVERED") && isStore && (
             <div className="orderpanel-actions">
                <button className="orderpanel-btn orderpanel-btn-print" onClick={handlePrintReceipt}>Print Receipt</button>
            </div>
        )}

        {/* --- MODALS --- */}
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
                  // Ensure only numbers are entered
                  if (/^\d*$/.test(value)) {
                    setEnteredPin(value);
                    setPinError(""); // Clear error on new input
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
              {/* This inner div is what gets targeted for printing */}
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
                    <span>- ₱{discount.toFixed(2)}</span>
                  </div>
                  <div className="orderpanel-receipt-line orderpanel-receipt-total">
                    <strong>Total:</strong>
                    <strong>₱{order.total.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="orderpanel-receipt-footer">
                  <div className="orderpanel-thankyou">*** THANK YOU ***</div>
                  <div className="orderpanel-served-by">Cashier</div>
                </div>
              </div>

              {/* These buttons are part of the UI, not the printed receipt */}
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
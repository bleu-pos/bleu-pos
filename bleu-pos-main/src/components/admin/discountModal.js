import React from "react";

const DiscountModal = ({
  showModal,
  onClose,
  editingId, 
  form,
  onChange,
  onSave,
  isSaving,
  availableProducts,
  categories,
  today
}) => {
  if (!showModal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{editingId ? "Edit Discount" : "Add Discount"}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Discount Name</label>
            <input
              name="discountName"
              value={form.discountName}
              onChange={onChange}
              required
              placeholder="Enter discount name"
            />
          </div>

          <div className="form-group">
            <label>Application Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="applicationType"
                  value="all"
                  checked={form.applicationType === "all"}
                  onChange={onChange}
                />
                Apply to All Products
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="applicationType"
                  value="categories"
                  checked={form.applicationType === "categories"}
                  onChange={onChange}
                />
                Apply to Specific Categories
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="applicationType"
                  value="products"
                  checked={form.applicationType === "products"}
                  onChange={onChange}
                />
                Apply to Individual Products
              </label>
            </div>
          </div>

          {form.applicationType === "categories" && (
            <div className="form-group">
              <label>Select Categories</label>
              <div className="checkbox-group">
                {categories.map(category => (
                  <label key={category.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        const updatedCategories = e.target.checked
                          ? [...form.selectedCategories, category.id]
                          : form.selectedCategories.filter(id => id !== category.id);
                        onChange({
                          target: {
                            name: 'selectedCategories',
                            value: updatedCategories
                          }
                        });
                      }}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.applicationType === "products" && (
            <div className="form-group">
              <label>Select Products</label>
              <div className="checkbox-group">
                {availableProducts.map(product => (
                  <label key={product.ProductID} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.selectedProducts.includes(product.ProductID)}
                      onChange={(e) => {
                        const updatedProducts = e.target.checked
                          ? [...form.selectedProducts, product.ProductID]
                          : form.selectedProducts.filter(id => id !== product.ProductID);
                        onChange({
                          target: {
                            name: 'selectedProducts',
                            value: updatedProducts
                          }
                        });
                      }}
                    />
                    {product.ProductName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Discount Type</label>
            <select
              name="discountType"
              value={form.discountType}
              onChange={onChange}
              required
            >
              <option value="percentage">Percentage Discount</option>
              <option value="fixed">Fixed Amount Discount</option>
            </select>
          </div>

          {form.discountType === "percentage" ? (
            <div className="form-group">
              <label>Discount Percentage (%)</label>
              <input
                name="discountValue"
                type="number"
                min="0.1"
                max="99.9"
                step="0.1"
                value={form.discountValue}
                onChange={onChange}
                required
                placeholder="Enter percentage"
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Fixed Discount Amount (₱)</label>
              <input
                name="discountValue"
                type="number"
                min="0.01"
                step="0.01"
                value={form.discountValue}
                onChange={onChange}
                required
                placeholder="Enter fixed amount"
              />
            </div>
          )}

          <div className="form-group">
            <label>Minimum Spend (₱)</label>
            <input
              name="minSpend"
              type="number"
              min="0"
              step="0.01"
              value={form.minSpend}
              onChange={onChange}
              placeholder="Optional minimum spend"
            />
          </div>

          <div className="form-group">
            <label>Valid From</label>
            <input
              name="validFrom"
              type="date"
              value={form.validFrom}
              onChange={onChange}
              min={today}
              required
            />
          </div>

          <div className="form-group">
            <label>Valid Until</label>
            <input
              name="validTo"
              type="date"
              value={form.validTo}
              onChange={onChange}
              min={form.validFrom || today}
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={onChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Discount"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountModal;
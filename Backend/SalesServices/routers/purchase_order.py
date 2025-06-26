# purchase_order_router.py

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Dict, Optional
from decimal import Decimal
import json
import sys
import os
import httpx
import logging
from datetime import datetime

# --- Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Ensure the database module can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection

# --- Auth and Service URL Configuration ---
# These are necessary for the authentication dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://127.0.0.1:4000/auth/token")
USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"

# --- Define the new router ---
# Note the different prefix and tags
router_purchase_order = APIRouter(
    prefix="/auth/purchase_orders",
    tags=["Purchase Orders"]
)

# --- Authorization Helper Function ---
# This is required for the endpoint dependency
async def get_current_active_user(token: str = Depends(oauth2_scheme)):
    """
    Validates the user's token by calling the User service.
    This function is copied here to make this router self-contained.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_ME_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Invalid token or user not found: {e.response.text}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not connect to the authentication service."
            )
    return response.json()

# --- Pydantic Models for the "Processing Orders" response ---
# These models are structured to match what your React frontend expects.

class ProcessingSaleItem(BaseModel):
    name: str
    quantity: int
    price: float
    category: str
    addons: Optional[dict] = {}

class ProcessingOrder(BaseModel):
    id: str               # e.g., "SO-123"
    date: str             # Formatted date string for display
    items: int            # Total count of all items in the order
    total: float          # Final price after discounts
    status: str
    orderType: str
    paymentMethod: str
    cashierName: str
    orderItems: List[ProcessingSaleItem]

# --- API Endpoint to Get Processing Orders ---
@router_purchase_order.get(
    "/status/processing",
    response_model=List[ProcessingOrder],
    summary="Get All Processing Orders"
)
async def get_processing_orders(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Retrieves all sales (referred to as purchase orders here) with the status 'processing'.
    The response is formatted specifically for the orders page on the frontend.
    """
    allowed_roles = ["admin", "manager", "staff", "cashier"]
    if current_user.get("userRole") not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view orders."
        )

    conn = None
    try:
        conn = await get_db_connection()
        async with conn.cursor() as cursor:
            # A single, efficient query to fetch all processing sales and their corresponding items
            sql = """
                SELECT
                    s.SaleID, s.OrderType, s.PaymentMethod, s.CreatedAt, s.CashierName,
                    s.TotalDiscountAmount, s.Status,
                    si.SaleItemID, si.ItemName, si.Quantity, si.UnitPrice, si.Category, si.Addons
                FROM
                    Sales AS s
                LEFT JOIN
                    SaleItems AS si ON s.SaleID = si.SaleID
                WHERE
                    s.Status = 'processing'
                ORDER BY
                    s.CreatedAt ASC, s.SaleID ASC;
            """
            await cursor.execute(sql)
            rows = await cursor.fetchall()

            # The database returns a flat list. We need to group items by SaleID.
            orders_dict: Dict[int, dict] = {}
            item_subtotals: Dict[int, Decimal] = {}

            for row in rows:
                sale_id = row.SaleID

                if sale_id not in orders_dict:
                    # First time seeing this SaleID: create the main order object
                    item_subtotals[sale_id] = Decimal('0.0')
                    orders_dict[sale_id] = {
                        "id": f"SO-{sale_id}",  # Format ID to match frontend expectation
                        "date": row.CreatedAt.strftime("%B %d, %Y %I:%M %p"), # Format date
                        "status": row.Status,
                        "orderType": row.OrderType,
                        "paymentMethod": row.PaymentMethod,
                        "cashierName": row.CashierName,
                        "items": 0,  # Sum of quantities, calculated below
                        "orderItems": [],
                        "_totalDiscount": row.TotalDiscountAmount, # Temp field for final calculation
                    }

                # If the order has items (LEFT JOIN can result in NULLs)
                if row.SaleItemID:
                    item_quantity = row.Quantity or 0
                    item_price = row.UnitPrice or Decimal('0.0')

                    # Add to the total number of items for the order
                    orders_dict[sale_id]["items"] += item_quantity
                    # Add to the running subtotal for the order
                    item_subtotals[sale_id] += item_price * item_quantity

                    # Append the detailed item object
                    orders_dict[sale_id]["orderItems"].append(
                        ProcessingSaleItem(
                            name=row.ItemName,
                            quantity=item_quantity,
                            price=float(item_price),
                            category=row.Category,
                            addons=json.loads(row.Addons) if row.Addons else {}
                        )
                    )

            # Now, calculate the final total for each order and format the final list
            response_list = []
            for sale_id, order_data in orders_dict.items():
                subtotal = item_subtotals.get(sale_id, Decimal('0.0'))
                total_discount = order_data.pop("_totalDiscount", Decimal('0.0'))
                final_total = subtotal - total_discount
                order_data["total"] = float(final_total)

                # Validate with Pydantic model and append to the final list
                response_list.append(ProcessingOrder(**order_data))

            return response_list

    except Exception as e:
        logger.error(f"Error fetching processing orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch processing orders.")
    finally:
        if conn:
            await conn.close()
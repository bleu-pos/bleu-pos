from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
import httpx
from decimal import Decimal
from datetime import datetime

# --- Database Connection Import ---
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from database import get_db_connection
except ImportError:
    print("ERROR: Could not import get_db_connection from database.py.")
    async def get_db_connection():
        raise NotImplementedError("Database connection not configured.")

# --- Router and Auth ---
router_discounts = APIRouter(prefix="/discounts", tags=["discounts"])
router_promotions = APIRouter(prefix="/promotions", tags=["promotions"])
oauth2_scheme_port4000 = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

async def validate_token_and_roles_port4000(token: str, allowed_roles: List[str]):
    auth_url = "http://localhost:4000/auth/users/me"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(auth_url, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Auth service is unavailable: {exc}")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail="Invalid or expired token.")

    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this role.")
    return user_data

async def get_admin_or_manager(token: str = Depends(oauth2_scheme_port4000)) -> dict:
    return await validate_token_and_roles_port4000(token=token, allowed_roles=["admin", "manager"])

async def get_any_user(token: str = Depends(oauth2_scheme_port4000)) -> dict:
    return await validate_token_and_roles_port4000(token=token, allowed_roles=["admin", "manager", "cashier"])

# --- Pydantic Models (Unchanged) ---
class DiscountBase(BaseModel):
    DiscountName: str
    Description: Optional[str] = None
    ProductName: Optional[str] = None
    DiscountType: str
    PercentageValue: Optional[Decimal] = Field(None, gt=0, lt=100)
    FixedValue: Optional[Decimal] = Field(None, ge=0)
    MinimumSpend: Optional[Decimal] = Field(None, ge=0)
    ValidFrom: datetime
    ValidTo: datetime
    Status: str
    
    @field_validator('DiscountType')
    def discount_type_must_be_valid(cls, v: str) -> str:
        if v not in ['Percentage', 'Fixed']:
            raise ValueError("DiscountType must be either 'Percentage' or 'Fixed'")
        return v
        
    @model_validator(mode='after')
    def check_dates_and_conditional_values(self) -> 'DiscountBase':
        if self.ValidFrom and self.ValidTo and self.ValidTo <= self.ValidFrom:
            raise ValueError('ValidTo date must be after ValidFrom date')

        if self.DiscountType == 'Percentage' and self.PercentageValue is None:
            raise ValueError('PercentageValue is required for Percentage type discounts')
        
        if self.DiscountType == 'Fixed' and self.FixedValue is None:
            raise ValueError('FixedValue is required for Fixed type discounts')
        
        return self

class DiscountCreate(DiscountBase):
    pass

class DiscountUpdate(DiscountBase):
    pass

class DiscountOut(BaseModel):
    DiscountID: int
    DiscountName: str
    Description: Optional[str]
    ProductName: Optional[str]
    DiscountType: str
    PercentageValue: Optional[Decimal]
    FixedValue: Optional[Decimal]
    MinimumSpend: Optional[Decimal]
    ValidFrom: datetime
    ValidTo: datetime
    Username: str 
    Status: str
    CreatedAt: datetime
    
    class Config:
        from_attributes = True

class PromotionBase(BaseModel):
    PromotionName: str
    Description: Optional[str] = None
    PromotionType: str  # percentage, fixed, bogo
    PercentageValue: Optional[Decimal] = Field(None, gt=0, lt=100)
    FixedValue: Optional[Decimal] = Field(None, ge=0)
    BuyQuantity: Optional[int] = Field(None, ge=1)
    GetQuantity: Optional[int] = Field(None, ge=1)
    MinQuantity: Optional[int] = Field(None, ge=1)
    MaxUsesPerCustomer: Optional[int] = Field(None, ge=1)
    ValidFrom: datetime
    ValidTo: datetime
    Status: str
    SelectedProductIDs: List[int]

    @field_validator('PromotionType')
    def promo_type_valid(cls, v):
        if v not in ['percentage', 'fixed', 'bogo']:
            raise ValueError("Invalid PromotionType")
        return v

    @model_validator(mode='after')
    def validate_values(self):
        if self.ValidTo <= self.ValidFrom:
            raise ValueError('ValidTo must be after ValidFrom')
        if self.PromotionType == 'percentage' and self.PercentageValue is None:
            raise ValueError('PercentageValue is required for percentage type')
        if self.PromotionType == 'fixed' and self.FixedValue is None:
            raise ValueError('FixedValue is required for fixed type')
        if self.PromotionType == 'bogo':
            if self.BuyQuantity is None or self.GetQuantity is None:
                raise ValueError('BuyQuantity and GetQuantity are required for BOGO')
        if not self.SelectedProductIDs:
            raise ValueError('At least one product must be selected')
        return self

class PromotionCreate(PromotionBase):
    pass

class PromotionUpdate(PromotionBase):
    pass

class PromotionOut(PromotionBase):
    PromotionID: int
    Username: str
    CreatedAt: datetime

    class Config:
        from_attributes = True


# --- CRUD Endpoints ---

@router_discounts.post("/", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
async def create_discount(discount_data: DiscountCreate, current_user: dict = Depends(get_admin_or_manager)):
    username = current_user.get("username", "unknown_user") 
    conn = None
    try:
        conn = await get_db_connection()
        # FIX: Removed `as_dict=True` which is not supported by pyodbc
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT 1 FROM Discounts WHERE DiscountName = ?", discount_data.DiscountName)
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Discount name '{discount_data.DiscountName}' already exists.")

            sql = """
                INSERT INTO Discounts (
                    DiscountName, Description, ProductName, DiscountType, PercentageValue, FixedValue,
                    MinimumSpend, ValidFrom, ValidTo, Username, Status
                )
                OUTPUT INSERTED.*
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            await cursor.execute(
                sql,
                discount_data.DiscountName, discount_data.Description, discount_data.ProductName,
                discount_data.DiscountType, discount_data.PercentageValue, discount_data.FixedValue,
                discount_data.MinimumSpend, discount_data.ValidFrom, discount_data.ValidTo,
                username, discount_data.Status
            )
            # FIX: Manually convert the single-row result to a dictionary
            columns = [column[0] for column in cursor.description]
            row = await cursor.fetchone()
            await conn.commit()
            
            if not row:
                raise HTTPException(status_code=500, detail="Failed to create discount, no record returned.")
                
            return dict(zip(columns, row))
            
    except ValueError as ve: 
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        if conn: await conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error creating discount: {e}")
    finally:
        if conn: await conn.close()

@router_discounts.get("/", response_model=List[DiscountOut])
async def get_all_discounts(active_only: bool = False, current_user: dict = Depends(get_any_user)):
    conn = None
    try:
        conn = await get_db_connection()
        # FIX: Removed `as_dict=True` which is not supported by pyodbc
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM Discounts"
            if active_only:
                sql += " WHERE Status = 'Active' AND GETUTCDATE() BETWEEN ValidFrom AND ValidTo"
            sql += " ORDER BY DiscountID DESC"
            
            await cursor.execute(sql)
            
            # FIX: Manually convert tuple results into a list of dictionaries
            columns = [column[0] for column in cursor.description]
            rows = await cursor.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching discounts: {e}")
    finally:
        if conn: await conn.close()
        
@router_discounts.get("/{discount_id}", response_model=DiscountOut)
async def get_discount_by_id(discount_id: int, current_user: dict = Depends(get_any_user)):
    conn = None
    try:
        conn = await get_db_connection()
        # FIX: Removed `as_dict=True` which is not supported by pyodbc
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT * FROM Discounts WHERE DiscountID = ?", discount_id)
            
            # FIX: Manually convert the single-row result to a dictionary
            columns = [column[0] for column in cursor.description]
            row = await cursor.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail=f"Discount ID {discount_id} not found.")
                
            return dict(zip(columns, row))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching discount: {e}")
    finally:
        if conn: await conn.close()

@router_discounts.put("/{discount_id}", response_model=DiscountOut)
async def update_discount(discount_id: int, discount_data: DiscountUpdate, current_user: dict = Depends(get_admin_or_manager)):
    conn = None
    username = current_user.get("username", "unknown_user")
    try:
        conn = await get_db_connection()
        # FIX: Removed `as_dict=True`
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT 1 FROM Discounts WHERE DiscountID = ?", discount_id)
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Discount ID {discount_id} not found.")

            sql = """
                UPDATE Discounts SET
                    DiscountName = ?, Description = ?, ProductName = ?, DiscountType = ?,
                    PercentageValue = ?, FixedValue = ?, MinimumSpend = ?, ValidFrom = ?,
                    ValidTo = ?, Username = ?, Status = ?
                WHERE DiscountID = ?
            """
            await cursor.execute(
                sql,
                discount_data.DiscountName, discount_data.Description, discount_data.ProductName,
                discount_data.DiscountType, discount_data.PercentageValue, discount_data.FixedValue,
                discount_data.MinimumSpend, discount_data.ValidFrom, discount_data.ValidTo,
                username, discount_data.Status, discount_id
            )
            await conn.commit()
            
            # This function is now fixed, so calling it will work correctly.
            return await get_discount_by_id(discount_id, current_user)
            
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        if conn: await conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating discount: {e}")
    finally:
        if conn: await conn.close()

@router_discounts.delete("/{discount_id}", status_code=status.HTTP_200_OK)
async def delete_discount(discount_id: int, current_user: dict = Depends(get_admin_or_manager)):
    conn = None
    try:
        conn = await get_db_connection()
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT 1 FROM Discounts WHERE DiscountID = ?", discount_id)
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Discount ID {discount_id} not found.")
            
            await cursor.execute("DELETE FROM Discounts WHERE DiscountID = ?", discount_id)
            await conn.commit()
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Discount ID {discount_id} could not be deleted.")
            
            return {"message": f"Discount ID {discount_id} deleted successfully."}
    except Exception as e:
        if conn: await conn.rollback()
        if "The DELETE statement conflicted with the REFERENCE constraint" in str(e):
             raise HTTPException(status_code=409, detail=f"Cannot delete discount ID {discount_id} as it is currently applied to one or more sales.")
        raise HTTPException(status_code=500, detail=f"Error deleting discount: {e}")
    finally:
        if conn: await conn.close()

@router_promotions.post("/", response_model=PromotionOut, status_code=201)
async def create_promotion(promo: PromotionCreate, current_user: dict = Depends(get_admin_or_manager)):
    conn = None
    username = current_user.get("username", "unknown_user")
    try:
        conn = await get_db_connection()
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT 1 FROM Promotions WHERE PromotionName = ?", promo.PromotionName)
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Promotion name already exists")

            sql = """
                INSERT INTO Promotions (
                    PromotionName, Description, PromotionType, PercentageValue, FixedValue,
                    BuyQuantity, GetQuantity, MinQuantity, MaxUsesPerCustomer,
                    ValidFrom, ValidTo, Status, Username
                )
                OUTPUT INSERTED.PromotionID, INSERTED.PromotionName, INSERTED.Description,
                       INSERTED.PromotionType, INSERTED.PercentageValue, INSERTED.FixedValue,
                       INSERTED.BuyQuantity, INSERTED.GetQuantity, INSERTED.MinQuantity,
                       INSERTED.MaxUsesPerCustomer, INSERTED.ValidFrom, INSERTED.ValidTo,
                       INSERTED.Status, INSERTED.Username, INSERTED.CreatedAt
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            await cursor.execute(sql, promo.PromotionName, promo.Description, promo.PromotionType,
                                 promo.PercentageValue, promo.FixedValue,
                                 promo.BuyQuantity, promo.GetQuantity,
                                 promo.MinQuantity, promo.MaxUsesPerCustomer,
                                 promo.ValidFrom, promo.ValidTo, promo.Status, username)
            row = await cursor.fetchone()
            columns = [col[0] for col in cursor.description]
            promotion_dict = dict(zip(columns, row))

            # insert into join table: PromotionProducts
            for product_id in promo.SelectedProductIDs:
                await cursor.execute("INSERT INTO PromotionProducts (PromotionID, ProductID) VALUES (?, ?)", promotion_dict['PromotionID'], product_id)

            await conn.commit()
            promotion_dict['SelectedProductIDs'] = promo.SelectedProductIDs
            return promotion_dict

    except Exception as e:
        if conn: await conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating promotion: {e}")
    finally:
        if conn: await conn.close()
    
    @router_promotions.get("/", response_model=List[PromotionOut])
    async def get_all_promotions(current_user: dict = Depends(get_any_user)):
        conn = None
        try:
            conn = await get_db_connection()
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT p.*, 
                        ISNULL(pp.ProductIDs, '') AS SelectedProductIDs
                    FROM Promotions p
                    OUTER APPLY (
                        SELECT STRING_AGG(CONVERT(VARCHAR, ProductID), ',') AS ProductIDs
                        FROM PromotionProducts 
                        WHERE PromotionID = p.PromotionID
                    ) pp
                    ORDER BY p.PromotionID DESC
                """)
                columns = [col[0] for col in cursor.description]
                rows = await cursor.fetchall()
                results = []
                for row in rows:
                    item = dict(zip(columns, row))
                    item['SelectedProductIDs'] = list(map(int, item['SelectedProductIDs'].split(','))) if item['SelectedProductIDs'] else []
                    results.append(item)
                return results
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving promotions: {e}")
        finally:
            if conn: await conn.close()

    @router_promotions.get("/{promotion_id}", response_model=PromotionOut)
    async def get_promotion_by_id(promotion_id: int, current_user: dict = Depends(get_any_user)):
        conn = None
        try:
            conn = await get_db_connection()
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT p.*, 
                        ISNULL(pp.ProductIDs, '') AS SelectedProductIDs
                    FROM Promotions p
                    OUTER APPLY (
                        SELECT STRING_AGG(CONVERT(VARCHAR, ProductID), ',') AS ProductIDs
                        FROM PromotionProducts 
                        WHERE PromotionID = p.PromotionID
                    ) pp
                    WHERE p.PromotionID = ?
                """, promotion_id)
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Promotion not found.")
                columns = [col[0] for col in cursor.description]
                item = dict(zip(columns, row))
                item['SelectedProductIDs'] = list(map(int, item['SelectedProductIDs'].split(','))) if item['SelectedProductIDs'] else []
                return item
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving promotion: {e}")
        finally:
            if conn: await conn.close()

    @router_promotions.put("/{promotion_id}", response_model=PromotionOut)
    async def update_promotion(promotion_id: int, promo: PromotionUpdate, current_user: dict = Depends(get_admin_or_manager)):
        conn = None
        username = current_user.get("username", "unknown_user")
        try:
            conn = await get_db_connection()
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT 1 FROM Promotions WHERE PromotionID = ?", promotion_id)
                if not await cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Promotion not found.")

                update_sql = """
                    UPDATE Promotions SET
                        PromotionName = ?, Description = ?, PromotionType = ?, PercentageValue = ?,
                        FixedValue = ?, BuyQuantity = ?, GetQuantity = ?, MinQuantity = ?,
                        MaxUsesPerCustomer = ?, ValidFrom = ?, ValidTo = ?, Status = ?, Username = ?
                    WHERE PromotionID = ?
                """
                await cursor.execute(update_sql,
                    promo.PromotionName, promo.Description, promo.PromotionType, promo.PercentageValue,
                    promo.FixedValue, promo.BuyQuantity, promo.GetQuantity, promo.MinQuantity,
                    promo.MaxUsesPerCustomer, promo.ValidFrom, promo.ValidTo, promo.Status, username,
                    promotion_id
                )

                # Clear old mappings and insert new ones
                await cursor.execute("DELETE FROM PromotionProducts WHERE PromotionID = ?", promotion_id)
                for product_id in promo.SelectedProductIDs:
                    await cursor.execute("INSERT INTO PromotionProducts (PromotionID, ProductID) VALUES (?, ?)", promotion_id, product_id)

                await conn.commit()
                return await get_promotion_by_id(promotion_id, current_user)

        except Exception as e:
            if conn: await conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating promotion: {e}")
        finally:
            if conn: await conn.close()

    @router_promotions.delete("/{promotion_id}", status_code=200)
    async def delete_promotion(promotion_id: int, current_user: dict = Depends(get_admin_or_manager)):
        conn = None
        try:
            conn = await get_db_connection()
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT 1 FROM Promotions WHERE PromotionID = ?", promotion_id)
                if not await cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Promotion not found.")

                # Delete associated product mappings first
                await cursor.execute("DELETE FROM PromotionProducts WHERE PromotionID = ?", promotion_id)
                await cursor.execute("DELETE FROM Promotions WHERE PromotionID = ?", promotion_id)

                await conn.commit()
                return {"message": f"Promotion ID {promotion_id} deleted successfully."}

        except Exception as e:
            if conn: await conn.rollback()
            if "REFERENCE constraint" in str(e):
                raise HTTPException(status_code=409, detail=f"Cannot delete promotion ID {promotion_id} as it is currently applied to sales.")
            raise HTTPException(status_code=500, detail=f"Error deleting promotion: {e}")
        finally:
            if conn: await conn.close()

    __all__ = ["router_discounts", "router_promotions"]
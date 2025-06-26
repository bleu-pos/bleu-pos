from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- FIX: Correct the imports to match your filenames EXACTLY ---
# We are importing the modules 'sales_router' and 'purchase_order' from the 'routers' package.
from routers import pos_router, purchase_order

app = FastAPI(
    title="POS and Order Service API",
    description="Handles sales creation and retrieves processing orders.",
    version="1.0.0"
)

# --- Include routers using the correct imported objects ---
# The prefixes are defined inside the router files, so we don't add them here.

# This router is from sales_router.py and its object is named 'router_sales'
app.include_router(pos_router.router_sales)

# This router is from purchase_order.py and its object is named 'router_purchase_order'
app.include_router(purchase_order.router_purchase_order)


# Your CORS middleware is good. No changes needed here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4001",
        "http://192.168.100.32:4001",
        "http://localhost:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://192.168.100.14:8002",
        "http://localhost:8002",
        "http://192.168.100.14:8003",
        "http://localhost:8003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A simple root endpoint to easily check if the server is running
@app.get("/", tags=["Health Check"])
def read_root():
    return {"status": "ok", "message": "POS Service is running."}


# Run app
if __name__ == "__main__":
    import uvicorn
    
    # Use host '0.0.0.0' to be accessible on your local network
    print("--- Starting POS Service on http://0.0.0.0:9000 ---")
    print("API docs available at http://127.0.0.1:9000/docs")
    uvicorn.run("main:app", port=9000, host="0.0.0.0", reload=True)
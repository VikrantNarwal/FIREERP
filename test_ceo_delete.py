#!/usr/bin/env python3
"""
Test CEO soft delete functionality by creating a test order and deleting it
"""

import requests
import json

BASE_URL = "https://production-hub-375.preview.emergentagent.com/api"

# Login as CEO
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "ceo@fireplace.com", "password": "admin123"}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    exit(1)

ceo_token = login_response.json()["accessToken"]
headers = {
    "Authorization": f"Bearer {ceo_token}",
    "Content-Type": "application/json"
}

print("✅ Logged in as CEO")

# Get existing customer and product IDs
customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
products_response = requests.get(f"{BASE_URL}/products", headers=headers)

if customers_response.status_code != 200 or products_response.status_code != 200:
    print("❌ Could not fetch customers or products")
    exit(1)

customers = customers_response.json()
products = products_response.json()

if not customers or not products:
    print("❌ No customers or products found")
    exit(1)

customer_id = customers[0]["id"]
product_id = products[0]["id"]

print(f"✅ Using customer: {customer_id}, product: {product_id}")

# Login as SALES to create order
sales_login = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "sales@fireplace.com", "password": "admin123"}
)

sales_token = sales_login.json()["accessToken"]
sales_headers = {
    "Authorization": f"Bearer {sales_token}",
    "Content-Type": "application/json"
}

# Create a test order
order_data = {
    "customerId": customer_id,
    "productId": product_id,
    "fireplaceType": "ELECTRICAL_FIREPLACE",
    "variant": "EF",
    "dimensions": "48x24x6",
    "flameColor": "ORANGE",
    "quantity": 1,
    "unitPrice": 50000,
    "totalPrice": 50000,
    "finalPrice": 50000,
    "notes": "Test order for CEO delete functionality"
}

create_response = requests.post(
    f"{BASE_URL}/orders",
    json=order_data,
    headers=sales_headers
)

if create_response.status_code != 201:
    print(f"❌ Failed to create order: {create_response.status_code}")
    print(create_response.text)
    exit(1)

order = create_response.json()
order_id = order["id"]
job_number = order["jobNumber"]

print(f"✅ Created test order: {job_number} (ID: {order_id})")

# Now test CEO soft delete
delete_response = requests.delete(
    f"{BASE_URL}/orders/{order_id}",
    headers=headers
)

if delete_response.status_code != 200:
    print(f"❌ CEO soft delete failed: {delete_response.status_code}")
    print(delete_response.text)
    exit(1)

deleted_order = delete_response.json()["order"]
has_deleted_at = deleted_order.get("deletedAt") is not None
is_cancelled = deleted_order.get("status") == "CANCELLED"

print(f"✅ CEO soft delete successful")
print(f"   - deletedAt set: {has_deleted_at} ({deleted_order.get('deletedAt', 'N/A')[:19]})")
print(f"   - status changed to CANCELLED: {is_cancelled} ({deleted_order.get('status')})")

if has_deleted_at and is_cancelled:
    print("\n🎉 CEO SOFT DELETE TEST PASSED!")
else:
    print("\n❌ CEO soft delete did not set fields correctly")
    exit(1)

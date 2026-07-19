#!/usr/bin/env python3
"""
Backend API Testing for FIRE Manufacturing ERP - Payment, Alerts, Documents Extensions
Tests all new API endpoints with proper authentication and role-based access control
"""

import requests
import json
from datetime import datetime

# Base URL from environment
BASE_URL = "https://production-hub-375.preview.emergentagent.com/api"

# Test credentials
CREDENTIALS = {
    "ceo": {"email": "ceo@fireplace.com", "password": "admin123"},
    "sales": {"email": "sales@fireplace.com", "password": "admin123"},
    "design": {"email": "design@fireplace.com", "password": "admin123"}
}

# Global variables to store test data
tokens = {}
test_order_id = None
test_payment_id = None
test_alert_id = None
test_document_id = None

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_test(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")

def login(role):
    """Login and get access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=CREDENTIALS[role],
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            tokens[role] = data.get("accessToken")
            print_test(f"Login as {role.upper()}", True, f"Token: {tokens[role][:20]}...")
            return True
        else:
            print_test(f"Login as {role.upper()}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test(f"Login as {role.upper()}", False, f"Exception: {str(e)}")
        return False

def get_auth_headers(role):
    """Get authorization headers for a role"""
    return {
        "Authorization": f"Bearer {tokens[role]}",
        "Content-Type": "application/json"
    }

def get_test_order_id():
    """Get an existing order ID for testing"""
    global test_order_id
    try:
        response = requests.get(
            f"{BASE_URL}/orders",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            orders = response.json()
            if orders and len(orders) > 0:
                test_order_id = orders[0]["id"]
                print_test("Get test order ID", True, f"Order ID: {test_order_id}, Job: {orders[0].get('jobNumber', 'N/A')}")
                return True
            else:
                print_test("Get test order ID", False, "No orders found in system")
                return False
        else:
            print_test("Get test order ID", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get test order ID", False, f"Exception: {str(e)}")
        return False

# ==================== PAYMENT API TESTS ====================

def test_create_payment_as_sales():
    """Test POST /api/payments as SALES role"""
    global test_payment_id
    try:
        payment_data = {
            "orderId": test_order_id,
            "amount": 50000.00,
            "paymentType": "ADVANCE",
            "paymentMode": "BANK_TRANSFER",
            "transactionRef": f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "notes": "Advance payment received from customer",
            "paymentDate": datetime.now().isoformat()
        }
        
        response = requests.post(
            f"{BASE_URL}/payments",
            json=payment_data,
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 201:
            data = response.json()
            test_payment_id = data.get("id")
            print_test("Create payment (SALES role)", True, f"Payment ID: {test_payment_id}, Amount: {data.get('amount')}")
            return True
        else:
            print_test("Create payment (SALES role)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("Create payment (SALES role)", False, f"Exception: {str(e)}")
        return False

def test_create_payment_as_design_forbidden():
    """Test POST /api/payments as DESIGN role (should fail)"""
    try:
        payment_data = {
            "orderId": test_order_id,
            "amount": 10000.00,
            "paymentType": "BALANCE",
            "paymentMode": "CASH",
            "transactionRef": "TEST-FORBIDDEN"
        }
        
        response = requests.post(
            f"{BASE_URL}/payments",
            json=payment_data,
            headers=get_auth_headers("design")
        )
        
        if response.status_code == 403:
            print_test("Create payment (DESIGN role - should be forbidden)", True, "Correctly rejected with 403")
            return True
        else:
            print_test("Create payment (DESIGN role - should be forbidden)", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_test("Create payment (DESIGN role - should be forbidden)", False, f"Exception: {str(e)}")
        return False

def test_get_all_payments():
    """Test GET /api/payments"""
    try:
        response = requests.get(
            f"{BASE_URL}/payments",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            payments = response.json()
            print_test("Get all payments", True, f"Found {len(payments)} payments")
            return True
        else:
            print_test("Get all payments", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get all payments", False, f"Exception: {str(e)}")
        return False

def test_get_payments_by_order():
    """Test GET /api/payments with orderId filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/payments?orderId={test_order_id}",
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 200:
            payments = response.json()
            print_test("Get payments by order ID", True, f"Found {len(payments)} payments for order {test_order_id}")
            
            # Verify payment includes order and recordedBy details
            if payments and len(payments) > 0:
                payment = payments[0]
                has_order = "order" in payment and payment["order"] is not None
                has_recorded_by = "recordedBy" in payment and payment["recordedBy"] is not None
                print_test("Payment includes order details", has_order, f"Order: {payment.get('order', {}).get('jobNumber', 'N/A')}")
                print_test("Payment includes recordedBy details", has_recorded_by, f"Recorded by: {payment.get('recordedBy', {}).get('firstName', 'N/A')}")
            
            return True
        else:
            print_test("Get payments by order ID", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get payments by order ID", False, f"Exception: {str(e)}")
        return False

def test_order_advance_amount_updated():
    """Verify that Order.advanceAmountPaid was updated after payment"""
    try:
        response = requests.get(
            f"{BASE_URL}/orders/{test_order_id}",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            order = response.json()
            advance_paid = order.get("advanceAmountPaid")
            advance_date = order.get("advanceDatePaid")
            balance_due = order.get("balanceDue")
            
            if advance_paid and advance_paid > 0:
                print_test("Order advanceAmountPaid updated", True, f"Advance: ₹{advance_paid}, Balance Due: ₹{balance_due}")
                return True
            else:
                print_test("Order advanceAmountPaid updated", False, f"Advance amount is {advance_paid}")
                return False
        else:
            print_test("Order advanceAmountPaid updated", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Order advanceAmountPaid updated", False, f"Exception: {str(e)}")
        return False

# ==================== CRITICAL ALERTS API TESTS ====================

def test_create_alert_low_severity():
    """Test POST /api/alerts with LOW severity"""
    global test_alert_id
    try:
        alert_data = {
            "orderId": test_order_id,
            "category": "PRODUCTION_DELAY",
            "message": "Minor delay in laser cutting stage",
            "details": "Operator reported 2-hour delay due to machine calibration",
            "severity": "LOW"
        }
        
        response = requests.post(
            f"{BASE_URL}/alerts",
            json=alert_data,
            headers=get_auth_headers("design")
        )
        
        if response.status_code == 201:
            data = response.json()
            test_alert_id = data.get("id")
            print_test("Create alert (LOW severity)", True, f"Alert ID: {test_alert_id}, Status: {data.get('status')}")
            
            # Verify raisedByUserId and raisedByRole are auto-populated
            has_raised_by = "raisedBy" in data and data["raisedBy"] is not None
            print_test("Alert auto-populates raisedBy", has_raised_by, f"Raised by: {data.get('raisedBy', {}).get('firstName', 'N/A')}")
            
            return True
        else:
            print_test("Create alert (LOW severity)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("Create alert (LOW severity)", False, f"Exception: {str(e)}")
        return False

def test_create_alert_critical_severity():
    """Test POST /api/alerts with CRITICAL severity"""
    try:
        alert_data = {
            "orderId": test_order_id,
            "category": "QUALITY_ISSUE",
            "message": "Critical quality defect found in welding",
            "details": "Multiple weld joints failed QC inspection - immediate attention required",
            "severity": "CRITICAL"
        }
        
        response = requests.post(
            f"{BASE_URL}/alerts",
            json=alert_data,
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 201:
            data = response.json()
            print_test("Create alert (CRITICAL severity)", True, f"Alert ID: {data.get('id')}, Severity: {data.get('severity')}")
            return True
        else:
            print_test("Create alert (CRITICAL severity)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Create alert (CRITICAL severity)", False, f"Exception: {str(e)}")
        return False

def test_create_alert_inventory_shortage():
    """Test POST /api/alerts with INVENTORY_SHORTAGE category"""
    try:
        alert_data = {
            "orderId": test_order_id,
            "category": "INVENTORY_SHORTAGE",
            "message": "Low stock of LED strips",
            "details": "Current stock: 50 units, Required: 200 units",
            "severity": "HIGH"
        }
        
        response = requests.post(
            f"{BASE_URL}/alerts",
            json=alert_data,
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 201:
            data = response.json()
            print_test("Create alert (INVENTORY_SHORTAGE)", True, f"Category: {data.get('category')}")
            return True
        else:
            print_test("Create alert (INVENTORY_SHORTAGE)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Create alert (INVENTORY_SHORTAGE)", False, f"Exception: {str(e)}")
        return False

def test_get_all_alerts():
    """Test GET /api/alerts"""
    try:
        response = requests.get(
            f"{BASE_URL}/alerts",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            alerts = response.json()
            print_test("Get all alerts", True, f"Found {len(alerts)} alerts")
            
            # Verify ordering by severity DESC, createdAt DESC
            if len(alerts) >= 2:
                severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
                is_ordered = True
                for i in range(len(alerts) - 1):
                    curr_severity = alerts[i].get("severity")
                    next_severity = alerts[i + 1].get("severity")
                    if severity_order.index(curr_severity) > severity_order.index(next_severity):
                        is_ordered = False
                        break
                print_test("Alerts ordered by severity DESC", is_ordered, f"First: {alerts[0].get('severity')}, Last: {alerts[-1].get('severity')}")
            
            return True
        else:
            print_test("Get all alerts", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get all alerts", False, f"Exception: {str(e)}")
        return False

def test_get_alerts_by_status():
    """Test GET /api/alerts with status filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/alerts?status=OPEN",
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 200:
            alerts = response.json()
            all_open = all(alert.get("status") == "OPEN" for alert in alerts)
            print_test("Get alerts by status (OPEN)", all_open, f"Found {len(alerts)} OPEN alerts")
            return all_open
        else:
            print_test("Get alerts by status (OPEN)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get alerts by status (OPEN)", False, f"Exception: {str(e)}")
        return False

def test_get_alerts_by_severity():
    """Test GET /api/alerts with severity filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/alerts?severity=CRITICAL",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            alerts = response.json()
            all_critical = all(alert.get("severity") == "CRITICAL" for alert in alerts)
            print_test("Get alerts by severity (CRITICAL)", all_critical, f"Found {len(alerts)} CRITICAL alerts")
            return all_critical
        else:
            print_test("Get alerts by severity (CRITICAL)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get alerts by severity (CRITICAL)", False, f"Exception: {str(e)}")
        return False

def test_get_alerts_by_order():
    """Test GET /api/alerts with orderId filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/alerts?orderId={test_order_id}",
            headers=get_auth_headers("design")
        )
        
        if response.status_code == 200:
            alerts = response.json()
            all_match_order = all(alert.get("orderId") == test_order_id for alert in alerts)
            print_test("Get alerts by order ID", all_match_order, f"Found {len(alerts)} alerts for order")
            return all_match_order
        else:
            print_test("Get alerts by order ID", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get alerts by order ID", False, f"Exception: {str(e)}")
        return False

def test_acknowledge_alert():
    """Test PUT /api/alerts/:id to acknowledge"""
    try:
        update_data = {
            "status": "ACKNOWLEDGED"
        }
        
        response = requests.put(
            f"{BASE_URL}/alerts/{test_alert_id}",
            json=update_data,
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            data = response.json()
            is_acknowledged = data.get("status") == "ACKNOWLEDGED"
            print_test("Acknowledge alert", is_acknowledged, f"Status: {data.get('status')}")
            return is_acknowledged
        else:
            print_test("Acknowledge alert", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Acknowledge alert", False, f"Exception: {str(e)}")
        return False

def test_resolve_alert():
    """Test PUT /api/alerts/:id to resolve"""
    try:
        update_data = {
            "status": "RESOLVED",
            "resolutionNotes": "Issue resolved - machine recalibrated and production resumed"
        }
        
        response = requests.put(
            f"{BASE_URL}/alerts/{test_alert_id}",
            json=update_data,
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 200:
            data = response.json()
            is_resolved = data.get("status") == "RESOLVED"
            has_resolved_at = data.get("resolvedAt") is not None
            has_resolved_by = data.get("resolvedBy") is not None
            
            print_test("Resolve alert", is_resolved, f"Status: {data.get('status')}")
            print_test("Alert auto-sets resolvedAt", has_resolved_at, f"Resolved at: {data.get('resolvedAt', 'N/A')[:19]}")
            print_test("Alert auto-sets resolvedBy", has_resolved_by, f"Resolved by: {data.get('resolvedBy', {}).get('firstName', 'N/A')}")
            
            return is_resolved and has_resolved_at and has_resolved_by
        else:
            print_test("Resolve alert", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Resolve alert", False, f"Exception: {str(e)}")
        return False

# ==================== DOCUMENT UPLOAD API TESTS ====================

def test_upload_quotation_document():
    """Test POST /api/documents/upload with QUOTATION type"""
    global test_document_id
    try:
        document_data = {
            "orderId": test_order_id,
            "type": "QUOTATION",
            "fileName": f"quotation_{datetime.now().strftime('%Y%m%d')}.pdf",
            "fileUrl": "https://example.com/documents/quotation_12345.pdf",
            "fileSize": 245678,
            "mimeType": "application/pdf",
            "notes": "Customer quotation for custom fireplace design"
        }
        
        response = requests.post(
            f"{BASE_URL}/documents/upload",
            json=document_data,
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 201:
            data = response.json()
            test_document_id = data.get("id")
            print_test("Upload QUOTATION document (SALES role)", True, f"Document ID: {test_document_id}, Type: {data.get('type')}")
            return True
        else:
            print_test("Upload QUOTATION document (SALES role)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("Upload QUOTATION document (SALES role)", False, f"Exception: {str(e)}")
        return False

def test_upload_document_forbidden():
    """Test POST /api/documents/upload with unauthorized role (should fail)"""
    try:
        # Note: All authenticated users with proper roles can upload, but let's test with a role that shouldn't exist
        # Since we don't have an unauthorized role in our test users, we'll skip this or test with missing auth
        # For now, we'll just verify that the endpoint requires authentication
        
        document_data = {
            "orderId": test_order_id,
            "type": "DESIGN",
            "fileName": "test.pdf",
            "fileUrl": "https://example.com/test.pdf",
            "fileSize": 1000,
            "mimeType": "application/pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/documents/upload",
            json=document_data,
            headers={"Content-Type": "application/json"}  # No auth header
        )
        
        if response.status_code == 401:
            print_test("Upload document without auth (should be forbidden)", True, "Correctly rejected with 401")
            return True
        else:
            print_test("Upload document without auth (should be forbidden)", False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_test("Upload document without auth (should be forbidden)", False, f"Exception: {str(e)}")
        return False

def test_get_all_documents():
    """Test GET /api/documents"""
    try:
        response = requests.get(
            f"{BASE_URL}/documents",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            documents = response.json()
            print_test("Get all documents", True, f"Found {len(documents)} documents")
            return True
        else:
            print_test("Get all documents", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get all documents", False, f"Exception: {str(e)}")
        return False

def test_get_documents_by_order():
    """Test GET /api/documents with orderId filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/documents?orderId={test_order_id}",
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 200:
            documents = response.json()
            all_match_order = all(doc.get("orderId") == test_order_id for doc in documents)
            print_test("Get documents by order ID", all_match_order, f"Found {len(documents)} documents for order")
            return all_match_order
        else:
            print_test("Get documents by order ID", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get documents by order ID", False, f"Exception: {str(e)}")
        return False

def test_get_documents_by_type():
    """Test GET /api/documents with type=QUOTATION filter"""
    try:
        response = requests.get(
            f"{BASE_URL}/documents?type=QUOTATION",
            headers=get_auth_headers("design")
        )
        
        if response.status_code == 200:
            documents = response.json()
            all_quotations = all(doc.get("type") == "QUOTATION" for doc in documents)
            print_test("Get documents by type (QUOTATION)", all_quotations, f"Found {len(documents)} QUOTATION documents")
            return all_quotations
        else:
            print_test("Get documents by type (QUOTATION)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Get documents by type (QUOTATION)", False, f"Exception: {str(e)}")
        return False

# ==================== ORDER SOFT DELETE TESTS ====================

def test_soft_delete_order_as_ceo():
    """Test DELETE /api/orders/:id as CEO (should work)"""
    try:
        # First, create a test order to delete
        order_data = {
            "customerId": "test-customer-id",  # This might fail if customer doesn't exist, but we're testing the delete endpoint
            "productId": "test-product-id",
            "fireplaceType": "WALL_MOUNTED",
            "variant": "STANDARD",
            "dimensions": "48x24x6",
            "flameColor": "ORANGE",
            "unitPrice": 50000,
            "totalPrice": 50000,
            "finalPrice": 50000,
            "quantity": 1
        }
        
        # Try to get an existing order instead
        response = requests.get(
            f"{BASE_URL}/orders",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            orders = response.json()
            if len(orders) > 1:  # Make sure we have at least 2 orders
                order_to_delete = orders[1]["id"]  # Use second order to avoid deleting our test order
                
                delete_response = requests.delete(
                    f"{BASE_URL}/orders/{order_to_delete}",
                    headers=get_auth_headers("ceo")
                )
                
                if delete_response.status_code == 200:
                    data = delete_response.json()
                    order = data.get("order", {})
                    has_deleted_at = order.get("deletedAt") is not None
                    is_cancelled = order.get("status") == "CANCELLED"
                    
                    print_test("Soft delete order (CEO role)", True, f"Order {order_to_delete} deleted")
                    print_test("Order deletedAt is set", has_deleted_at, f"DeletedAt: {order.get('deletedAt', 'N/A')[:19]}")
                    print_test("Order status changed to CANCELLED", is_cancelled, f"Status: {order.get('status')}")
                    
                    return has_deleted_at and is_cancelled
                else:
                    print_test("Soft delete order (CEO role)", False, f"Status: {delete_response.status_code}, Response: {delete_response.text}")
                    return False
            else:
                print_test("Soft delete order (CEO role)", False, "Not enough orders to test deletion")
                return False
        else:
            print_test("Soft delete order (CEO role)", False, f"Could not fetch orders: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("Soft delete order (CEO role)", False, f"Exception: {str(e)}")
        return False

def test_soft_delete_order_as_sales_forbidden():
    """Test DELETE /api/orders/:id as SALES (should fail with 403)"""
    try:
        response = requests.delete(
            f"{BASE_URL}/orders/{test_order_id}",
            headers=get_auth_headers("sales")
        )
        
        if response.status_code == 403:
            print_test("Soft delete order (SALES role - should be forbidden)", True, "Correctly rejected with 403")
            return True
        else:
            print_test("Soft delete order (SALES role - should be forbidden)", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_test("Soft delete order (SALES role - should be forbidden)", False, f"Exception: {str(e)}")
        return False

# ==================== DASHBOARD STATS TESTS ====================

def test_dashboard_stats():
    """Test GET /api/dashboard/stats with new alert fields"""
    try:
        response = requests.get(
            f"{BASE_URL}/dashboard/stats",
            headers=get_auth_headers("ceo")
        )
        
        if response.status_code == 200:
            stats = response.json()
            has_critical_alerts = "criticalAlerts" in stats
            has_open_alerts = "openAlerts" in stats
            
            print_test("Dashboard stats includes criticalAlerts", has_critical_alerts, f"Critical alerts: {stats.get('criticalAlerts', 'N/A')}")
            print_test("Dashboard stats includes openAlerts", has_open_alerts, f"Open alerts: {stats.get('openAlerts', 'N/A')}")
            
            # Verify critical alerts count is reasonable (should be > 0 since we created CRITICAL alerts)
            critical_count = stats.get("criticalAlerts", 0)
            open_count = stats.get("openAlerts", 0)
            
            print_test("Critical alerts count > 0", critical_count > 0, f"Count: {critical_count}")
            print_test("Open alerts count >= critical alerts", open_count >= critical_count, f"Open: {open_count}, Critical: {critical_count}")
            
            return has_critical_alerts and has_open_alerts
        else:
            print_test("Dashboard stats", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Dashboard stats", False, f"Exception: {str(e)}")
        return False

# ==================== MAIN TEST RUNNER ====================

def run_all_tests():
    """Run all backend API tests"""
    print_section("FIRE Manufacturing ERP - Backend API Testing")
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Track test results
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    # Authentication
    print_section("1. AUTHENTICATION")
    if login("ceo") and login("sales") and login("design"):
        passed_tests += 3
    else:
        failed_tests += 3
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return
    total_tests += 3
    
    # Get test order
    print_section("2. TEST DATA SETUP")
    if get_test_order_id():
        passed_tests += 1
    else:
        failed_tests += 1
        print("\n❌ Could not get test order. Cannot proceed with tests.")
        return
    total_tests += 1
    
    # Payment API Tests
    print_section("3. PAYMENT API TESTS")
    payment_tests = [
        test_create_payment_as_sales,
        test_create_payment_as_design_forbidden,
        test_get_all_payments,
        test_get_payments_by_order,
        test_order_advance_amount_updated
    ]
    for test in payment_tests:
        total_tests += 1
        if test():
            passed_tests += 1
        else:
            failed_tests += 1
    
    # Critical Alerts API Tests
    print_section("4. CRITICAL ALERTS API TESTS")
    alert_tests = [
        test_create_alert_low_severity,
        test_create_alert_critical_severity,
        test_create_alert_inventory_shortage,
        test_get_all_alerts,
        test_get_alerts_by_status,
        test_get_alerts_by_severity,
        test_get_alerts_by_order,
        test_acknowledge_alert,
        test_resolve_alert
    ]
    for test in alert_tests:
        total_tests += 1
        if test():
            passed_tests += 1
        else:
            failed_tests += 1
    
    # Document Upload API Tests
    print_section("5. DOCUMENT UPLOAD API TESTS")
    document_tests = [
        test_upload_quotation_document,
        test_upload_document_forbidden,
        test_get_all_documents,
        test_get_documents_by_order,
        test_get_documents_by_type
    ]
    for test in document_tests:
        total_tests += 1
        if test():
            passed_tests += 1
        else:
            failed_tests += 1
    
    # Order Soft Delete Tests
    print_section("6. ORDER SOFT DELETE TESTS (CEO ONLY)")
    delete_tests = [
        test_soft_delete_order_as_ceo,
        test_soft_delete_order_as_sales_forbidden
    ]
    for test in delete_tests:
        total_tests += 1
        if test():
            passed_tests += 1
        else:
            failed_tests += 1
    
    # Dashboard Stats Tests
    print_section("7. DASHBOARD STATS TESTS")
    if test_dashboard_stats():
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Final Summary
    print_section("TEST SUMMARY")
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if failed_tests == 0:
        print("\n🎉 ALL TESTS PASSED! 🎉")
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please review the output above.")

if __name__ == "__main__":
    run_all_tests()

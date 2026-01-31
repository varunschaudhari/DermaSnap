#!/usr/bin/env python3
"""
SkinQuant AI Backend API Testing Suite
Tests all backend endpoints for the skin analysis application
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, List

# Configuration
BACKEND_URL = "https://acne-tracker-2.preview.emergentagent.com/api"
TIMEOUT = 30

class SkinQuantAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_scan_ids = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def create_test_scan_data(self, analysis_type: str = "full") -> Dict[str, Any]:
        """Create realistic test scan data"""
        base_data = {
            "imageUri": "file:///storage/emulated/0/Pictures/skinquant_scan_20241201_143022.jpg",
            "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "skinTone": {"r": 200, "g": 150, "b": 130},
            "timestamp": datetime.now().isoformat(),
            "analysisType": analysis_type
        }
        
        # Add condition-specific analysis results based on type
        if analysis_type in ["acne", "full"]:
            base_data["acne"] = {
                "metrics": {
                    "totalCount": 15,
                    "comedones": 8,
                    "pustules": 4,
                    "papules": 3,
                    "nodules": 0,
                    "inflammatoryPercent": 47,
                    "density": "moderate",
                    "rednessPercent": 12,
                    "poreCount": 45,
                    "avgPoreSize": 2,
                    "poreDensity": "normal"
                },
                "severity": "moderate",
                "lesions": [
                    {"x": 120, "y": 180, "type": "comedone", "size": 2},
                    {"x": 200, "y": 220, "type": "pustule", "size": 3}
                ]
            }
            
        if analysis_type in ["pigmentation", "full"]:
            base_data["pigmentation"] = {
                "metrics": {
                    "pigmentedPercent": "8.5",
                    "avgIntensityDiff": 25,
                    "shi": "moderate",
                    "spotCount": 12,
                    "spotDensity": "low"
                },
                "severity": "mild",
                "regions": [
                    {"x": 150, "y": 100, "width": 20, "height": 15, "intensity": 0.7}
                ]
            }
            
        if analysis_type in ["wrinkles", "full"]:
            base_data["wrinkles"] = {
                "metrics": {
                    "count": 8,
                    "countPerCm": "2.1",
                    "avgLength": 15,
                    "avgDepth": 2,
                    "densityPercent": "5.2"
                },
                "severity": "mild",
                "lines": [
                    {"startX": 100, "startY": 150, "endX": 130, "endY": 155, "depth": 2}
                ]
            }
            
        return base_data

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "SkinQuant AI API" in data["message"]:
                    self.log_result("Root endpoint", True, f"API accessible, version: {data.get('version', 'unknown')}")
                    return True
                else:
                    self.log_result("Root endpoint", False, f"Unexpected response format: {data}")
                    return False
            else:
                self.log_result("Root endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Root endpoint", False, f"Connection error: {str(e)}")
            return False

    def test_create_scan_complete_data(self):
        """Test POST /api/scans with complete scan data"""
        try:
            scan_data = self.create_test_scan_data("full")
            response = self.session.post(
                f"{self.base_url}/scans",
                json=scan_data,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "message" in data:
                    scan_id = data["id"]
                    self.created_scan_ids.append(scan_id)
                    self.log_result("Create scan (complete data)", True, 
                                  f"Scan created with ID: {scan_id}", data)
                    return True, scan_id
                else:
                    self.log_result("Create scan (complete data)", False, 
                                  f"Missing id or message in response: {data}")
                    return False, None
            else:
                self.log_result("Create scan (complete data)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False, None
        except Exception as e:
            self.log_result("Create scan (complete data)", False, f"Error: {str(e)}")
            return False, None

    def test_create_scan_partial_data(self):
        """Test POST /api/scans with partial data (acne only)"""
        try:
            scan_data = self.create_test_scan_data("acne")
            response = self.session.post(
                f"{self.base_url}/scans",
                json=scan_data,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    scan_id = data["id"]
                    self.created_scan_ids.append(scan_id)
                    self.log_result("Create scan (partial data)", True, 
                                  f"Acne-only scan created with ID: {scan_id}", data)
                    return True, scan_id
                else:
                    self.log_result("Create scan (partial data)", False, 
                                  f"Missing id in response: {data}")
                    return False, None
            else:
                self.log_result("Create scan (partial data)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False, None
        except Exception as e:
            self.log_result("Create scan (partial data)", False, f"Error: {str(e)}")
            return False, None

    def test_get_all_scans(self):
        """Test GET /api/scans with pagination"""
        try:
            # Test default parameters
            response = self.session.get(f"{self.base_url}/scans", timeout=TIMEOUT)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get all scans (default)", True, 
                                  f"Retrieved {len(data)} scans", {"count": len(data)})
                    
                    # Test pagination
                    response_paginated = self.session.get(
                        f"{self.base_url}/scans?limit=1&skip=0", 
                        timeout=TIMEOUT
                    )
                    
                    if response_paginated.status_code == 200:
                        paginated_data = response_paginated.json()
                        if isinstance(paginated_data, list) and len(paginated_data) <= 1:
                            self.log_result("Get all scans (pagination)", True, 
                                          f"Pagination working, got {len(paginated_data)} scans with limit=1")
                            return True
                        else:
                            self.log_result("Get all scans (pagination)", False, 
                                          f"Pagination not working properly: {len(paginated_data)} scans returned")
                            return False
                    else:
                        self.log_result("Get all scans (pagination)", False, 
                                      f"Pagination failed: HTTP {response_paginated.status_code}")
                        return False
                else:
                    self.log_result("Get all scans (default)", False, 
                                  f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get all scans (default)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Get all scans", False, f"Error: {str(e)}")
            return False

    def test_get_specific_scan(self, scan_id: str):
        """Test GET /api/scans/{scan_id}"""
        try:
            response = self.session.get(f"{self.base_url}/scans/{scan_id}", timeout=TIMEOUT)
            
            if response.status_code == 200:
                data = response.json()
                if "_id" in data and data["_id"] == scan_id:
                    self.log_result("Get specific scan (valid ID)", True, 
                                  f"Retrieved scan {scan_id}", {"has_analysis": bool(data.get("acne") or data.get("pigmentation") or data.get("wrinkles"))})
                    return True
                else:
                    self.log_result("Get specific scan (valid ID)", False, 
                                  f"ID mismatch or missing _id: {data.get('_id')} vs {scan_id}")
                    return False
            else:
                self.log_result("Get specific scan (valid ID)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Get specific scan (valid ID)", False, f"Error: {str(e)}")
            return False

    def test_get_invalid_scan(self):
        """Test GET /api/scans/{scan_id} with invalid ID"""
        try:
            invalid_id = "invalid_scan_id_123"
            response = self.session.get(f"{self.base_url}/scans/{invalid_id}", timeout=TIMEOUT)
            
            if response.status_code == 400:
                self.log_result("Get specific scan (invalid ID)", True, 
                              "Correctly returned 400 for invalid ID format")
                return True
            elif response.status_code == 404:
                self.log_result("Get specific scan (invalid ID)", True, 
                              "Correctly returned 404 for invalid ID")
                return True
            else:
                self.log_result("Get specific scan (invalid ID)", False, 
                              f"Expected 400 or 404, got HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get specific scan (invalid ID)", False, f"Error: {str(e)}")
            return False

    def test_delete_scan(self, scan_id: str):
        """Test DELETE /api/scans/{scan_id}"""
        try:
            response = self.session.delete(f"{self.base_url}/scans/{scan_id}", timeout=TIMEOUT)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    self.log_result("Delete scan (valid ID)", True, 
                                  f"Successfully deleted scan {scan_id}")
                    
                    # Verify deletion by trying to get the scan
                    verify_response = self.session.get(f"{self.base_url}/scans/{scan_id}", timeout=TIMEOUT)
                    if verify_response.status_code == 404:
                        self.log_result("Delete scan verification", True, 
                                      "Scan properly deleted from database")
                        return True
                    else:
                        self.log_result("Delete scan verification", False, 
                                      f"Scan still exists after deletion: HTTP {verify_response.status_code}")
                        return False
                else:
                    self.log_result("Delete scan (valid ID)", False, 
                                  f"Unexpected response format: {data}")
                    return False
            else:
                self.log_result("Delete scan (valid ID)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Delete scan (valid ID)", False, f"Error: {str(e)}")
            return False

    def test_delete_nonexistent_scan(self):
        """Test DELETE /api/scans/{scan_id} with non-existent ID"""
        try:
            # Use a valid ObjectId format but non-existent
            nonexistent_id = "507f1f77bcf86cd799439011"
            response = self.session.delete(f"{self.base_url}/scans/{nonexistent_id}", timeout=TIMEOUT)
            
            if response.status_code == 404:
                self.log_result("Delete scan (non-existent)", True, 
                              "Correctly returned 404 for non-existent scan")
                return True
            else:
                self.log_result("Delete scan (non-existent)", False, 
                              f"Expected 404, got HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Delete scan (non-existent)", False, f"Error: {str(e)}")
            return False

    def test_scan_statistics(self):
        """Test GET /api/scans/stats/summary"""
        try:
            response = self.session.get(f"{self.base_url}/scans/stats/summary", timeout=TIMEOUT)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["totalScans", "byType"]
                
                if all(field in data for field in required_fields):
                    by_type = data["byType"]
                    type_fields = ["acne", "pigmentation", "wrinkles", "full"]
                    
                    if all(field in by_type for field in type_fields):
                        self.log_result("Scan statistics", True, 
                                      f"Stats retrieved: {data['totalScans']} total scans", data)
                        return True
                    else:
                        missing_types = [f for f in type_fields if f not in by_type]
                        self.log_result("Scan statistics", False, 
                                      f"Missing analysis types in byType: {missing_types}")
                        return False
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_result("Scan statistics", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("Scan statistics", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Scan statistics", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests in priority order"""
        print(f"🧪 Starting SkinQuant AI Backend API Tests")
        print(f"🔗 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Root endpoint (connectivity)
        if not self.test_root_endpoint():
            print("❌ Cannot connect to backend API. Stopping tests.")
            return False
        
        # Test 2: Create scans (high priority)
        print("\n📝 Testing scan creation...")
        success1, scan_id1 = self.test_create_scan_complete_data()
        success2, scan_id2 = self.test_create_scan_partial_data()
        
        if not (success1 or success2):
            print("❌ Cannot create scans. Stopping dependent tests.")
            return False
        
        # Test 3: Retrieve scans (high priority)
        print("\n📋 Testing scan retrieval...")
        self.test_get_all_scans()
        
        # Test 4: Get specific scan (medium priority)
        if scan_id1:
            self.test_get_specific_scan(scan_id1)
        self.test_get_invalid_scan()
        
        # Test 5: Statistics (low priority)
        print("\n📊 Testing statistics...")
        self.test_scan_statistics()
        
        # Test 6: Delete scans (low priority)
        print("\n🗑️ Testing scan deletion...")
        if scan_id2:  # Delete one of the created scans
            self.test_delete_scan(scan_id2)
        self.test_delete_nonexistent_scan()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🚨 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = SkinQuantAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All backend API tests passed!")
    else:
        print("\n⚠️ Some backend API tests failed. Check logs above.")
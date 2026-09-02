package utils

import "testing"

const testJWTSecret = "0123456789abcdef0123456789abcdef"

func TestJWTIssuerSeparatesAdminAndCustomerTokens(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)

	adminToken, _, err := GenerateToken(7, "admin", "admin")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}
	if _, err := ValidateToken(adminToken); err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}
	if _, err := ValidateCustomerToken(adminToken); err == nil {
		t.Fatal("ValidateCustomerToken() accepted an admin token")
	}

	customerToken, err := GenerateCustomerJWT(9, "customer@example.com")
	if err != nil {
		t.Fatalf("GenerateCustomerJWT() error = %v", err)
	}
	if _, err := ValidateCustomerToken(customerToken); err != nil {
		t.Fatalf("ValidateCustomerToken() error = %v", err)
	}
	if _, err := ValidateToken(customerToken); err == nil {
		t.Fatal("ValidateToken() accepted a customer token")
	}
}

func TestJWTRejectsWeakSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "too-short")

	if _, _, err := GenerateToken(1, "admin", "admin"); err == nil {
		t.Fatal("GenerateToken() accepted a weak secret")
	}
}

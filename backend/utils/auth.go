package utils

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash compares a password with its hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Claims represents JWT claims for admin users
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// CustomerClaims represents JWT claims for customers
type CustomerClaims struct {
	CustomerID uint   `json:"customer_id"`
	Email      string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID uint, username, role string) (string, time.Time, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", time.Time{}, errors.New("JWT_SECRET not set")
	}

	expiresHours := 24 // default
	if hoursStr := os.Getenv("JWT_EXPIRES_HOURS"); hoursStr != "" {
		if hours, err := strconv.Atoi(hoursStr); err == nil {
			expiresHours = hours
		}
	}

	expirationTime := time.Now().Add(time.Duration(expiresHours) * time.Hour)

	claims := &Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "fanuc-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))

	return tokenString, expirationTime, err
}

// ValidateToken validates a JWT token and returns claims
func ValidateToken(tokenString string) (*Claims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET not set")
	}

	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// GenerateCustomerJWT generates a JWT token for a customer
func GenerateCustomerJWT(customerID uint, email string) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", errors.New("JWT_SECRET not set")
	}

	expiresHours := 168 // 7 days for customers
	if hoursStr := os.Getenv("CUSTOMER_JWT_EXPIRES_HOURS"); hoursStr != "" {
		if hours, err := strconv.Atoi(hoursStr); err == nil {
			expiresHours = hours
		}
	}

	expirationTime := time.Now().Add(time.Duration(expiresHours) * time.Hour)

	claims := &CustomerClaims{
		CustomerID: customerID,
		Email:      email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "fanuc-backend-customer",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))

	return tokenString, err
}

// ValidateCustomerToken validates a customer JWT token and returns claims
func ValidateCustomerToken(tokenString string) (*CustomerClaims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET not set")
	}

	claims := &CustomerClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

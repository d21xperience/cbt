package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   string `json:"uid"`
	Role     string `json:"role"`
	ExamID   string `json:"exam_id,omitempty"`
	TenantID string `json:"tenant_id,omitempty"`
	jwt.RegisteredClaims
}

var jwtSecret []byte

func Init(secret string) {
	jwtSecret = []byte(secret)
}

// Backward compatible
func GenerateToken(userID, role, examID string, duration time.Duration) (string, error) {
	return GenerateTokenFull(userID, role, examID, "", duration)
}

func GenerateTokenFull(userID, role, examID, tenantID string, duration time.Duration) (string, error) {
	if len(jwtSecret) == 0 {
		return "", errors.New("jwt secret not initialized")
	}
	claims := &Claims{
		UserID:   userID,
		Role:     role,
		ExamID:   examID,
		TenantID: tenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "cbt-engine",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("algoritma signing tidak valid")
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token tidak valid")
	}
	return claims, nil
}

// pkg/auth/jwt.go
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`              // "ADMIN" atau "PARTICIPANT"
	ExamID string `json:"exam_id,omitempty"` // Hanya diisi jika Role = PARTICIPANT
	jwt.RegisteredClaims
}

var jwtSecret []byte

func Init(secret string) {
	jwtSecret = []byte(secret)
}

// GenerateToken membuat JWT baru
func GenerateToken(userID, role, examID string, duration time.Duration) (string, error) {
	claims := &Claims{
		UserID: userID,
		Role:   role,
		ExamID: examID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "cbt-engine",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ParseToken memvalidasi dan mengekstrak claims dari JWT
func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validasi algoritma signing untuk mencegah serangan "none"
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("algoritma signing tidak valid")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token tidak valid")
}

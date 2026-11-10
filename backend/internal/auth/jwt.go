package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims are the JWT claims issued by the API.
type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// UserID returns the numeric subject.
func (c Claims) UserID() (int64, error) { return strconv.ParseInt(c.Subject, 10, 64) }

// JWTManager issues and verifies HS256 tokens.
type JWTManager struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

// NewJWTManager creates a JWT manager.
func NewJWTManager(secret string, ttl time.Duration) *JWTManager {
	return &JWTManager{secret: []byte(secret), ttl: ttl, now: time.Now}
}

// Issue creates a signed token for the given user.
func (m *JWTManager) Issue(userID int64, role string) (string, error) {
	now := m.now()
	claims := Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
			Issuer:    "tourism-is",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

// Parse validates the token signature and expiry and returns its claims.
func (m *JWTManager) Parse(token string) (*Claims, error) {
	claims := &Claims{}
	t, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	}, jwt.WithTimeFunc(m.now), jwt.WithIssuer("tourism-is"))
	if err != nil || !t.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

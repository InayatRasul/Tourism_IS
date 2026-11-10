// Package user contains the User model and its persistence.
package user

import (
	"errors"
	"time"
)

// Roles (spec §3).
const (
	RoleTourist       = "tourist"
	RoleGuide         = "guide"
	RoleAgencyManager = "agency_manager"
	RoleAdmin         = "admin"
)

// Errors returned by the repository.
var (
	ErrNotFound   = errors.New("user not found")
	ErrEmailTaken = errors.New("email already registered")
)

// User is the full user record including the password hash.
type User struct {
	ID           int64
	Email        string
	PasswordHash string
	FullName     string
	Phone        string
	Role         string
	IsBlocked    bool
	CreatedAt    time.Time
}

// Public is the user representation safe to return from the API.
type Public struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// Public converts a User to its API representation (no password hash).
func (u User) Public() Public {
	return Public{ID: u.ID, Email: u.Email, FullName: u.FullName,
		Phone: u.Phone, Role: u.Role, CreatedAt: u.CreatedAt}
}

// Package auth implements registration, login, JWT issuing and role middleware.
package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"tourism-is/backend/internal/platform/httpx"
	"tourism-is/backend/internal/user"
)

// Auth-specific API errors.
var (
	ErrInvalidCredentials = httpx.NewError(http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
	ErrAccountBlocked     = httpx.NewError(http.StatusForbidden, "ACCOUNT_BLOCKED", "This account has been blocked")
	ErrEmailTaken         = httpx.NewError(http.StatusConflict, "EMAIL_TAKEN", "An account with this email already exists")
	ErrUnauthorized       = httpx.NewError(http.StatusUnauthorized, httpx.CodeUnauthorized, "Authentication required")
	ErrForbidden          = httpx.NewError(http.StatusForbidden, httpx.CodeForbidden, "You do not have access to this resource")
)

// UserStore is the persistence the auth service needs (implemented by user.Repository).
type UserStore interface {
	Create(ctx context.Context, u user.User) (user.User, error)
	FindByEmail(ctx context.Context, email string) (user.User, error)
	FindByID(ctx context.Context, id int64) (user.User, error)
}

// Result is returned by register and login.
type Result struct {
	Token string      `json:"token"`
	User  user.Public `json:"user"`
}

// Service contains the authentication business logic.
type Service struct {
	users      UserStore
	jwt        *JWTManager
	bcryptCost int
}

// NewService creates an auth service.
func NewService(users UserStore, jwt *JWTManager) *Service {
	return &Service{users: users, jwt: jwt, bcryptCost: bcrypt.DefaultCost}
}

// Register validates input, hashes the password and creates the user.
func (s *Service) Register(ctx context.Context, in RegisterInput) (Result, error) {
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		return Result{}, httpx.ValidationError(errs)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), s.bcryptCost)
	if err != nil {
		return Result{}, err
	}
	u, err := s.users.Create(ctx, user.User{
		Email: in.Email, PasswordHash: string(hash), FullName: in.FullName, Phone: in.Phone, Role: in.Role,
	})
	if errors.Is(err, user.ErrEmailTaken) {
		return Result{}, ErrEmailTaken
	}
	if err != nil {
		return Result{}, err
	}
	return s.issue(u)
}

// Login checks credentials and returns a token.
func (s *Service) Login(ctx context.Context, in LoginInput) (Result, error) {
	login := strings.ToLower(strings.TrimSpace(in.Email))
	if login == "" || in.Password == "" {
		return Result{}, ErrInvalidCredentials
	}
	u, err := s.users.FindByEmail(ctx, login)
	if errors.Is(err, user.ErrNotFound) {
		return Result{}, ErrInvalidCredentials
	}
	if err != nil {
		return Result{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)) != nil {
		return Result{}, ErrInvalidCredentials
	}
	if u.IsBlocked {
		return Result{}, ErrAccountBlocked
	}
	return s.issue(u)
}

// Me returns the current user, rejecting blocked or deleted accounts.
func (s *Service) Me(ctx context.Context, id int64) (user.Public, error) {
	u, err := s.users.FindByID(ctx, id)
	if errors.Is(err, user.ErrNotFound) {
		return user.Public{}, ErrUnauthorized
	}
	if err != nil {
		return user.Public{}, err
	}
	if u.IsBlocked {
		return user.Public{}, ErrAccountBlocked
	}
	return u.Public(), nil
}

func (s *Service) issue(u user.User) (Result, error) {
	tok, err := s.jwt.Issue(u.ID, u.Role)
	if err != nil {
		return Result{}, err
	}
	return Result{Token: tok, User: u.Public()}, nil
}

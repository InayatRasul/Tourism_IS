package auth

import (
	"net/mail"
	"regexp"
	"strings"
	"unicode"

	"tourism-is/backend/internal/user"
)

var phoneRe = regexp.MustCompile(`^\+?[0-9]{10,15}$`)

// RegisterInput is the payload for POST /auth/register.
type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

// LoginInput is the payload for POST /auth/login. "email" also accepts a
// plain login such as "admin" (seeded admin account).
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Normalize trims whitespace and lowercases the email.
func (in *RegisterInput) Normalize() {
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.FullName = strings.TrimSpace(in.FullName)
	in.Phone = strings.ReplaceAll(strings.TrimSpace(in.Phone), " ", "")
	in.Role = strings.TrimSpace(in.Role)
}

// Validate returns per-field error messages; an empty map means valid.
func (in RegisterInput) Validate() map[string]string {
	errs := map[string]string{}
	if a, err := mail.ParseAddress(in.Email); err != nil || a.Address != in.Email || len(in.Email) > 254 {
		errs["email"] = "Enter a valid email address"
	}
	if msg := ValidatePassword(in.Password); msg != "" {
		errs["password"] = msg
	}
	if n := len([]rune(in.FullName)); n < 2 || n > 100 {
		errs["full_name"] = "Full name must be 2–100 characters"
	}
	if !phoneRe.MatchString(in.Phone) {
		errs["phone"] = "Phone must be 10–15 digits, optionally starting with +"
	}
	switch in.Role {
	case user.RoleTourist, user.RoleGuide, user.RoleAgencyManager:
	default:
		errs["role"] = "Role must be tourist, guide or agency_manager"
	}
	return errs
}

// ValidatePassword enforces: 8–72 chars, at least one letter and one digit.
func ValidatePassword(pw string) string {
	if len(pw) < 8 || len(pw) > 72 {
		return "Password must be 8–72 characters"
	}
	var letter, digit bool
	for _, r := range pw {
		switch {
		case unicode.IsLetter(r):
			letter = true
		case unicode.IsDigit(r):
			digit = true
		}
	}
	if !letter || !digit {
		return "Password must contain at least one letter and one digit"
	}
	return ""
}

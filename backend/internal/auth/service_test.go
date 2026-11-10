package auth

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"tourism-is/backend/internal/user"
)

// fakeStore is an in-memory UserStore for tests.
type fakeStore struct {
	byEmail map[string]user.User
	nextID  int64
}

func newFakeStore() *fakeStore { return &fakeStore{byEmail: map[string]user.User{}} }

func (f *fakeStore) Create(_ context.Context, u user.User) (user.User, error) {
	if _, ok := f.byEmail[strings.ToLower(u.Email)]; ok {
		return user.User{}, user.ErrEmailTaken
	}
	f.nextID++
	u.ID = f.nextID
	u.CreatedAt = time.Now()
	f.byEmail[strings.ToLower(u.Email)] = u
	return u, nil
}

func (f *fakeStore) FindByEmail(_ context.Context, email string) (user.User, error) {
	u, ok := f.byEmail[strings.ToLower(email)]
	if !ok {
		return user.User{}, user.ErrNotFound
	}
	return u, nil
}

func (f *fakeStore) FindByID(_ context.Context, id int64) (user.User, error) {
	for _, u := range f.byEmail {
		if u.ID == id {
			return u, nil
		}
	}
	return user.User{}, user.ErrNotFound
}

func newTestService() (*Service, *fakeStore) {
	st := newFakeStore()
	svc := NewService(st, NewJWTManager("test-secret", time.Hour))
	svc.bcryptCost = bcrypt.MinCost
	return svc, st
}

func validInput() RegisterInput {
	return RegisterInput{Email: "Alice@Example.com", Password: "secret123",
		FullName: "Alice Doe", Phone: "+77011234567", Role: "tourist"}
}

func TestRegisterAndLogin(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()

	res, err := svc.Register(ctx, validInput())
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if res.Token == "" || res.User.Email != "alice@example.com" {
		t.Fatalf("unexpected result: %+v", res)
	}

	if _, err := svc.Login(ctx, LoginInput{Email: "ALICE@example.com", Password: "secret123"}); err != nil {
		t.Fatalf("login: %v", err)
	}

	me, err := svc.Me(ctx, res.User.ID)
	if err != nil || me.ID != res.User.ID {
		t.Fatalf("me: %v %+v", err, me)
	}
}

func TestRegisterDuplicateEmail(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	if _, err := svc.Register(ctx, validInput()); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Register(ctx, validInput()); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("want ErrEmailTaken, got %v", err)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	_, _ = svc.Register(ctx, validInput())
	if _, err := svc.Login(ctx, LoginInput{Email: "alice@example.com", Password: "wrong1234"}); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("want ErrInvalidCredentials, got %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "nobody@example.com", Password: "secret123"}); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("want ErrInvalidCredentials for unknown user, got %v", err)
	}
}

func TestLoginBlocked(t *testing.T) {
	svc, st := newTestService()
	ctx := context.Background()
	_, _ = svc.Register(ctx, validInput())
	u := st.byEmail["alice@example.com"]
	u.IsBlocked = true
	st.byEmail["alice@example.com"] = u
	if _, err := svc.Login(ctx, LoginInput{Email: "alice@example.com", Password: "secret123"}); !errors.Is(err, ErrAccountBlocked) {
		t.Fatalf("want ErrAccountBlocked, got %v", err)
	}
}

func TestRegisterValidation(t *testing.T) {
	cases := map[string]func(*RegisterInput){
		"email":     func(in *RegisterInput) { in.Email = "not-an-email" },
		"password":  func(in *RegisterInput) { in.Password = "short1" },
		"full_name": func(in *RegisterInput) { in.FullName = "A" },
		"phone":     func(in *RegisterInput) { in.Phone = "12ab" },
		"role":      func(in *RegisterInput) { in.Role = "admin" },
	}
	for field, mutate := range cases {
		in := validInput()
		mutate(&in)
		in.Normalize()
		errs := in.Validate()
		if _, ok := errs[field]; !ok {
			t.Errorf("%s: expected validation error, got %v", field, errs)
		}
	}
	in := validInput()
	in.Normalize()
	if errs := in.Validate(); len(errs) != 0 {
		t.Errorf("valid input rejected: %v", errs)
	}
}

func TestValidatePassword(t *testing.T) {
	for pw, ok := range map[string]bool{
		"abcdefgh": false, "12345678": false, "abc1234": false, "abcd1234": true, "Passw0rd!": true,
	} {
		if got := ValidatePassword(pw) == ""; got != ok {
			t.Errorf("%q: got valid=%v want %v", pw, got, ok)
		}
	}
}

func TestJWT(t *testing.T) {
	m := NewJWTManager("secret", time.Minute)
	tok, err := m.Issue(42, "guide")
	if err != nil {
		t.Fatal(err)
	}
	c, err := m.Parse(tok)
	if err != nil {
		t.Fatal(err)
	}
	if id, _ := c.UserID(); id != 42 || c.Role != "guide" {
		t.Fatalf("bad claims: %+v", c)
	}
	if _, err := NewJWTManager("other", time.Minute).Parse(tok); err == nil {
		t.Fatal("token with wrong secret accepted")
	}
	expired := NewJWTManager("secret", time.Minute)
	expired.now = func() time.Time { return time.Now().Add(-time.Hour) }
	old, _ := expired.Issue(1, "tourist")
	if _, err := m.Parse(old); err == nil {
		t.Fatal("expired token accepted")
	}
}

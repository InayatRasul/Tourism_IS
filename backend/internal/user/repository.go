package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository persists users in PostgreSQL.
type Repository struct{ pool *pgxpool.Pool }

// NewRepository creates a user repository.
func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

const selectCols = `id, email, password_hash, full_name, phone, role, is_blocked, created_at`

func scan(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone, &u.Role, &u.IsBlocked, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

// Create inserts a new user and returns it with ID and timestamps filled.
func (r *Repository) Create(ctx context.Context, u User) (User, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, full_name, phone, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+selectCols,
		u.Email, u.PasswordHash, u.FullName, u.Phone, u.Role)
	created, err := scan(row)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrEmailTaken
	}
	return created, err
}

// FindByEmail looks a user up by case-insensitive email/login.
func (r *Repository) FindByEmail(ctx context.Context, email string) (User, error) {
	return scan(r.pool.QueryRow(ctx,
		`SELECT `+selectCols+` FROM users WHERE lower(email) = lower($1)`, email))
}

// FindByID looks a user up by primary key.
func (r *Repository) FindByID(ctx context.Context, id int64) (User, error) {
	return scan(r.pool.QueryRow(ctx, `SELECT `+selectCols+` FROM users WHERE id = $1`, id))
}

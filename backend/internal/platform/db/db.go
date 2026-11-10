// Package db provides the PostgreSQL connection pool and transaction helpers.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a pgx pool with short connect timeouts so that a dead
// database results in a fast failure instead of a hanging request (NFR-02).
func Connect(ctx context.Context, url string, timeout time.Duration) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse db url: %w", err)
	}
	cfg.ConnConfig.ConnectTimeout = timeout
	cfg.MaxConns = 20
	cfg.HealthCheckPeriod = 10 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	return pool, nil
}

// WaitReady pings the database until it answers or attempts are exhausted.
func WaitReady(ctx context.Context, pool *pgxpool.Pool, attempts int, timeout time.Duration) error {
	var err error
	for i := 0; i < attempts; i++ {
		pctx, cancel := context.WithTimeout(ctx, timeout)
		err = pool.Ping(pctx)
		cancel()
		if err == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("database not ready: %w", err)
}

// WithTx runs fn inside a transaction, committing on success and rolling back on error.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

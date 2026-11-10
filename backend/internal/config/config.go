// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config holds all runtime configuration for the API.
type Config struct {
	AppEnv      string
	HTTPPort    string
	DatabaseURL string
	JWTSecret   string
	JWTTTL      time.Duration
	DBTimeout   time.Duration
	CORSOrigins []string
}

// IsDev reports whether the app runs in development mode (enables seeding).
func (c Config) IsDev() bool { return c.AppEnv == "dev" }

// Load reads configuration from the environment, applying defaults.
func Load() (Config, error) {
	c := Config{
		AppEnv:      getenv("APP_ENV", "dev"),
		HTTPPort:    getenv("HTTP_PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		CORSOrigins: splitCSV(getenv("CORS_ORIGINS", "http://localhost:5173")),
	}
	var err error
	if c.JWTTTL, err = time.ParseDuration(getenv("JWT_TTL", "24h")); err != nil {
		return c, fmt.Errorf("JWT_TTL: %w", err)
	}
	if c.DBTimeout, err = time.ParseDuration(getenv("DB_TIMEOUT", "2s")); err != nil {
		return c, fmt.Errorf("DB_TIMEOUT: %w", err)
	}
	if c.DatabaseURL == "" {
		return c, fmt.Errorf("DATABASE_URL is required")
	}
	if c.JWTSecret == "" {
		return c, fmt.Errorf("JWT_SECRET is required")
	}
	return c, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func splitCSV(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

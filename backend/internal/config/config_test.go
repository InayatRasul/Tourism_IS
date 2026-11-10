package config

import (
	"reflect"
	"testing"
	"time"
)

func setBaseEnv(t *testing.T) {
	t.Helper()
	for _, k := range []string{"APP_ENV", "HTTP_PORT", "JWT_TTL", "DB_TIMEOUT", "CORS_ORIGINS"} {
		t.Setenv(k, "")
	}
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("JWT_SECRET", "s3cret")
}

func TestLoadDefaults(t *testing.T) {
	setBaseEnv(t)
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.AppEnv != "dev" || !c.IsDev() || c.HTTPPort != "8080" {
		t.Fatalf("unexpected defaults: %+v", c)
	}
	if c.JWTTTL != 24*time.Hour || c.DBTimeout != 2*time.Second {
		t.Fatalf("durations: ttl=%v timeout=%v", c.JWTTTL, c.DBTimeout)
	}
	if !reflect.DeepEqual(c.CORSOrigins, []string{"http://localhost:5173"}) {
		t.Fatalf("cors = %v", c.CORSOrigins)
	}
}

func TestLoadOverrides(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("APP_ENV", "prod")
	t.Setenv("JWT_TTL", "1h")
	t.Setenv("DB_TIMEOUT", "500ms")
	t.Setenv("CORS_ORIGINS", " http://a.kz , ,http://b.kz ")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.IsDev() {
		t.Fatal("prod must not be dev (dev seeding would run)")
	}
	if c.JWTTTL != time.Hour || c.DBTimeout != 500*time.Millisecond {
		t.Fatalf("durations: %v %v", c.JWTTTL, c.DBTimeout)
	}
	if !reflect.DeepEqual(c.CORSOrigins, []string{"http://a.kz", "http://b.kz"}) {
		t.Fatalf("cors = %v", c.CORSOrigins)
	}
}

func TestLoadErrors(t *testing.T) {
	cases := map[string]func(t *testing.T){
		"missing DATABASE_URL": func(t *testing.T) { t.Setenv("DATABASE_URL", "") },
		"missing JWT_SECRET":   func(t *testing.T) { t.Setenv("JWT_SECRET", "") },
		"bad JWT_TTL":          func(t *testing.T) { t.Setenv("JWT_TTL", "forever") },
		"bad DB_TIMEOUT":       func(t *testing.T) { t.Setenv("DB_TIMEOUT", "2 sec") },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			setBaseEnv(t)
			mutate(t)
			if _, err := Load(); err == nil {
				t.Fatal("expected error")
			}
		})
	}
}

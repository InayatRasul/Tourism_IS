package db

import "testing"

func TestToPgx5URL(t *testing.T) {
	cases := map[string]string{
		"postgres://u:p@h:5432/d?sslmode=disable": "pgx5://u:p@h:5432/d?sslmode=disable",
		"postgresql://u:p@h:5432/d":               "pgx5://u:p@h:5432/d",
		"pgx5://already":                          "pgx5://already",
		"":                                        "",
	}
	for in, want := range cases {
		if got := toPgx5URL(in); got != want {
			t.Errorf("toPgx5URL(%q) = %q, want %q", in, got, want)
		}
	}
}

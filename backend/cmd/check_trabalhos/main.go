package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func main() {
	db, _ := sql.Open("postgres", "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway")
	defer db.Close()
	rows, _ := db.Query("SELECT id, tier, nome, ganho_min, ganho_max, ganho_xp FROM cat_trabalhos WHERE tier='Série C' ORDER BY nivel_min")
	defer rows.Close()
	fmt.Println("=== SÉRIE C ===")
	for rows.Next() {
		var id, nome, tier string
		var gmin, gmax, xp int
		rows.Scan(&id, &tier, &nome, &gmin, &gmax, &xp)
		fmt.Printf("  %s | R$%d - R$%d | %d XP\n", nome, gmin, gmax, xp)
	}
}

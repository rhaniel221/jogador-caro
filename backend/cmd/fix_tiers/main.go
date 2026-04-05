package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	// Atualiza tiers nos trabalhos
	updates := map[string]string{
		"Copa do Brasil": "Copinha Nacional",
		"Libertadores":   "Continentão",
		"Champions":      "Liga dos Craques",
		"Seleção":        "Seleçoca",
		"Copa do Mundo":  "Mundialito",
		"Ballon d'Or":    "Bola de Ouro",
	}

	for old, novo := range updates {
		res, err := db.Exec("UPDATE cat_trabalhos SET tier=$1 WHERE tier=$2", novo, old)
		if err != nil {
			fmt.Printf("ERRO ao atualizar tier %s: %v\n", old, err)
			continue
		}
		n, _ := res.RowsAffected()
		fmt.Printf("  tier '%s' → '%s': %d trabalhos atualizados\n", old, novo, n)
	}

	// Atualiza nomes dos itens
	itemUpdates := []struct{ old, novo string }{
		{"Chuteira Nike Street", "Chuteira Raio Street"},
		{"Chuteira Adidas Copa", "Chuteira Listrada Copa"},
		{"Kit Neymar Edition", "Kit Joga Bonito"},
		{"Kit Messi Edition", "Kit El Pibe"},
		{"Kit Pelé Legend", "Kit Rei do Campo"},
		{"Bola Oficial FIFA", "Bola Oficial Pro"},
		{"Credencial FIFA", "Credencial Mundial"},
		{"Convite Ballon d'Or", "Convite Bola de Ouro"},
		{"Passe Copa do Brasil", "Passe Copinha Nacional"},
		{"Passe Libertadores", "Passe Continentão"},
		{"Passe Champions", "Passe Liga dos Craques"},
		{"Uniforme da Seleção", "Uniforme da Seleçoca"},
		{"Uniforme Seleção Sub-20", "Uniforme Seleçoca Sub-20"},
	}
	fmt.Println("\n=== ITENS ===")
	for _, u := range itemUpdates {
		res, _ := db.Exec("UPDATE cat_itens SET nome=$1 WHERE nome=$2", u.novo, u.old)
		n, _ := res.RowsAffected()
		if n > 0 {
			fmt.Printf("  '%s' → '%s'\n", u.old, u.novo)
		}
	}

	// Atualiza descrições com nomes antigos
	descUpdates := []struct{ old, novo string }{
		{"Champions League", "Liga dos Craques"},
		{"Seleção Brasileira", "Seleçoca"},
		{"Seleção Sub-23", "Seleçoca Sub-23"},
		{"Copa do Mundo", "Mundialito"},
		{"Copa do Brasil", "Copinha Nacional"},
		{"Libertadores", "Continentão"},
		{"Brasileirão", "Boleirão"},
	}
	fmt.Println("\n=== DESCRIÇÕES ===")
	tables := []struct{ table, col string }{
		{"cat_itens", "descricao"},
		{"cat_itens", "nome"},
		{"cat_trabalhos", "descricao"},
		{"cat_trabalhos", "nome"},
		{"quests", "nome"},
		{"quests", "descricao"},
		{"cat_itens_fama", "nome"},
		{"cat_itens_fama", "descricao"},
	}
	for _, u := range descUpdates {
		for _, t := range tables {
			q := fmt.Sprintf("UPDATE %s SET %s = REPLACE(%s, $1, $2) WHERE %s LIKE '%%' || $1 || '%%'", t.table, t.col, t.col, t.col)
			res, err := db.Exec(q, u.old, u.novo)
			if err != nil {
				continue
			}
			n, _ := res.RowsAffected()
			if n > 0 {
				fmt.Printf("  %s.%s: '%s' → '%s' (%d)\n", t.table, t.col, u.old, u.novo, n)
			}
		}
	}

	// Verifica resultado
	fmt.Println("\n=== TIERS ATUAIS ===")
	rows, _ := db.Query("SELECT DISTINCT tier FROM cat_trabalhos ORDER BY tier")
	defer rows.Close()
	for rows.Next() {
		var tier string
		rows.Scan(&tier)
		fmt.Printf("  %s\n", tier)
	}
}

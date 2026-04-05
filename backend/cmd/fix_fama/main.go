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

	// Mostra situação atual
	fmt.Println("=== ANTES ===")
	rows, _ := db.Query("SELECT id, nome, nivel, vitorias, derrotas, pontos_fama FROM jogadores ORDER BY pontos_fama DESC")
	defer rows.Close()
	for rows.Next() {
		var id, nivel, vitorias, derrotas, fama int
		var nome string
		rows.Scan(&id, &nome, &nivel, &vitorias, &derrotas, &fama)
		fmt.Printf("  %-20s LV%-3d  V:%d D:%d  Fama: %d\n", nome, nivel, vitorias, derrotas, fama)
	}

	// Recalcula: fama = vitorias * 5 - derrotas * 2 (mínimo 0)
	// Isso dá:
	//   100 vitórias, 50 derrotas = 400 fama (Desconhecido)
	//   200 vitórias, 80 derrotas = 840 fama (Promessa)
	//   500 vitórias, 150 derrotas = 2200 fama (Famoso)
	//   1000 vitórias, 300 derrotas = 4400 fama (Famoso)
	//   2000 vitórias, 500 derrotas = 9000 fama (Estrela)
	result, err := db.Exec(`UPDATE jogadores SET pontos_fama = GREATEST(0, vitorias * 5 - derrotas * 2)`)
	if err != nil {
		fmt.Println("ERRO:", err)
		return
	}
	affected, _ := result.RowsAffected()
	fmt.Printf("\n=== %d jogadores atualizados ===\n\n", affected)

	// Mostra resultado
	fmt.Println("=== DEPOIS ===")
	rows2, _ := db.Query("SELECT id, nome, nivel, vitorias, derrotas, pontos_fama FROM jogadores ORDER BY pontos_fama DESC")
	defer rows2.Close()
	for rows2.Next() {
		var id, nivel, vitorias, derrotas, fama int
		var nome string
		rows2.Scan(&id, &nome, &nivel, &vitorias, &derrotas, &fama)
		rank := "Desconhecido"
		switch {
		case fama >= 20000:
			rank = "Lenda Viva"
		case fama >= 10000:
			rank = "Ídolo"
		case fama >= 5000:
			rank = "Estrela"
		case fama >= 2000:
			rank = "Famoso"
		case fama >= 500:
			rank = "Promessa"
		}
		fmt.Printf("  %-20s LV%-3d  V:%d D:%d  Fama: %d [%s]\n", nome, nivel, vitorias, derrotas, fama, rank)
	}
}

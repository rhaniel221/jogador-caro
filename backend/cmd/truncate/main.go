package main

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway")
	if err != nil {
		fmt.Println("Erro:", err)
		return
	}
	defer db.Close()

	tables := []string{
		"trabalhos_bloqueados_hoje", "trabalhos_hoje", "progresso_missoes",
		"maestria_trabalhos", "inventario", "cooldown_item_jogador",
		"historico_combates", "tarefas_jogador", "forum_posts", "jogadores",
	}
	for _, t := range tables {
		db.Exec("TRUNCATE TABLE " + t + " CASCADE")
	}
	err = nil
	if err != nil {
		fmt.Println("Erro:", err)
		return
	}

	var count int
	db.QueryRow("SELECT COUNT(*) FROM jogadores").Scan(&count)
	fmt.Printf("Pronto! Jogadores restantes: %d\n", count)
}

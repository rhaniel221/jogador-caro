package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func main() {
	db, _ := sql.Open("postgres", "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway")
	defer db.Close()

	// Check itens 40+
	rows, _ := db.Query("SELECT id, nome, preco, raridade FROM cat_itens WHERE id >= 40 ORDER BY id")
	defer rows.Close()
	fmt.Println("=== ITENS ID >= 40 ===")
	for rows.Next() {
		var id, preco int
		var nome, raridade string
		rows.Scan(&id, &nome, &preco, &raridade)
		fmt.Printf("  ID=%d  %s  R$%d  [%s]\n", id, nome, preco, raridade)
	}

	// Check quests com item reward
	rows2, _ := db.Query("SELECT id, nome, nivel_min, nivel_max, recompensa_item_id FROM quests WHERE COALESCE(recompensa_item_id,0) > 0")
	defer rows2.Close()
	fmt.Println("\n=== QUESTS COM ITEM REWARD ===")
	for rows2.Next() {
		var nmin, nmax, itemid int
		var id, nome string
		rows2.Scan(&id, &nome, &nmin, &nmax, &itemid)
		fmt.Printf("  %s  '%s'  nv %d-%d  item=%d\n", id, nome, nmin, nmax, itemid)
	}

	// Check inventario
	rows3, _ := db.Query("SELECT jogador_id, item_id, quantidade FROM inventario WHERE item_id >= 40")
	defer rows3.Close()
	fmt.Println("\n=== INVENTARIO ITENS 40+ ===")
	count := 0
	for rows3.Next() {
		var jid, iid, qtd int
		rows3.Scan(&jid, &iid, &qtd)
		fmt.Printf("  jogador=%d  item=%d  qtd=%d\n", jid, iid, qtd)
		count++
	}
	if count == 0 {
		fmt.Println("  (nenhum)")
	}
}

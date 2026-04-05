package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway")
	if err != nil {
		fmt.Println("Erro:", err)
		return
	}
	defer db.Close()

	tabela := "desafios_1v1"
	if len(os.Args) > 1 {
		tabela = os.Args[1]
	}
	_, err = db.Exec("TRUNCATE TABLE " + tabela)
	if err != nil {
		fmt.Println("Erro:", err)
		return
	}
	fmt.Printf("Tabela %s limpa!\n", tabela)
}

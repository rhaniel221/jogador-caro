package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"joga-craque/db"
	"joga-craque/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgresql://postgres:PIjMraVbxuxVunoytDDRAYnhbCsCxyhy@interchange.proxy.rlwy.net:17983/railway"
	}

	// Inicializa a conexão e cria as tabelas importando a package db
	db.InitDB(connStr)

	// Rotas da API consumindo a package handlers
	http.HandleFunc("/api/login", handlers.Cors(handlers.HandleLogin))
	http.HandleFunc("/api/login/", handlers.Cors(handlers.HandleLogin))
	http.HandleFunc("/api/jogador/", handlers.Cors(handlers.HandleJogador))
	http.HandleFunc("/api/trabalhar", handlers.Cors(handlers.HandleTrabalhar))
	http.HandleFunc("/api/evento-trabalho/escolha", handlers.Cors(handlers.HandleEventoEscolha))
	http.HandleFunc("/api/inventario/", handlers.Cors(handlers.HandleInventario))
	http.HandleFunc("/api/comprar", handlers.Cors(handlers.HandleComprar))
	http.HandleFunc("/api/usar-item", handlers.Cors(handlers.HandleUsarItem))
	http.HandleFunc("/api/vender-item", handlers.Cors(handlers.HandleVenderItem))
	http.HandleFunc("/api/equipar", handlers.Cors(handlers.HandleEquipar))
	http.HandleFunc("/api/combate", handlers.Cors(handlers.HandleCombate))
	http.HandleFunc("/api/leaderboard", handlers.Cors(handlers.HandleLeaderboard))
	http.HandleFunc("/api/jogadores", handlers.Cors(handlers.HandleJogadores))
	http.HandleFunc("/api/itens", handlers.Cors(handlers.HandleItens))
	http.HandleFunc("/api/trabalhos", handlers.Cors(handlers.HandleTrabalhos))
	http.HandleFunc("/api/maestria/", handlers.Cors(handlers.HandleMaestria))
	http.HandleFunc("/api/progressao/hoje/", handlers.Cors(handlers.HandleProgressaoHoje))
	http.HandleFunc("/api/limitar-trabalho", handlers.Cors(handlers.HandleLimitarTrabalho))
	http.HandleFunc("/api/depositar", handlers.Cors(handlers.HandleDepositar))
	http.HandleFunc("/api/sacar", handlers.Cors(handlers.HandleSacar))
	http.HandleFunc("/api/combates/historico", handlers.Cors(handlers.HandleHistoricoCombates))
	http.HandleFunc("/api/recuperar-vitalidade", handlers.Cors(handlers.HandleRecuperarVitalidade))
	http.HandleFunc("/api/tratamento", handlers.Cors(handlers.HandleTratamento))
	http.HandleFunc("/api/loja-premium", handlers.Cors(handlers.HandleLojaPremium))
	http.HandleFunc("/api/comprar-premium", handlers.Cors(handlers.HandleComprarPremium))
	http.HandleFunc("/api/admin/moedas", handlers.Cors(handlers.HandleAdicionarMoedas))
	http.HandleFunc("/api/gastar-fama", handlers.Cors(handlers.HandleGastarFama))
	http.HandleFunc("/api/itens-fama", handlers.Cors(handlers.HandleItensFama))
	http.HandleFunc("/api/tasks/", handlers.Cors(handlers.HandleTasksDiarias))
	http.HandleFunc("/api/completar-task", handlers.Cors(handlers.HandleCompletarTask))
	http.HandleFunc("/api/foruns", handlers.Cors(handlers.HandleForuns))
	http.HandleFunc("/api/avatares", handlers.Cors(handlers.HandleAvatares))
	http.HandleFunc("/api/missoes/", handlers.Cors(handlers.HandleMissoes))
	http.HandleFunc("/api/missao/executar", handlers.Cors(handlers.HandleExecutarMissao))
	http.HandleFunc("/api/missao/pular", handlers.Cors(handlers.HandlePularMissao))
	http.HandleFunc("/api/tutorial-step", handlers.Cors(handlers.HandleTutorialStep))
	http.HandleFunc("/api/campinho/bonus", handlers.Cors(handlers.HandleCampinhoBonus))
	http.HandleFunc("/api/campinho/upgrade", handlers.Cors(handlers.HandleCampinhoUpgrade))
	http.HandleFunc("/api/campinho/", handlers.Cors(handlers.HandleCampinho))
	http.HandleFunc("/api/quests/resgatar", handlers.Cors(handlers.HandleResgatarQuest))
	http.HandleFunc("/api/quests/", handlers.Cors(handlers.HandleQuests))
	http.HandleFunc("/api/minigame/resultado", handlers.Cors(handlers.HandleMinigameResultado))
	http.HandleFunc("/api/minigame/ranking", handlers.Cors(handlers.HandleMinigameRanking))
	http.HandleFunc("/api/minigame/status/", handlers.Cors(handlers.HandleMinigameStatus))
	http.HandleFunc("/api/desafio-1v1/responder", handlers.Cors(handlers.HandleResponderDesafio1v1))
	http.HandleFunc("/api/desafio-1v1", handlers.Cors(handlers.HandleDesafio1v1))
	http.HandleFunc("/api/desafios-1v1/", handlers.Cors(handlers.HandleDesafios1v1Historico))
	http.HandleFunc("/api/perfil-publico/", handlers.Cors(handlers.HandlePerfilPublico))
	http.HandleFunc("/api/amizade/solicitar", handlers.Cors(handlers.HandleSolicitarAmizade))
	http.HandleFunc("/api/amizade/responder", handlers.Cors(handlers.HandleResponderAmizade))
	http.HandleFunc("/api/amizades/", handlers.Cors(handlers.HandleListarAmizades))
	http.HandleFunc("/api/perfil/config", handlers.Cors(handlers.HandlePerfilConfig))
	http.HandleFunc("/api/escolher-posicao", handlers.Cors(handlers.HandleEscolherPosicao))
	http.HandleFunc("/api/titulo/conceder", handlers.Cors(handlers.HandleConcederTitulo))
	http.HandleFunc("/api/streak/coletar", handlers.Cors(handlers.HandleStreakColetar))
	http.HandleFunc("/api/streak/", handlers.Cors(handlers.HandleStreak))
	http.HandleFunc("/api/skill-missions/progress", handlers.Cors(handlers.HandleSkillProgress))
	http.HandleFunc("/api/skill-missions/", handlers.Cors(handlers.HandleSkillMissions))
	http.HandleFunc("/api/weekly/", handlers.Cors(handlers.HandleWeeklyRanking))
	http.HandleFunc("/api/casa/comprar", handlers.Cors(handlers.HandleCasaComprar))
	http.HandleFunc("/api/casa/coletar", handlers.Cors(handlers.HandleCasaColetar))
	http.HandleFunc("/api/casa/", handlers.Cors(handlers.HandleCasa))
	http.HandleFunc("/api/eventos", handlers.Cors(handlers.HandleEventos))
	http.HandleFunc("/api/combined-missions/", handlers.Cors(handlers.HandleCombinedMissions))
	http.HandleFunc("/api/fama/coletar-patrocinio", handlers.Cors(handlers.HandleColetarPatrocinio))
	http.HandleFunc("/api/fama/decaimento", handlers.Cors(handlers.HandleFamaDecaimento))
	http.HandleFunc("/api/fama/", handlers.Cors(handlers.HandleFamaStatus))
	http.HandleFunc("/api/patrimonio/", handlers.Cors(handlers.HandlePatrimonio))
	http.HandleFunc("/api/cdb/investir", handlers.Cors(handlers.HandleCDBInvestir))
	http.HandleFunc("/api/cdb/resgatar", handlers.Cors(handlers.HandleCDBResgatar))
	http.HandleFunc("/api/cdb/", handlers.Cors(handlers.HandleCDB))
	http.HandleFunc("/api/admin/disparar-boletos", handlers.Cors(handlers.HandleAdminDispararBoletos))
	http.HandleFunc("/api/boletos/pagar", handlers.Cors(handlers.HandleBoletoPagar))
	http.HandleFunc("/api/boletos/historico/", handlers.Cors(handlers.HandleBoletoHistorico))
	http.HandleFunc("/api/boletos/verificar/", handlers.Cors(handlers.HandleBoletoVerificar))

	// Cron: decaimento de fama diário (roda às 08:05 horário SP)
	go func() {
		loc, _ := time.LoadLocation("America/Sao_Paulo")
		if loc == nil {
			loc = time.FixedZone("BRT", -3*60*60)
		}
		ultimoDecay := ""
		for {
			agora := time.Now().In(loc)
			hoje := agora.Format("2006-01-02")
			if agora.Hour() >= 8 && ultimoDecay != hoje {
				afetados := handlers.AplicarDecaimentoFama()
				log.Printf("[FAMA] Decaimento aplicado: %d jogadores afetados", afetados)
				ultimoDecay = hoje
			}
			time.Sleep(5 * time.Minute)
		}
	}()

	// Catch-all: serve o React SPA
	http.Handle("/", handlers.SpaHandler)

	fmt.Printf("Joga Craque rodando na porta %s!\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
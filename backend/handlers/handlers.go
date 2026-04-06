package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"joga-craque/db"
)

// ========================
// HANDLER DO REACT (SPA)
// ========================

type spaHandlerStruct struct {
	staticPath string
	indexPath  string
}

func (h spaHandlerStruct) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sucesso":  false,
			"mensagem": "Rota da API não encontrada no backend: " + r.URL.Path,
		})
		return
	}

	path := r.URL.Path
	if path == "/" {
		path = "/" + h.indexPath
	}

	fullPath := h.staticPath + path

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		http.ServeFile(w, r, h.staticPath+"/"+h.indexPath)
		return
	}

	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

// SpaHandler instanciado para o main.go
var SpaHandler = spaHandlerStruct{staticPath: "static/dist", indexPath: "index.html"}

// ========================
// HANDLERS DE API
// ========================

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, http.StatusMethodNotAllowed, "Método deve ser POST")
		return
	}

	var req struct {
		Nome string `json:"nome"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	nome := strings.TrimSpace(req.Nome)
	if len(nome) < 2 {
		ErrResp(w, 400, "Nome muito curto")
		return
	}

	var id int
	err := db.Conn.QueryRow("SELECT id FROM jogadores WHERE nome = $1", nome).Scan(&id)
	if err == sql.ErrNoRows {
		xpProx := calcularXPProximo(1)
		err = db.Conn.QueryRow(`
			INSERT INTO jogadores (nome, nivel, xp, xp_proximo, energia, energia_max, vitalidade, vitalidade_max,
			saude, saude_max, forca, velocidade, habilidade, dinheiro_mao, dinheiro_banco, pontos_fama, vitorias, derrotas, avatar, moedas)
			VALUES ($1, 1, 0, $2, 10, 10, 5, 5, 100, 100, 5, 5, 5, 10, 0, 0, 0, 0, 1, 1)
			RETURNING id`, nome, xpProx).Scan(&id)
		if err != nil {
			ErrResp(w, 500, "Erro ao criar jogador. Tente outro apelido.")
			return
		}
		codigo := db.GerarCodigoAmigo()
		db.Conn.Exec("UPDATE jogadores SET codigo_amigo=$1 WHERE id=$2", codigo, id)
	} else if err != nil {
		ErrResp(w, 500, "Erro ao buscar jogador")
		return
	}

	jogador, err := getJogador(id)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar dados")
		return
	}
	jogador.ProximaEnergiaEm = regenerarEnergia(jogador)
	jogador.ProximaVitalidadeEm = regenerarVitalidade(jogador)
	jogador.ProximaSaudeEm = regenerarSaude(jogador)
	jogador.ProximoConsumivelEm = calcularProximoConsumivel(id, jogador.CooldownPremium)
	jogador.ProximoEnergiaConsumivelEm = calcularProximoEnergiaConsumivel(id)
	JsonResp(w, 200, map[string]interface{}{"jogador_id": id, "jogador": jogador})
}

func HandleJogador(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/jogador/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	switch r.Method {
	case http.MethodGet:
		jogador, err := getJogador(id)
		if err == sql.ErrNoRows {
			ErrResp(w, 404, "Jogador não encontrado")
			return
		} else if err != nil {
			ErrResp(w, 500, "Erro ao buscar dados")
			return
		}
		// Registra login diário (proteção contra decaimento de fama)
		RegistrarLoginHoje(id)
		jogador.ProximaEnergiaEm = regenerarEnergia(jogador)
		jogador.ProximaVitalidadeEm = regenerarVitalidade(jogador)
		jogador.ProximaSaudeEm = regenerarSaude(jogador)
		jogador.ProximoConsumivelEm = calcularProximoConsumivel(id, jogador.CooldownPremium)
		jogador.ProximoEnergiaConsumivelEm = calcularProximoEnergiaConsumivel(id)
		JsonResp(w, 200, jogador)

	case http.MethodPost:
		var data struct {
			Avatar *int    `json:"avatar"`
			Nome   *string `json:"nome"`
		}
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			ErrResp(w, 400, "Dados inválidos")
			return
		}
		jogador, err := getJogador(id)
		if err != nil {
			ErrResp(w, 404, "Jogador não encontrado")
			return
		}
		if data.Avatar != nil {
			jogador.Avatar = *data.Avatar
		}
		if data.Nome != nil && len(strings.TrimSpace(*data.Nome)) >= 2 {
			jogador.Nome = strings.TrimSpace(*data.Nome)
		}
		if err := saveJogador(jogador); err != nil {
			ErrResp(w, 500, "Erro ao salvar")
			return
		}
		JsonResp(w, 200, jogador)
	}
}

func HandleTrabalhar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID  int    `json:"jogador_id"`
		TrabalhoID string `json:"trabalho_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonResp(w, 400, TrabalharResponse{Mensagem: "Dados inválidos"})
		return
	}

	trabalho := findTrabalhoByID(req.TrabalhoID)
	if trabalho == nil {
		JsonResp(w, 400, TrabalharResponse{Mensagem: "Trabalho não encontrado"})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		JsonResp(w, 404, TrabalharResponse{Mensagem: "Jogador não encontrado"})
		return
	}

	if jogador.Nivel < trabalho.NivelMin {
		JsonResp(w, 200, TrabalharResponse{Mensagem: fmt.Sprintf("Você precisa ser nível %d para este trabalho!", trabalho.NivelMin)})
		return
	}

	// Regenera energia antes de calcular (corrige dessincronização com o frontend)
	regenerarEnergia(jogador)

	// Bloqueio por saúde baixa (mínimo 30 para trabalhar)
	if jogador.Saude < 30 {
		JsonResp(w, 200, TrabalharResponse{Mensagem: fmt.Sprintf("Saúde muito baixa! (%d/30) Vá ao Perfil e faça tratamentos para se recuperar.", jogador.Saude)})
		return
	}

	// Calcula TUDO no backend (anti-cheat)
	custoEnergia := calcCustoEnergia(trabalho.Energia, jogador.Nivel, trabalho.Tier)
	ganhoMin, ganhoMax, ganhoXP := calcRecompensaTrabalho(trabalho, jogador.Nivel)

	if jogador.Energia < custoEnergia {
		JsonResp(w, 200, TrabalharResponse{Mensagem: fmt.Sprintf("Energia insuficiente! Precisa de %d de energia.", custoEnergia)})
		return
	}

	// Bloqueio de tier
	tierJogador := getTierDoJogador(jogador.Nivel)
	if !podeFazerTier(trabalho.Tier, tierJogador) {
		JsonResp(w, 200, TrabalharResponse{Mensagem: fmt.Sprintf("Você já evoluiu além do tier %s!", trabalho.Tier)})
		return
	}

	// A partir da Série C (nível 18+), é obrigatório ter casa alugada
	// A partir da Série B (nível 24+), é obrigatório ter casa média ou top
	if jogador.Nivel >= 18 {
		var tipoCasa string
		db.Conn.QueryRow("SELECT COALESCE(tipo,'') FROM casas WHERE jogador_id=$1", req.JogadorID).Scan(&tipoCasa)
		if tipoCasa == "" {
			JsonResp(w, 200, TrabalharResponse{
				Mensagem: "Você precisa alugar uma casa para trabalhar na Série C! Vá ao seu Perfil e escolha uma casa.",
			})
			return
		}
		if jogador.Nivel >= 24 && tipoCasa == "basica" {
			JsonResp(w, 200, TrabalharResponse{
				Mensagem: "A Série B exige uma casa melhor! Faça upgrade para Casa Média ou Casa Top no seu Perfil.",
			})
			return
		}
	}

	if trabalho.RequereItem > 0 && !temItem(req.JogadorID, trabalho.RequereItem) {
		item := findItemByID(trabalho.RequereItem)
		itemNome := "item necessário"
		if item != nil {
			itemNome = item.Nome
		}
		JsonResp(w, 200, TrabalharResponse{
			Mensagem:  fmt.Sprintf("Este trabalho requer: %s", itemNome),
			FaltaItem: item,
		})
		return
	}

	if ganhoMax < ganhoMin {
		ganhoMax = ganhoMin
	}
	ganho := ganhoMin + rand.Intn(ganhoMax-ganhoMin+1)

	// Redução por maestria: quanto mais fez o mesmo trabalho, menos rende
	// Piso de 40% — nunca trava completamente
	var maestriaAtual int
	db.Conn.QueryRow("SELECT vezes_feito FROM maestria_trabalhos WHERE jogador_id=$1 AND trabalho_id=$2",
		req.JogadorID, req.TrabalhoID).Scan(&maestriaAtual)
	fatorMaestria := calcFatorMaestria(maestriaAtual)
	ganhoXP = int(float64(ganhoXP) * fatorMaestria)
	ganho = int(float64(ganho) * fatorMaestria)
	if ganhoXP < 1 {
		ganhoXP = 1
	}
	if ganho < 1 {
		ganho = 1
	}

	// Registra trabalho de hoje e variedade
	cfg := getConfigProgressao()
	vezesHoje := registrarTrabalhoHoje(req.JogadorID, req.TrabalhoID)
	diferentesHoje := contarVariedadeHoje(req.JogadorID, trabalho.Tier)
	bonusVariedadeXP := calcularBonusVariedadeXP(diferentesHoje, ganhoXP, cfg)
	ganhoXP += bonusVariedadeXP

	// Eventos temporários: multiplicadores
	multXP := getMultiplicadorEvento("XP_TRABALHO")
	multDin := getMultiplicadorEvento("DINHEIRO_TRABALHO")
	ganhoXP = int(float64(ganhoXP) * multXP)
	ganho = int(float64(ganho) * multDin)

	// Bônus de XP pelo rank de fama
	famaRank := GetFamaRank(jogador.PontosFama)
	if famaRank.BonusXP > 0 {
		bonusFamaXP := int(float64(ganhoXP) * famaRank.BonusXP)
		ganhoXP += bonusFamaXP
	}

	jogador.Energia -= custoEnergia
	db.Conn.Exec("UPDATE jogadores SET energia_gasta_total = COALESCE(energia_gasta_total, 0) + $1 WHERE id=$2", custoEnergia, req.JogadorID)
	jogador.DinheiroMao += ganho
	jogador.XP += ganhoXP

	var vezesFeito int
	db.Conn.QueryRow(`
		INSERT INTO maestria_trabalhos (jogador_id, trabalho_id, vezes_feito)
		VALUES ($1, $2, 1)
		ON CONFLICT (jogador_id, trabalho_id)
		DO UPDATE SET vezes_feito = maestria_trabalhos.vezes_feito + 1
		RETURNING vezes_feito`,
		req.JogadorID, req.TrabalhoID).Scan(&vezesFeito)

	bonusMaestriaXP := verificarMaestriaTierBonus(req.JogadorID, trabalho.Tier, vezesFeito)
	jogador.XP += bonusMaestriaXP

	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		jogador.VitalidadeMax++
		jogador.Vitalidade = jogador.VitalidadeMax
		novoNivel = jogador.Nivel
		levelUp = true
	}
	jogador.Rank = getRank(jogador.Nivel)

	if err := saveJogador(jogador); err != nil {
		JsonResp(w, 500, TrabalharResponse{Mensagem: "Erro ao salvar"})
		return
	}

	atualizarProgressoTask(req.JogadorID, "trabalhos", 1)
	atualizarProgressoTask(req.JogadorID, "ganho_dinheiro", ganho)

	// Weekly ranking: XP
	registrarWeekly(req.JogadorID, "xp_ganho", ganhoXP)

	// Combined missions: TRABALHO
	updateCombinedProgress(req.JogadorID, "TRABALHO", 1)

	jogador.ProximaEnergiaEm = regenerarEnergia(jogador)

	mensagem := fmt.Sprintf("Você trabalhou e ganhou R$ %d e %d XP!", ganho, ganhoXP)
	if levelUp {
		mensagem += fmt.Sprintf(" LEVEL UP! Agora você é nível %d!", novoNivel)
	}

	// Eventos aleatórios de trabalho (nível 10+)
	evento, _ := GerarEventoTrabalho(jogador, ganho, ganhoXP)

	JsonResp(w, 200, TrabalharResponse{
		Sucesso: true, Mensagem: mensagem, Ganhou: ganho,
		GanhouXP: ganhoXP, LevelUp: levelUp, NovoNivel: novoNivel, Jogador: jogador,
		BonusMaestria: bonusMaestriaXP, BonusTier: trabalho.Tier,
		BonusVariedadeXP: bonusVariedadeXP,
		VezesHoje: vezesHoje, DiferentesHoje: diferentesHoje,
		Evento: evento,
	})
}

// POST /api/evento-trabalho/escolha
func HandleEventoEscolha(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int    `json:"jogador_id"`
		EventoID  string `json:"evento_id"`
		OpcaoID   string `json:"opcao_id"`
		GanhoDin  int    `json:"ganho_din"`
		GanhoXP   int    `json:"ganho_xp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	resultado := AplicarEventoTrabalho(jogador, req.EventoID, req.OpcaoID, req.GanhoDin, req.GanhoXP)

	// Level up check
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		jogador.VitalidadeMax++
		jogador.Vitalidade = jogador.VitalidadeMax
		novoNivel = jogador.Nivel
		levelUp = true
	}

	saveJogador(jogador)

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":   true,
		"resultado": resultado,
		"jogador":   jogador,
		"level_up":  levelUp,
		"novo_nivel": novoNivel,
	})
}

func HandleInventario(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/inventario/")
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	rows, err := db.Conn.Query("SELECT item_id, quantidade, equipado FROM inventario WHERE jogador_id=$1 ORDER BY item_id", jogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar inventário")
		return
	}
	defer rows.Close()

	var itens []InventarioItem
	for rows.Next() {
		var inv InventarioItem
		rows.Scan(&inv.ItemID, &inv.Quantidade, &inv.Equipado)
		item := findItemByID(inv.ItemID)
		inv.Item = item
		if item != nil && item.RecuperaEnergia > 0 {
			inv.ProximoEm = calcularProximoItemEnergia(jogadorID, inv.ItemID)
		}
		itens = append(itens, inv)
	}
	if itens == nil {
		itens = []InventarioItem{}
	}
	JsonResp(w, 200, itens)
}

func HandleComprar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		ItemID    int `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	item := findItemByID(req.ItemID)
	if item == nil {
		ErrResp(w, 400, "Item não encontrado")
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if item.NivelMin > 0 && jogador.Nivel < item.NivelMin {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": fmt.Sprintf("Você precisa ser nível %d para comprar %s!", item.NivelMin, item.Nome),
		})
		return
	}
	if item.Tipo == "equipamento" && temItem(req.JogadorID, req.ItemID) {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": "Você já possui este equipamento!",
		})
		return
	}
	if item.Tipo == "mochila" {
		if item.SlotsMochila <= jogador.CapacidadeMochila {
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Sua mochila já tem %d slots! Esta não é uma melhoria.", jogador.CapacidadeMochila),
			})
			return
		}
		if jogador.DinheiroMao < item.Preco {
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Dinheiro insuficiente! Você tem R$ %d mas precisa de R$ %d.", jogador.DinheiroMao, item.Preco),
			})
			return
		}
		jogador.DinheiroMao -= item.Preco
		jogador.CapacidadeMochila = item.SlotsMochila
		saveJogador(jogador)
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  true,
			"mensagem": fmt.Sprintf("Comprou %s! Mochila expandida para %d tipos de itens.", item.Nome, item.SlotsMochila),
			"jogador":  jogador,
		})
		return
	}

	var slotsUsados int
	db.Conn.QueryRow("SELECT COUNT(DISTINCT item_id) FROM inventario WHERE jogador_id=$1 AND quantidade > 0 AND equipado = FALSE", req.JogadorID).Scan(&slotsUsados)
	if slotsUsados >= jogador.CapacidadeMochila && !temItem(req.JogadorID, req.ItemID) {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": fmt.Sprintf("Mochila cheia! (%d/%d slots). Compre uma mochila maior ou use/venda itens.", slotsUsados, jogador.CapacidadeMochila),
		})
		return
	}
	if item.PrecoMoedas > 0 {
		if jogador.Moedas < item.PrecoMoedas {
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Moedas insuficientes! Você tem %d mas precisa de %d moedas.", jogador.Moedas, item.PrecoMoedas),
			})
			return
		}
		jogador.Moedas -= item.PrecoMoedas
	} else {
		if jogador.DinheiroMao < item.Preco {
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Dinheiro insuficiente! Você tem R$ %d mas precisa de R$ %d.", jogador.DinheiroMao, item.Preco),
			})
			return
		}
		jogador.DinheiroMao -= item.Preco
	}
	db.Conn.Exec(`
		INSERT INTO inventario (jogador_id, item_id, quantidade, equipado)
		VALUES ($1, $2, 1, false)
		ON CONFLICT (jogador_id, item_id)
		DO UPDATE SET quantidade = inventario.quantidade + 1`,
		req.JogadorID, req.ItemID)

	saveJogador(jogador)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Comprou %s por R$ %d!", item.Nome, item.Preco),
		"jogador":  jogador,
	})
}

func HandleUsarItem(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		ItemID    int `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	item := findItemByID(req.ItemID)
	if item == nil || item.Tipo != "consumivel" {
		ErrResp(w, 400, "Item inválido ou não é consumível")
		return
	}

	var qtd int
	db.Conn.QueryRow("SELECT quantidade FROM inventario WHERE jogador_id=$1 AND item_id=$2", req.JogadorID, req.ItemID).Scan(&qtd)
	if qtd <= 0 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você não tem este item!"})
		return
	}

	{
		j, err := getJogador(req.JogadorID)
		if err == nil && item.NivelMin > 0 && j.Nivel < item.NivelMin {
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Você precisa ser nível %d para usar %s!", item.NivelMin, item.Nome),
			})
			return
		}
	}

	isEnergiaItem := item.RecuperaEnergia > 0

	if isEnergiaItem {
		var usadoEm time.Time
		db.Conn.QueryRow("SELECT usado_em FROM cooldown_item_jogador WHERE jogador_id=$1 AND item_id=$2",
			req.JogadorID, req.ItemID).Scan(&usadoEm)
		if !usadoEm.IsZero() && item.CooldownMinutos > 0 {
			cooldownRestante := time.Until(usadoEm.Add(time.Duration(item.CooldownMinutos) * time.Minute))
			if cooldownRestante > 0 {
				minutos := int(cooldownRestante.Minutes())
				segundos := int(cooldownRestante.Seconds()) % 60
				JsonResp(w, 200, map[string]interface{}{
					"sucesso":  false,
					"mensagem": fmt.Sprintf("Aguarde %d:%02d para comer %s novamente!", minutos, segundos, item.Nome),
				})
				return
			}
		}
	} else {
		var ultimoConsumivelUsado time.Time
		var cooldownPremium bool
		db.Conn.QueryRow("SELECT ultimo_consumivel_usado, cooldown_premium FROM jogadores WHERE id=$1", req.JogadorID).Scan(&ultimoConsumivelUsado, &cooldownPremium)
		cooldownDur := 10 * time.Minute
		if cooldownPremium {
			cooldownDur = 5 * time.Minute
		}
		cooldownRestante := time.Until(ultimoConsumivelUsado.Add(cooldownDur))
		if cooldownRestante > 0 {
			minutos := int(cooldownRestante.Minutes())
			segundos := int(cooldownRestante.Seconds()) % 60
			JsonResp(w, 200, map[string]interface{}{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Aguarde %d:%02d para usar outro item de saúde!", minutos, segundos),
			})
			return
		}
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	jogador.Energia = clampInt(jogador.Energia+item.RecuperaEnergia, 0, jogador.EnergiaMax)
	jogador.Saude = clampInt(jogador.Saude+item.RecuperaSaude, 0, jogador.SaudeMax)

	db.Conn.Exec("UPDATE inventario SET quantidade = quantidade - 1 WHERE jogador_id=$1 AND item_id=$2", req.JogadorID, req.ItemID)
	db.Conn.Exec("DELETE FROM inventario WHERE jogador_id=$1 AND item_id=$2 AND quantidade <= 0", req.JogadorID, req.ItemID)

	if isEnergiaItem {
		db.Conn.Exec(`INSERT INTO cooldown_item_jogador (jogador_id, item_id, usado_em)
			VALUES ($1, $2, NOW())
			ON CONFLICT (jogador_id, item_id) DO UPDATE SET usado_em=NOW()`,
			req.JogadorID, req.ItemID)
	} else {
		db.Conn.Exec("UPDATE jogadores SET ultimo_consumivel_usado=NOW() WHERE id=$1", req.JogadorID)
	}

	saveJogador(jogador)

	var cooldownPremium bool
	db.Conn.QueryRow("SELECT cooldown_premium FROM jogadores WHERE id=$1", req.JogadorID).Scan(&cooldownPremium)
	jogador.ProximoConsumivelEm = calcularProximoConsumivel(req.JogadorID, cooldownPremium)
	jogador.ProximoEnergiaConsumivelEm = calcularProximoEnergiaConsumivel(req.JogadorID)

	msg := ""
	if item.RecuperaEnergia > 0 && item.RecuperaSaude > 0 {
		msg = fmt.Sprintf("Usou %s! +%d Energia, +%d Saúde", item.Nome, item.RecuperaEnergia, item.RecuperaSaude)
	} else if item.RecuperaEnergia > 0 {
		msg = fmt.Sprintf("Comeu %s! +%d Energia", item.Nome, item.RecuperaEnergia)
	} else {
		msg = fmt.Sprintf("Usou %s! +%d Saúde", item.Nome, item.RecuperaSaude)
	}
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": msg,
		"jogador":  jogador,
	})
}

func HandleVenderItem(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		ItemID    int `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	// Verifica se tem o item
	var qtd int
	var equipado bool
	err := db.Conn.QueryRow("SELECT quantidade, equipado FROM inventario WHERE jogador_id=$1 AND item_id=$2",
		req.JogadorID, req.ItemID).Scan(&qtd, &equipado)
	if err != nil || qtd <= 0 {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Você não tem esse item."})
		return
	}
	if equipado {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Desequipe o item antes de vender!"})
		return
	}

	item := findItemByID(req.ItemID)
	if item == nil {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Item não encontrado."})
		return
	}

	// Valor de venda: 70% do preço (-30%). Itens de missão (preço 0) valem 1
	valorVenda := item.Preco * 70 / 100
	if valorVenda < 1 {
		valorVenda = 1
	}

	// Remove 1 do inventário
	if qtd <= 1 {
		db.Conn.Exec("DELETE FROM inventario WHERE jogador_id=$1 AND item_id=$2", req.JogadorID, req.ItemID)
	} else {
		db.Conn.Exec("UPDATE inventario SET quantidade=quantidade-1 WHERE jogador_id=$1 AND item_id=$2", req.JogadorID, req.ItemID)
	}

	// Dá o dinheiro
	db.Conn.Exec("UPDATE jogadores SET dinheiro_mao=dinheiro_mao+$1 WHERE id=$2", valorVenda, req.JogadorID)

	jogador, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]any{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Vendeu %s por R$ %d!", item.Nome, valorVenda),
		"jogador":  jogador,
	})
}

func HandleEquipar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int  `json:"jogador_id"`
		ItemID    int  `json:"item_id"`
		Equipar   bool `json:"equipar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	item := findItemByID(req.ItemID)
	if item == nil || item.Tipo != "equipamento" {
		ErrResp(w, 400, "Item não pode ser equipado")
		return
	}

	var qtd int
	var equipado bool
	err := db.Conn.QueryRow("SELECT quantidade, equipado FROM inventario WHERE jogador_id=$1 AND item_id=$2", req.JogadorID, req.ItemID).Scan(&qtd, &equipado)
	if err != nil || qtd <= 0 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você não tem este item!"})
		return
	}
	if req.Equipar == equipado {
		msg := "Já está equipado!"
		if !req.Equipar {
			msg = "Já está desequipado!"
		}
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": msg})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	mult := 1
	if !req.Equipar {
		mult = -1
	}

	jogador.Forca = clampInt(jogador.Forca+item.BonusForca*mult, 1, 9999)
	jogador.Velocidade = clampInt(jogador.Velocidade+item.BonusVelocidade*mult, 1, 9999)
	jogador.Habilidade = clampInt(jogador.Habilidade+item.BonusHabilidade*mult, 1, 9999)
	// SaudeMax fixo em 100 para todos — itens não alteram mais
	jogador.SaudeMax = 100
	jogador.EnergiaMax = clampInt(jogador.EnergiaMax+item.BonusEnergiaMax*mult, 5, 9999)
	jogador.VitalidadeMax = clampInt(jogador.VitalidadeMax+item.BonusVitMax*mult, 1, 99)

	db.Conn.Exec("UPDATE inventario SET equipado=$1 WHERE jogador_id=$2 AND item_id=$3", req.Equipar, req.JogadorID, req.ItemID)
	saveJogador(jogador)

	msg := fmt.Sprintf("Equipou: %s!", item.Nome)
	if !req.Equipar {
		msg = fmt.Sprintf("Desequipou: %s!", item.Nome)
	}
	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "mensagem": msg, "jogador": jogador})
}

func HandleCombate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AtacanteID int `json:"atacante_id"`
		DefensorID int `json:"defensor_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	atacante, err := getJogador(req.AtacanteID)
	if err != nil {
		ErrResp(w, 404, "Atacante não encontrado")
		return
	}

	if atacante.Nivel < 10 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: "O Estádio libera no nível 10! Continue trabalhando."})
		return
	}

	defensor, err := getJogador(req.DefensorID)
	if err != nil {
		ErrResp(w, 404, "Defensor não encontrado")
		return
	}

	if atacante.Vitalidade <= 0 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: "Sem vitalidade para lutar! Recupere-se primeiro."})
		return
	}
	if atacante.Saude < 10 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: "Saúde muito baixa para lutar! Vá ao Perfil e faça tratamentos para se recuperar."})
		return
	}

	// Não pode desafiar jogadores muito desnivelados (máx 5 níveis de diferença)
	difNivel := atacante.Nivel - defensor.Nivel
	if difNivel < 0 {
		difNivel = -difNivel
	}
	if difNivel > 5 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: fmt.Sprintf("Desafio injusto! Diferença de %d níveis. Máximo permitido: 5.", difNivel)})
		return
	}

	// Não pode desafiar jogadores com força muito diferente (máx 2x)
	forcaAtk := atacante.Forca + atacante.Velocidade + atacante.Habilidade
	forcaDef := defensor.Forca + defensor.Velocidade + defensor.Habilidade
	if forcaDef > 0 && forcaAtk > forcaDef*2 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: "Adversário muito fraco! Procure alguém do seu nível."})
		return
	}
	if forcaAtk > 0 && forcaDef > forcaAtk*2 {
		JsonResp(w, 200, CombateResult{Sucesso: false, Mensagem: "Adversário muito forte! Fique mais forte antes de desafiá-lo."})
		return
	}

	// Cálculo de poder com chance mínima de 10% pro mais fraco
	// O underdog recebe um bônus proporcional à diferença
	poderBase := func(f, v, h int) int { return f*2 + v + h }
	baseAtk := poderBase(atacante.Forca, atacante.Velocidade, atacante.Habilidade)
	baseDef := poderBase(defensor.Forca, defensor.Velocidade, defensor.Habilidade)

	// Aleatoriedade base
	randAtk := rand.Intn(20) + 1
	randDef := rand.Intn(20) + 1

	// Se o atacante é mais fraco, dá bônus de "underdog" (mínimo 10% de chance)
	// Sorte do underdog: 10% de chance de multiplicar o poder por 2.5x
	if baseAtk < baseDef && rand.Intn(100) < 10 {
		randAtk += baseDef // golpe de sorte!
	}
	if baseDef < baseAtk && rand.Intn(100) < 10 {
		randDef += baseAtk
	}

	poderAtacante := baseAtk + randAtk
	poderDefensor := baseDef + randDef

	atacante.Vitalidade--

	var vencedorID int
	var mensagem string

	// Eventos temporários: multiplicadores PVP
	multXPPvp := getMultiplicadorEvento("XP_PVP")
	multFamaPvp := getMultiplicadorEvento("FAMA_PVP")

	if poderAtacante > poderDefensor {
		// Vitória: atacante perde pouca saúde (desgaste), defensor perde bastante
		vencedorID = atacante.ID
		atacante.Vitorias++
		defensor.Derrotas++
		xpPvp := int(float64(2) * multXPPvp)
		famaPvp := int(float64(10) * multFamaPvp)
		atacante.XP += xpPvp
		atacante.PontosFama += famaPvp
		perdaSaudeVencedor := 2 + rand.Intn(4) // 2-5 desgaste da luta
		perdaSaudePerdedor := 5 + rand.Intn(6) // 5-10 por perder
		atacante.Saude = clampInt(atacante.Saude-perdaSaudeVencedor, 0, atacante.SaudeMax)
		defensor.Saude = clampInt(defensor.Saude-perdaSaudePerdedor, 0, defensor.SaudeMax)
		mensagem = fmt.Sprintf("VITÓRIA! Você venceu %s! +2 XP, +10 Fama! (-%d Saúde do desgaste)", defensor.Nome, perdaSaudeVencedor)

		// PVP streak: increment on win
		atacante.PvpStreak++
		defensor.PvpStreak = 0

		// Weekly ranking: PVP win
		registrarWeekly(atacante.ID, "vitorias_pvp", 1)

		// Skill missions: PVP streak
		updateSkillProgress(atacante.ID, "VITORIA_PVP_STREAK", atacante.PvpStreak)
	} else {
		// Derrota: atacante perde bastante saúde, defensor perde pouco
		vencedorID = defensor.ID
		atacante.Derrotas++
		defensor.Vitorias++
		defensor.PontosFama += 5
		perdaSaudeAtacante := 6 + rand.Intn(8) // 6-13 por perder
		perdaSaudeDefensor := 1 + rand.Intn(3) // 1-3 desgaste leve
		atacante.PontosFama = clampInt(atacante.PontosFama-25, 0, 999999)
		atacante.Saude = clampInt(atacante.Saude-perdaSaudeAtacante, 0, atacante.SaudeMax)
		defensor.Saude = clampInt(defensor.Saude-perdaSaudeDefensor, 0, defensor.SaudeMax)
		mensagem = fmt.Sprintf("DERROTA! %s foi mais forte. -25 Fama, -%d Saúde.", defensor.Nome, perdaSaudeAtacante)

		// PVP streak: reset on loss
		atacante.PvpStreak = 0
	}

	// Registra atividade PvP de ambos (proteção contra decaimento de fama)
	RegistrarPvpHoje(atacante.ID)
	RegistrarPvpHoje(defensor.ID)

	// Level up check após XP de combate
	levelUp := false
	novoNivel := atacante.Nivel
	for atacante.XP >= atacante.XPProximo {
		atacante.XP -= atacante.XPProximo
		atacante.Nivel++
		atacante.XPProximo = calcularXPProximo(atacante.Nivel)
		atacante.EnergiaMax = calcEnergiaMaxBase(atacante.Nivel)
		atacante.Energia = atacante.EnergiaMax
		atacante.Forca++
		atacante.Velocidade++
		atacante.Habilidade++
		levelUp = true
		novoNivel = atacante.Nivel
	}
	_ = levelUp
	_ = novoNivel

	db.Conn.Exec(`INSERT INTO combates (atacante_id, defensor_id, vencedor_id, dinheiro_roubado) VALUES ($1,$2,$3,$4)`,
		atacante.ID, defensor.ID, vencedorID, 0)

	saveJogador(atacante)
	saveJogador(defensor)

	atualizarProgressoTask(atacante.ID, "combates", 1)

	// Combined missions: PVP_WIN (only on win)
	if vencedorID == atacante.ID {
		updateCombinedProgress(atacante.ID, "PVP_WIN", 1)
	}

	atualizado, _ := getJogador(atacante.ID)
	JsonResp(w, 200, CombateResult{
		Sucesso: true, VencedorID: vencedorID, AtacanteID: atacante.ID, DefensorID: defensor.ID,
		DinheiroRoubado: 0, PoderAtacante: poderAtacante, PoderDefensor: poderDefensor,
		Mensagem: mensagem, Jogador: atualizado,
	})
}

func HandleLeaderboard(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`
		SELECT id, nome, nivel, xp, pontos_fama, vitorias, derrotas, dinheiro_mao as riqueza, titulo
		FROM jogadores ORDER BY nivel DESC, pontos_fama DESC, xp DESC LIMIT 50`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar leaderboard")
		return
	}
	defer rows.Close()

	type Entry struct {
		ID       int    `json:"id"`
		Nome     string `json:"nome"`
		Nivel    int    `json:"nivel"`
		XP       int    `json:"xp"`
		Fama     int    `json:"pontos_fama"`
		Vitorias int    `json:"vitorias"`
		Derrotas int    `json:"derrotas"`
		Riqueza  int    `json:"riqueza"`
		Titulo   string `json:"titulo"`
	}
	var lista []Entry
	for rows.Next() {
		var e Entry
		rows.Scan(&e.ID, &e.Nome, &e.Nivel, &e.XP, &e.Fama, &e.Vitorias, &e.Derrotas, &e.Riqueza, &e.Titulo)
		lista = append(lista, e)
	}
	if lista == nil {
		lista = []Entry{}
	}
	JsonResp(w, 200, lista)
}

func HandleJogadores(w http.ResponseWriter, r *http.Request) {
	excludeID, _ := strconv.Atoi(r.URL.Query().Get("excluir"))
	rows, err := db.Conn.Query(`
		SELECT id, nome, nivel, forca, velocidade, habilidade, vitorias, derrotas, pontos_fama, dinheiro_mao
		FROM jogadores WHERE id != $1 ORDER BY nivel DESC, pontos_fama DESC LIMIT 20`, excludeID)
	if err != nil {
		ErrResp(w, 500, "Erro")
		return
	}
	defer rows.Close()

	type Resumo struct {
		ID          int    `json:"id"`
		Nome        string `json:"nome"`
		Nivel       int    `json:"nivel"`
		Forca       int    `json:"forca"`
		Velocidade  int    `json:"velocidade"`
		Habilidade  int    `json:"habilidade"`
		Vitorias    int    `json:"vitorias"`
		Derrotas    int    `json:"derrotas"`
		Fama        int    `json:"pontos_fama"`
		DinheiroMao int    `json:"dinheiro_mao"`
	}
	var lista []Resumo
	for rows.Next() {
		var j Resumo
		rows.Scan(&j.ID, &j.Nome, &j.Nivel, &j.Forca, &j.Velocidade, &j.Habilidade, &j.Vitorias, &j.Derrotas, &j.Fama, &j.DinheiroMao)
		lista = append(lista, j)
	}
	if lista == nil {
		lista = []Resumo{}
	}
	JsonResp(w, 200, lista)
}

func HandleItens(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`SELECT id, nome, descricao, preco, COALESCE(preco_moedas, 0), tipo, icone, COALESCE(raridade, 'comum'), nivel_min, nivel_max,
		bonus_forca, bonus_velocidade, bonus_habilidade, bonus_saude_max, bonus_energia_max,
		bonus_vit_max, recupera_energia, recupera_saude, slots_mochila, cooldown_minutos FROM cat_itens ORDER BY preco`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar itens")
		return
	}
	defer rows.Close()
	itens := []Item{}
	for rows.Next() {
		var item Item
		rows.Scan(&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.PrecoMoedas, &item.Tipo, &item.Icone,
			&item.Raridade, &item.NivelMin, &item.NivelMax, &item.BonusForca, &item.BonusVelocidade,
			&item.BonusHabilidade, &item.BonusSaudeMax, &item.BonusEnergiaMax,
			&item.BonusVitMax, &item.RecuperaEnergia, &item.RecuperaSaude, &item.SlotsMochila,
			&item.CooldownMinutos)
		itens = append(itens, item)
	}
	JsonResp(w, 200, itens)
}

func HandleTrabalhos(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`SELECT id, nome, tier, nivel_min, energia, ganho_min, ganho_max, ganho_xp, requer_item, icone, limite_diario FROM cat_trabalhos ORDER BY nivel_min`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar trabalhos")
		return
	}
	defer rows.Close()
	trabalhos := []Trabalho{}
	for rows.Next() {
		var t Trabalho
		rows.Scan(&t.ID, &t.Nome, &t.Tier, &t.NivelMin, &t.Energia, &t.GanhoMin, &t.GanhoMax, &t.GanhoXP, &t.RequereItem, &t.Icone, &t.LimiteDiario)
		trabalhos = append(trabalhos, t)
	}
	JsonResp(w, 200, trabalhos)
}

func HandleMaestria(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/maestria/")
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}
	rows, err := db.Conn.Query("SELECT trabalho_id, vezes_feito FROM maestria_trabalhos WHERE jogador_id=$1", jogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro")
		return
	}
	defer rows.Close()
	maestria := make(map[string]int)
	for rows.Next() {
		var tid string
		var vezes int
		rows.Scan(&tid, &vezes)
		maestria[tid] = vezes
	}
	JsonResp(w, 200, maestria)
}

func HandleProgressaoHoje(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/progressao/hoje/")
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	hoje := hojeJogo()

	rows, err := db.Conn.Query(
		"SELECT trabalho_id, vezes FROM trabalhos_hoje WHERE jogador_id=$1 AND data=$2",
		jogadorID, hoje)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar progressão")
		return
	}
	defer rows.Close()

	mapa := make(map[string]int)
	for rows.Next() {
		var tid string
		var vezes int
		rows.Scan(&tid, &vezes)
		mapa[tid] = vezes
	}

	cfg := getConfigProgressao()
	diferentesPorTier := contarVariedadePorTier(jogadorID)

	bloqueados := listarBloqueadosHoje(jogadorID)
	if bloqueados == nil {
		bloqueados = []string{}
	}

	JsonResp(w, 200, ProgressaoHoje{
		TrabalhosHoje:     mapa,
		DiferentesPorTier: diferentesPorTier,
		Config:            cfg,
		BloqueadosHoje:    bloqueados,
	})
}

func HandleLimitarTrabalho(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID  int    `json:"jogador_id"`
		TrabalhoID string `json:"trabalho_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	bloquearTrabalhoHoje(req.JogadorID, req.TrabalhoID)
	JsonResp(w, 200, map[string]any{"sucesso": true, "mensagem": "Trabalho bloqueado por hoje."})
}

func HandleDepositar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		Valor     int `json:"valor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if req.Valor <= 0 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Valor inválido"})
		return
	}
	if req.Valor > jogador.DinheiroMao {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Dinheiro insuficiente na mão!"})
		return
	}
	taxa := req.Valor / 10
	depositado := req.Valor - taxa
	jogador.DinheiroMao -= req.Valor
	jogador.DinheiroBanco += depositado
	saveJogador(jogador)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Depositou R$ %d (taxa de R$ %d cobrada pelo banqueiro)", depositado, taxa),
		"jogador":  jogador,
	})
}

func HandleSacar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		Valor     int `json:"valor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if req.Valor <= 0 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Valor inválido"})
		return
	}
	if req.Valor > jogador.DinheiroBanco {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Saldo insuficiente no banco!"})
		return
	}
	jogador.DinheiroBanco -= req.Valor
	jogador.DinheiroMao += req.Valor
	saveJogador(jogador)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Sacou R$ %d com sucesso!", req.Valor),
		"jogador":  jogador,
	})
}

func HandleHistoricoCombates(w http.ResponseWriter, r *http.Request) {
	jogadorID, err := strconv.Atoi(r.URL.Query().Get("jogador_id"))
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}
	rows, err := db.Conn.Query(`
		SELECT c.id, c.atacante_id, a.nome, c.defensor_id, d.nome,
		       c.vencedor_id, c.dinheiro_roubado, c.criado_em
		FROM combates c
		JOIN jogadores a ON a.id = c.atacante_id
		JOIN jogadores d ON d.id = c.defensor_id
		WHERE c.atacante_id=$1 OR c.defensor_id=$1
		ORDER BY c.criado_em DESC LIMIT 15`, jogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro")
		return
	}
	defer rows.Close()

	type Historico struct {
		ID              int    `json:"id"`
		AtacanteID      int    `json:"atacante_id"`
		AtacanteNome    string `json:"atacante_nome"`
		DefensorID      int    `json:"defensor_id"`
		DefensorNome    string `json:"defensor_nome"`
		VencedorID      int    `json:"vencedor_id"`
		DinheiroRoubado int    `json:"dinheiro_roubado"`
		Data            string `json:"data"`
	}
	var lista []Historico
	for rows.Next() {
		var c Historico
		var t time.Time
		rows.Scan(&c.ID, &c.AtacanteID, &c.AtacanteNome, &c.DefensorID, &c.DefensorNome, &c.VencedorID, &c.DinheiroRoubado, &t)
		c.Data = t.Format("02/01 15:04")
		lista = append(lista, c)
	}
	if lista == nil {
		lista = []Historico{}
	}
	JsonResp(w, 200, lista)
}

func HandleRecuperarVitalidade(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	custo := 100 * jogador.Nivel
	if jogador.DinheiroMao < custo {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": fmt.Sprintf("Precisa de R$ %d para se recuperar!", custo),
		})
		return
	}
	jogador.DinheiroMao -= custo
	jogador.Vitalidade = jogador.VitalidadeMax
	jogador.SaudeMax = 100
	jogador.Saude = 100
	saveJogador(jogador)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Você se recuperou totalmente por R$ %d!", custo),
		"jogador":  jogador,
	})
}

// POST /api/tratamento
func HandleTratamento(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID    int    `json:"jogador_id"`
		TratamentoID string `json:"tratamento_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	type TratamentoInfo struct {
		Custo      int
		Saude      int
		Vitalidade int
		Forca      int
		Energia    int
		Mensagem   string
	}

	tratamentos := map[string]TratamentoInfo{
		"academia": {
			Custo: 80 * jogador.Nivel, Saude: 10 + jogador.Nivel/3,
			Forca: 1, Vitalidade: 15 + jogador.Nivel/5,
			Mensagem: "Malhou pesado! Saúde, força e vitalidade recuperadas!",
		},
		"psicologo": {
			Custo: 60 * jogador.Nivel, Saude: 20 + jogador.Nivel/2,
			Vitalidade: 10 + jogador.Nivel/5,
			Mensagem: "Sessão de terapia! Mente renovada, saúde restaurada!",
		},
		"fisioterapia": {
			Custo: 100 * jogador.Nivel, Saude: 15 + jogador.Nivel/3,
			Vitalidade: 20 + jogador.Nivel/4, Energia: 5 + jogador.Nivel/10,
			Mensagem: "Fisioterapia completa! Corpo recuperado e pronto pra jogar!",
		},
		"nutricao": {
			Custo: 50 * jogador.Nivel, Saude: 8 + jogador.Nivel/4,
			Vitalidade: 12 + jogador.Nivel/5, Energia: 3 + jogador.Nivel/15,
			Mensagem: "Dieta balanceada! Seu corpo agradece!",
		},
		"spa": {
			Custo: 150 * jogador.Nivel, Saude: 25 + jogador.Nivel/2,
			Vitalidade: 25 + jogador.Nivel/3, Energia: 8 + jogador.Nivel/8,
			Mensagem: "Dia de spa completo! Relaxou e renovou todas as energias!",
		},
		"meditacao": {
			Custo: 30 * jogador.Nivel, Saude: 5 + jogador.Nivel/5,
			Vitalidade: 20 + jogador.Nivel/4,
			Mensagem: "Meditação profunda! Mente limpa, vitalidade renovada!",
		},
	}

	t, ok := tratamentos[req.TratamentoID]
	if !ok {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Tratamento não encontrado."})
		return
	}

	if jogador.DinheiroMao < t.Custo {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": fmt.Sprintf("Precisa de R$ %s para este tratamento!", fmt.Sprintf("%d", t.Custo)),
		})
		return
	}

	jogador.DinheiroMao -= t.Custo
	jogador.SaudeMax = 100
	jogador.Saude += t.Saude
	if jogador.Saude > 100 {
		jogador.Saude = 100
	}
	jogador.Vitalidade += t.Vitalidade
	if jogador.Vitalidade > jogador.VitalidadeMax {
		jogador.Vitalidade = jogador.VitalidadeMax
	}
	if t.Forca > 0 {
		jogador.Forca += t.Forca
	}
	if t.Energia > 0 {
		jogador.Energia += t.Energia
		if jogador.Energia > jogador.EnergiaMax {
			jogador.Energia = jogador.EnergiaMax
		}
	}

	saveJogador(jogador)

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": t.Mensagem,
		"jogador":  jogador,
		"ganhos": map[string]int{
			"saude":      t.Saude,
			"vitalidade": t.Vitalidade,
			"forca":      t.Forca,
			"energia":    t.Energia,
		},
	})
}

func HandleLojaPremium(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`SELECT id, nome, descricao, preco, tipo, icone, avatar_id, titulo_val, mochila_slots FROM cat_itens_premium ORDER BY preco`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar loja premium")
		return
	}
	defer rows.Close()
	itens := []ItemPremium{}
	for rows.Next() {
		var item ItemPremium
		rows.Scan(&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.Tipo, &item.Icone, &item.AvatarID, &item.TituloVal, &item.MochilaSlots)
		itens = append(itens, item)
	}
	JsonResp(w, 200, itens)
}

func HandleComprarPremium(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		ItemID    int `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	item := findItemPremiumByID(req.ItemID)
	if item == nil {
		ErrResp(w, 400, "Item não encontrado")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	if jogador.Moedas < item.Preco {
		JsonResp(w, 200, map[string]interface{}{
			"sucesso":  false,
			"mensagem": fmt.Sprintf("Moedas insuficientes! Você tem %d mas precisa de %d moedas.", jogador.Moedas, item.Preco),
		})
		return
	}

	switch item.Tipo {
	case "avatar":
		for _, part := range strings.Split(jogador.AvataresPremium, ",") {
			if part == strconv.Itoa(item.AvatarID) {
				JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você já possui este avatar!"})
				return
			}
		}
	case "titulo":
		if jogador.Titulo == item.TituloVal {
			JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você já possui este título!"})
			return
		}
	case "mochila_vip":
		if jogador.CapacidadeMochila >= item.MochilaSlots {
			JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Sua mochila já tem capacidade igual ou maior!"})
			return
		}
	case "perk_cooldown":
		if jogador.CooldownPremium {
			JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você já possui o cooldown premium!"})
			return
		}
	}

	jogador.Moedas -= item.Preco

	switch item.Tipo {
	case "avatar":
		base := strings.Trim(jogador.AvataresPremium, ",")
		if base == "" {
			jogador.AvataresPremium = strconv.Itoa(item.AvatarID)
		} else {
			jogador.AvataresPremium = base + "," + strconv.Itoa(item.AvatarID)
		}
		jogador.Avatar = item.AvatarID
	case "titulo":
		jogador.Titulo = item.TituloVal
	case "mochila_vip":
		jogador.CapacidadeMochila = item.MochilaSlots
	case "perk_cooldown":
		jogador.CooldownPremium = true
	}

	if err := saveJogador(jogador); err != nil {
		ErrResp(w, 500, "Erro ao salvar")
		return
	}
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Comprou %s por %d moedas!", item.Nome, item.Preco),
		"jogador":  jogador,
	})
}

func HandleAdicionarMoedas(w http.ResponseWriter, r *http.Request) {
	adminKey := os.Getenv("ADMIN_KEY")
	if adminKey == "" {
		adminKey = "joga-craque-admin-2026"
	}
	var req struct {
		JogadorNome string `json:"jogador_nome"`
		Moedas      int    `json:"moedas"`
		Chave       string `json:"chave"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	if req.Chave != adminKey {
		ErrResp(w, 403, "Chave inválida")
		return
	}
	if req.Moedas <= 0 {
		ErrResp(w, 400, "Quantidade inválida")
		return
	}
	var id int
	err := db.Conn.QueryRow("SELECT id FROM jogadores WHERE nome = $1", req.JogadorNome).Scan(&id)
	if err == sql.ErrNoRows {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	} else if err != nil {
		ErrResp(w, 500, "Erro ao buscar jogador")
		return
	}
	db.Conn.Exec("UPDATE jogadores SET moedas = moedas + $1 WHERE id = $2", req.Moedas, id)
	jogador, _ := getJogador(id)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Adicionou %d moedas para %s! Total: %d moedas.", req.Moedas, req.JogadorNome, jogador.Moedas),
		"jogador":  jogador,
	})
}

func HandleGastarFama(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int    `json:"jogador_id"`
		ItemID    string `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	var itemFamaVal ItemFama
	err := db.Conn.QueryRow(`SELECT id, nome, descricao, preco, fama_ganha, icone, unico FROM cat_itens_fama WHERE id=$1`, req.ItemID).Scan(
		&itemFamaVal.ID, &itemFamaVal.Nome, &itemFamaVal.Descricao, &itemFamaVal.Preco, &itemFamaVal.FamaGanha, &itemFamaVal.Icone, &itemFamaVal.Unico)
	if err != nil {
		ErrResp(w, 400, "Item de fama não encontrado")
		return
	}
	item := &itemFamaVal
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if item.Unico && strings.Contains(jogador.ItensFama, item.ID) {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Você já possui este item!"})
		return
	}
	if jogador.DinheiroMao < item.Preco {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": fmt.Sprintf("Você precisa de R$ %d na mão!", item.Preco)})
		return
	}
	jogador.DinheiroMao -= item.Preco
	jogador.PontosFama += item.FamaGanha
	if item.Unico {
		if jogador.ItensFama == "" {
			jogador.ItensFama = item.ID
		} else {
			jogador.ItensFama += "," + item.ID
		}
	}
	saveJogador(jogador)
	JsonResp(w, 200, map[string]any{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("%s %s! +%d Fama", item.Icone, item.Nome, item.FamaGanha),
		"jogador":  jogador,
	})
}

func HandleTasksDiarias(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}
	hoje := hojeJogo()
	type TaskStatus struct {
		TaskDiaria
		Progresso  int  `json:"progresso"`
		Completada bool `json:"completada"`
	}
	var resultado []TaskStatus
	taskRows, err := db.Conn.Query(`SELECT id, nome, descricao, tipo, objetivo, recompensa_dinheiro, recompensa_xp, recompensa_fama, dificuldade FROM cat_tasks_diarias`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar tasks")
		return
	}
	defer taskRows.Close()
	for taskRows.Next() {
		var task TaskDiaria
		taskRows.Scan(&task.ID, &task.Nome, &task.Descricao, &task.Tipo, &task.Objetivo, &task.RecompensaDinheiro, &task.RecompensaXP, &task.RecompensaFama, &task.Dificuldade)
		var progresso int
		var completada bool
		db.Conn.QueryRow(`SELECT progresso, completada FROM tasks_progresso WHERE jogador_id=$1 AND task_id=$2 AND data=$3`,
			jogadorID, task.ID, hoje).Scan(&progresso, &completada)
		resultado = append(resultado, TaskStatus{task, progresso, completada})
	}
	JsonResp(w, 200, resultado)
}

func HandleCompletarTask(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int    `json:"jogador_id"`
		TaskID    string `json:"task_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	hoje := hojeJogo()
	var progresso int
	var completada bool
	var taskVal TaskDiaria
	err := db.Conn.QueryRow(`SELECT id, nome, descricao, tipo, objetivo, recompensa_dinheiro, recompensa_xp, recompensa_fama, dificuldade FROM cat_tasks_diarias WHERE id=$1`, req.TaskID).Scan(
		&taskVal.ID, &taskVal.Nome, &taskVal.Descricao, &taskVal.Tipo, &taskVal.Objetivo, &taskVal.RecompensaDinheiro, &taskVal.RecompensaXP, &taskVal.RecompensaFama, &taskVal.Dificuldade)
	if err != nil {
		ErrResp(w, 400, "Task não encontrada")
		return
	}
	task := &taskVal
	db.Conn.QueryRow(`SELECT progresso, completada FROM tasks_progresso WHERE jogador_id=$1 AND task_id=$2 AND data=$3`,
		req.JogadorID, req.TaskID, hoje).Scan(&progresso, &completada)
	if completada {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Recompensa já coletada hoje!"})
		return
	}
	if progresso < task.Objetivo {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": fmt.Sprintf("Progresso insuficiente: %d/%d", progresso, task.Objetivo)})
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	jogador.DinheiroMao += task.RecompensaDinheiro
	jogador.XP += task.RecompensaXP
	jogador.PontosFama += task.RecompensaFama
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		jogador.VitalidadeMax++
		jogador.Vitalidade = jogador.VitalidadeMax
		novoNivel = jogador.Nivel
		levelUp = true
	}
	jogador.Rank = getRank(jogador.Nivel)
	db.Conn.Exec(`UPDATE tasks_progresso SET completada=true WHERE jogador_id=$1 AND task_id=$2 AND data=$3`,
		req.JogadorID, req.TaskID, hoje)
	saveJogador(jogador)
	JsonResp(w, 200, map[string]any{
		"sucesso":    true,
		"mensagem":   fmt.Sprintf("🎉 Task concluída! +R$%d, +%dXP, +%d Fama", task.RecompensaDinheiro, task.RecompensaXP, task.RecompensaFama),
		"jogador":    jogador,
		"level_up":   levelUp,
		"novo_nivel": novoNivel,
	})
}

func HandleForuns(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		rows, err := db.Conn.Query(`
			SELECT f.id, j.nome, j.nivel, j.titulo, f.mensagem,
			       to_char(f.criado_em, 'DD/MM HH24:MI') as data
			FROM foruns f JOIN jogadores j ON f.jogador_id = j.id
			ORDER BY f.criado_em DESC LIMIT 50`)
		if err != nil {
			JsonResp(w, 200, []ForumPost{})
			return
		}
		defer rows.Close()
		var posts []ForumPost
		for rows.Next() {
			var p ForumPost
			rows.Scan(&p.ID, &p.Nome, &p.Nivel, &p.Titulo, &p.Mensagem, &p.Data)
			posts = append(posts, p)
		}
		if posts == nil {
			posts = []ForumPost{}
		}
		JsonResp(w, 200, posts)
		return
	}
	if r.Method == http.MethodPost {
		var req struct {
			JogadorID int    `json:"jogador_id"`
			Mensagem  string `json:"mensagem"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Mensagem == "" {
			ErrResp(w, 400, "Dados inválidos")
			return
		}
		if len(req.Mensagem) > 500 {
			req.Mensagem = req.Mensagem[:500]
		}
		db.Conn.Exec(`INSERT INTO foruns (jogador_id, mensagem) VALUES ($1, $2)`, req.JogadorID, req.Mensagem)
		JsonResp(w, 200, map[string]any{"sucesso": true})
		return
	}
	ErrResp(w, 405, "Método não permitido")
}

func HandleItensFama(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`SELECT id, nome, descricao, preco, fama_ganha, icone, unico FROM cat_itens_fama ORDER BY preco`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar itens fama")
		return
	}
	defer rows.Close()
	itens := []ItemFama{}
	for rows.Next() {
		var item ItemFama
		rows.Scan(&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.FamaGanha, &item.Icone, &item.Unico)
		itens = append(itens, item)
	}
	JsonResp(w, 200, itens)
}

func HandleAvatares(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Conn.Query(`SELECT id, icone, tipo FROM cat_avatares ORDER BY id`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar avatares")
		return
	}
	defer rows.Close()
	avatares := []AvatarInfo{}
	for rows.Next() {
		var av AvatarInfo
		rows.Scan(&av.ID, &av.Icone, &av.Tipo)
		avatares = append(avatares, av)
	}
	JsonResp(w, 200, avatares)
}

// ========================
// MISSÕES / HISTÓRIA
// ========================

func HandleMissoes(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/missoes/")
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	rows, err := db.Conn.Query(`SELECT id, fase, ordem, nome, descricao, icone, tipo,
		vezes_necessarias, tempo_minutos, custo_energia, recompensa_xp, recompensa_dinheiro,
		recompensa_moedas, nivel_libera, requer_missao, dialogo_inicio, dialogo_fim
		FROM missoes ORDER BY fase, ordem`)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar missões")
		return
	}
	defer rows.Close()

	var missoes []MissaoComProgresso
	for rows.Next() {
		var m MissaoComProgresso
		rows.Scan(&m.ID, &m.Fase, &m.Ordem, &m.Nome, &m.Descricao, &m.Icone, &m.Tipo,
			&m.VezesNecessarias, &m.TempoMinutos, &m.CustoEnergia, &m.RecompensaXP,
			&m.RecompensaDinheiro, &m.RecompensaMoedas, &m.NivelLibera, &m.RequerMissao,
			&m.DialogoInicio, &m.DialogoFim)
		missoes = append(missoes, m)
	}

	progressRows, err := db.Conn.Query(
		"SELECT missao_id, vezes_feitas, completada, COALESCE(EXTRACT(EPOCH FROM inicio_em)::BIGINT, 0) FROM progresso_missoes WHERE jogador_id=$1",
		jogadorID)
	if err == nil {
		defer progressRows.Close()
		progMap := map[string]ProgressoMissao{}
		for progressRows.Next() {
			var p ProgressoMissao
			progressRows.Scan(&p.MissaoID, &p.VezesFeitas, &p.Completada, &p.InicioEm)
			progMap[p.MissaoID] = p
		}
		completedSet := map[string]bool{}
		for id, p := range progMap {
			if p.Completada {
				completedSet[id] = true
			}
		}
		for i := range missoes {
			if p, ok := progMap[missoes[i].ID]; ok {
				missoes[i].VezesFeitas = p.VezesFeitas
				missoes[i].Completada = p.Completada
				missoes[i].InicioEm = p.InicioEm
			}
			if missoes[i].Completada {
				missoes[i].Status = "completada"
			} else if missoes[i].RequerMissao != "" && !completedSet[missoes[i].RequerMissao] {
				missoes[i].Status = "bloqueada"
			} else if missoes[i].Tipo == "timer" && missoes[i].InicioEm > 0 {
				elapsed := time.Now().Unix() - missoes[i].InicioEm
				if elapsed >= int64(missoes[i].TempoMinutos*60) {
					missoes[i].Status = "disponivel"
				} else {
					missoes[i].Status = "timer"
				}
			} else {
				missoes[i].Status = "disponivel"
			}
		}
	}

	JsonResp(w, 200, missoes)
}

func HandleExecutarMissao(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int    `json:"jogador_id"`
		MissaoID  string `json:"missao_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonResp(w, 400, MissaoResponse{Mensagem: "Dados inválidos"})
		return
	}

	var m Missao
	err := db.Conn.QueryRow(`SELECT id, fase, ordem, nome, descricao, icone, tipo,
		vezes_necessarias, tempo_minutos, custo_energia, recompensa_xp, recompensa_dinheiro,
		recompensa_moedas, nivel_libera, requer_missao, dialogo_inicio, dialogo_fim
		FROM missoes WHERE id=$1`, req.MissaoID).Scan(
		&m.ID, &m.Fase, &m.Ordem, &m.Nome, &m.Descricao, &m.Icone, &m.Tipo,
		&m.VezesNecessarias, &m.TempoMinutos, &m.CustoEnergia, &m.RecompensaXP,
		&m.RecompensaDinheiro, &m.RecompensaMoedas, &m.NivelLibera, &m.RequerMissao,
		&m.DialogoInicio, &m.DialogoFim)
	if err != nil {
		JsonResp(w, 400, MissaoResponse{Mensagem: "Missão não encontrada"})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		JsonResp(w, 404, MissaoResponse{Mensagem: "Jogador não encontrado"})
		return
	}

	// Check dependency
	if m.RequerMissao != "" {
		var completada bool
		db.Conn.QueryRow("SELECT completada FROM progresso_missoes WHERE jogador_id=$1 AND missao_id=$2",
			req.JogadorID, m.RequerMissao).Scan(&completada)
		if !completada {
			JsonResp(w, 200, MissaoResponse{Mensagem: "Complete a missão anterior primeiro!"})
			return
		}
	}

	// Check already completed
	var jaCompletada bool
	db.Conn.QueryRow("SELECT completada FROM progresso_missoes WHERE jogador_id=$1 AND missao_id=$2",
		req.JogadorID, req.MissaoID).Scan(&jaCompletada)
	if jaCompletada {
		JsonResp(w, 200, MissaoResponse{Mensagem: "Missão já completada!"})
		return
	}

	// Check energy
	if m.CustoEnergia > 0 && jogador.Energia < m.CustoEnergia {
		JsonResp(w, 200, MissaoResponse{Mensagem: fmt.Sprintf("Energia insuficiente! Precisa de %d.", m.CustoEnergia)})
		return
	}

	// Handle by type
	switch m.Tipo {
	case "timer":
		var inicioEm int64
		db.Conn.QueryRow(`SELECT COALESCE(EXTRACT(EPOCH FROM inicio_em)::BIGINT, 0)
			FROM progresso_missoes WHERE jogador_id=$1 AND missao_id=$2`,
			req.JogadorID, req.MissaoID).Scan(&inicioEm)

		if inicioEm == 0 {
			db.Conn.Exec(`INSERT INTO progresso_missoes (jogador_id, missao_id, vezes_feitas, completada, inicio_em)
				VALUES ($1, $2, 0, FALSE, NOW())
				ON CONFLICT (jogador_id, missao_id) DO UPDATE SET inicio_em = NOW()`,
				req.JogadorID, req.MissaoID)
			JsonResp(w, 200, MissaoResponse{
				Sucesso:  true,
				Mensagem: "Timer iniciado!",
				Dialogo:  m.DialogoFim,
			})
			return
		}

		elapsed := time.Now().Unix() - inicioEm
		if elapsed < int64(m.TempoMinutos*60) {
			restante := int64(m.TempoMinutos*60) - elapsed
			JsonResp(w, 200, MissaoResponse{
				Mensagem: fmt.Sprintf("Aguarde mais %d segundos...", restante),
			})
			return
		}
		// Timer done — falls through to completion below

	case "repetivel":
		if m.CustoEnergia > 0 {
			jogador.Energia -= m.CustoEnergia
		}
		var vezesFeitas int
		db.Conn.QueryRow(`INSERT INTO progresso_missoes (jogador_id, missao_id, vezes_feitas, completada)
			VALUES ($1, $2, 1, FALSE)
			ON CONFLICT (jogador_id, missao_id) DO UPDATE SET vezes_feitas = progresso_missoes.vezes_feitas + 1
			RETURNING vezes_feitas`,
			req.JogadorID, req.MissaoID).Scan(&vezesFeitas)

		jogador.DinheiroMao += m.RecompensaDinheiro
		jogador.XP += m.RecompensaXP

		completou := vezesFeitas >= m.VezesNecessarias
		if completou {
			db.Conn.Exec("UPDATE progresso_missoes SET completada=TRUE WHERE jogador_id=$1 AND missao_id=$2",
				req.JogadorID, req.MissaoID)
		}

		levelUp := false
		novoNivel := jogador.Nivel
		for jogador.XP >= jogador.XPProximo {
			jogador.XP -= jogador.XPProximo
			jogador.Nivel++
			jogador.XPProximo = calcularXPProximo(jogador.Nivel)
			jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
			jogador.Energia = jogador.EnergiaMax
			jogador.Forca++
			jogador.Velocidade++
			jogador.Habilidade++
			levelUp = true
			novoNivel = jogador.Nivel
		}

		db.Conn.Exec(`UPDATE jogadores SET energia=$1, saude=$2, xp=$3, nivel=$4, xp_proximo=$5,
			energia_max=$6, forca=$7, velocidade=$8, habilidade=$9,
			dinheiro_mao=$10, moedas=$11
			WHERE id=$12`,
			jogador.Energia, jogador.Saude, jogador.XP, jogador.Nivel, jogador.XPProximo,
			jogador.EnergiaMax, jogador.Forca, jogador.Velocidade, jogador.Habilidade,
			jogador.DinheiroMao, jogador.Moedas, req.JogadorID)

		mc := MissaoComProgresso{Missao: m, VezesFeitas: vezesFeitas, Completada: completou}
		if completou {
			mc.Status = "completada"
		} else {
			mc.Status = "em_andamento"
		}

		dialogo := ""
		if completou {
			dialogo = m.DialogoFim
		}

		JsonResp(w, 200, MissaoResponse{
			Sucesso:   true,
			Mensagem:  fmt.Sprintf("%dx/%dx", vezesFeitas, m.VezesNecessarias),
			Missao:    &mc,
			Jogador:   jogador,
			LevelUp:   levelUp,
			NovoNivel: novoNivel,
			Dialogo:   dialogo,
		})
		return

	case "instant":
		// falls through to completion below
	}

	// Complete mission (for instant and timer-done)
	db.Conn.Exec(`INSERT INTO progresso_missoes (jogador_id, missao_id, vezes_feitas, completada)
		VALUES ($1, $2, 1, TRUE)
		ON CONFLICT (jogador_id, missao_id) DO UPDATE SET vezes_feitas = 1, completada = TRUE`,
		req.JogadorID, req.MissaoID)

	jogador.XP += m.RecompensaXP
	jogador.DinheiroMao += m.RecompensaDinheiro
	jogador.Moedas += m.RecompensaMoedas

	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		levelUp = true
		novoNivel = jogador.Nivel
	}

	db.Conn.Exec(`UPDATE jogadores SET energia=$1, saude=$2, xp=$3, nivel=$4, xp_proximo=$5,
		energia_max=$6, forca=$7, velocidade=$8, habilidade=$9,
		dinheiro_mao=$10, moedas=$11
		WHERE id=$12`,
		jogador.Energia, jogador.Saude, jogador.XP, jogador.Nivel, jogador.XPProximo,
		jogador.EnergiaMax, jogador.Forca, jogador.Velocidade, jogador.Habilidade,
		jogador.DinheiroMao, jogador.Moedas, req.JogadorID)

	mc := MissaoComProgresso{Missao: m, VezesFeitas: 1, Completada: true, Status: "completada"}
	JsonResp(w, 200, MissaoResponse{
		Sucesso:   true,
		Mensagem:  "Missão concluída!",
		Missao:    &mc,
		Jogador:   jogador,
		LevelUp:   levelUp,
		NovoNivel: novoNivel,
		Dialogo:   m.DialogoFim,
	})
}

func HandlePularMissao(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int    `json:"jogador_id"`
		MissaoID  string `json:"missao_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonResp(w, 400, MissaoResponse{Mensagem: "Dados inválidos"})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		JsonResp(w, 404, MissaoResponse{Mensagem: "Jogador não encontrado"})
		return
	}
	if jogador.Moedas < 1 {
		JsonResp(w, 200, MissaoResponse{Mensagem: "Você precisa de 1 moeda Cash para pular!"})
		return
	}

	jogador.Moedas--
	db.Conn.Exec("UPDATE jogadores SET moedas=$1 WHERE id=$2", jogador.Moedas, req.JogadorID)
	db.Conn.Exec(`UPDATE progresso_missoes SET inicio_em = NOW() - INTERVAL '1 hour'
		WHERE jogador_id=$1 AND missao_id=$2`, req.JogadorID, req.MissaoID)

	JsonResp(w, 200, MissaoResponse{
		Sucesso:  true,
		Mensagem: "Tempo pulado! Agora pode concluir a missão.",
		Jogador:  jogador,
	})
}

func HandleTutorialStep(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		Step      int `json:"step"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	db.Conn.Exec("UPDATE jogadores SET tutorial_step=$1 WHERE id=$2", req.Step, req.JogadorID)
	JsonResp(w, 200, map[string]any{"sucesso": true})
}

// ========================
// CAMPINHO
// ========================

func getCampinhoNivel(nivel int) *CampinhoNivel {
	cn := &CampinhoNivel{Materiais: make(map[string]int)}
	err := db.Conn.QueryRow("SELECT nivel, nome, descricao, arte, bonus_xp_pct FROM campinho_niveis WHERE nivel=$1", nivel).
		Scan(&cn.Nivel, &cn.Nome, &cn.Descricao, &cn.Arte, &cn.BonusXPPct)
	if err != nil {
		return nil
	}
	rows, _ := db.Conn.Query("SELECT material, quantidade FROM campinho_materiais WHERE nivel=$1", nivel)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var mat string
			var qtd int
			rows.Scan(&mat, &qtd)
			cn.Materiais[mat] = qtd
		}
	}
	return cn
}

func HandleCampinho(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		ErrResp(w, 400, "ID inválido")
		return
	}
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	jogador, err := getJogador(jogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	// Get campinho level
	var nivelAtual int
	var ultimoBonus sql.NullString
	err = db.Conn.QueryRow("SELECT nivel, ultimo_bonus FROM campinho_jogador WHERE jogador_id=$1", jogadorID).
		Scan(&nivelAtual, &ultimoBonus)
	if err != nil {
		// Create default entry
		db.Conn.Exec("INSERT INTO campinho_jogador (jogador_id, nivel) VALUES ($1, 0) ON CONFLICT DO NOTHING", jogadorID)
		nivelAtual = 0
	}

	nivelInfo := getCampinhoNivel(nivelAtual)
	proximoNivel := getCampinhoNivel(nivelAtual + 1)

	bonusHoje := false
	ubStr := ""
	if ultimoBonus.Valid {
		ubStr = ultimoBonus.String
		hoje := hojeJogo()
		if ubStr >= hoje {
			bonusHoje = true
		}
	}

	bonusXP := jogador.XPProximo / 10

	campinho := CampinhoJogador{
		Nivel:        nivelAtual,
		UltimoBonus:  ubStr,
		NivelInfo:    nivelInfo,
		ProximoNivel: proximoNivel,
		BonusHoje:    bonusHoje,
		BonusXP:      bonusXP,
	}

	// Get player materials
	materiaisJogador := make(map[string]int)
	rows, _ := db.Conn.Query("SELECT material, quantidade FROM materiais_jogador WHERE jogador_id=$1", jogadorID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var mat string
			var qtd int
			rows.Scan(&mat, &qtd)
			materiaisJogador[mat] = qtd
		}
	}

	// Busca requisitos do nível atual
	type Requisito struct {
		Tipo      string `json:"tipo"`
		Objetivo  int    `json:"objetivo"`
		Descricao string `json:"descricao"`
		Progresso int    `json:"progresso"`
	}
	var reqList []Requisito
	reqRows, _ := db.Conn.Query("SELECT tipo, objetivo, descricao FROM campinho_requisitos WHERE nivel=$1", nivelAtual)
	if reqRows != nil {
		defer reqRows.Close()
		// Busca contadores do jogador pra calcular progresso
		var energiaGasta, vitorias, desafios1v1Vit int
		db.Conn.QueryRow("SELECT COALESCE(energia_gasta_total,0), vitorias, COALESCE(desafios_1v1_vitorias,0) FROM jogadores WHERE id=$1",
			jogadorID).Scan(&energiaGasta, &vitorias, &desafios1v1Vit)

		// Total de trabalhos feitos
		var totalTrabalhos int
		db.Conn.QueryRow("SELECT COALESCE(SUM(vezes_feito),0) FROM maestria_trabalhos WHERE jogador_id=$1", jogadorID).Scan(&totalTrabalhos)

		for reqRows.Next() {
			var rq Requisito
			reqRows.Scan(&rq.Tipo, &rq.Objetivo, &rq.Descricao)
			switch rq.Tipo {
			case "energia_gasta":
				rq.Progresso = energiaGasta
			case "vitorias":
				rq.Progresso = vitorias
			case "desafios_1v1":
				rq.Progresso = desafios1v1Vit
			case "trabalhos":
				rq.Progresso = totalTrabalhos
			case "nivel":
				rq.Progresso = jogador.Nivel
			case "fama":
				rq.Progresso = jogador.PontosFama
			}
			reqList = append(reqList, rq)
		}
	}
	if reqList == nil {
		reqList = []Requisito{}
	}

	// Verifica se todos os requisitos estão completos
	todosReqCompletos := true
	for _, rq := range reqList {
		if rq.Progresso < rq.Objetivo {
			todosReqCompletos = false
			break
		}
	}

	JsonResp(w, 200, map[string]any{
		"sucesso":              true,
		"campinho":             campinho,
		"materiais":            materiaisJogador,
		"jogador":              jogador,
		"requisitos":           reqList,
		"requisitos_completos": todosReqCompletos,
	})
}

func HandleCampinhoBonus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	// Ensure campinho entry exists
	db.Conn.Exec("INSERT INTO campinho_jogador (jogador_id, nivel) VALUES ($1, 0) ON CONFLICT DO NOTHING", req.JogadorID)

	// Check if already claimed today
	var ultimoBonus sql.NullString
	db.Conn.QueryRow("SELECT ultimo_bonus FROM campinho_jogador WHERE jogador_id=$1", req.JogadorID).Scan(&ultimoBonus)
	hoje := hojeJogo()
	if ultimoBonus.Valid && ultimoBonus.String >= hoje {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Você já coletou o bônus hoje!"})
		return
	}

	bonusXP := jogador.XPProximo / 10
	if bonusXP < 1 {
		bonusXP = 1
	}

	jogador.XP += bonusXP
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		jogador.VitalidadeMax++
		jogador.Vitalidade = jogador.VitalidadeMax
		novoNivel = jogador.Nivel
		levelUp = true
	}
	jogador.Rank = getRank(jogador.Nivel)
	saveJogador(jogador)

	db.Conn.Exec("UPDATE campinho_jogador SET ultimo_bonus=CURRENT_DATE WHERE jogador_id=$1", req.JogadorID)

	msg := fmt.Sprintf("Bônus do campinho: +%d XP!", bonusXP)
	if levelUp {
		msg += fmt.Sprintf(" LEVEL UP! Agora você é nível %d!", novoNivel)
	}

	JsonResp(w, 200, map[string]any{
		"sucesso":   true,
		"mensagem":  msg,
		"bonus_xp":  bonusXP,
		"level_up":  levelUp,
		"novo_nivel": novoNivel,
		"jogador":   jogador,
	})
}

func HandleCampinhoUpgrade(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	// Ensure campinho entry exists
	db.Conn.Exec("INSERT INTO campinho_jogador (jogador_id, nivel) VALUES ($1, 0) ON CONFLICT DO NOTHING", req.JogadorID)

	var nivelAtual int
	db.Conn.QueryRow("SELECT nivel FROM campinho_jogador WHERE jogador_id=$1", req.JogadorID).Scan(&nivelAtual)

	proximoNivel := getCampinhoNivel(nivelAtual + 1)
	if proximoNivel == nil {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Seu campinho já está no nível máximo!"})
		return
	}

	// Check materials
	for mat, qtdNecessaria := range proximoNivel.Materiais {
		var qtdJogador int
		db.Conn.QueryRow("SELECT COALESCE(quantidade, 0) FROM materiais_jogador WHERE jogador_id=$1 AND material=$2",
			req.JogadorID, mat).Scan(&qtdJogador)
		if qtdJogador < qtdNecessaria {
			JsonResp(w, 200, map[string]any{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Falta material: %s (%d/%d)", mat, qtdJogador, qtdNecessaria),
			})
			return
		}
	}

	// Deduct materials
	for mat, qtdNecessaria := range proximoNivel.Materiais {
		db.Conn.Exec("UPDATE materiais_jogador SET quantidade = quantidade - $1 WHERE jogador_id=$2 AND material=$3",
			qtdNecessaria, req.JogadorID, mat)
	}

	// Upgrade
	novoNivel := nivelAtual + 1
	db.Conn.Exec("UPDATE campinho_jogador SET nivel=$1 WHERE jogador_id=$2", novoNivel, req.JogadorID)

	nivelInfo := getCampinhoNivel(novoNivel)
	proximoNivelInfo := getCampinhoNivel(novoNivel + 1)

	// Reload materials
	materiaisJogador := make(map[string]int)
	rows, _ := db.Conn.Query("SELECT material, quantidade FROM materiais_jogador WHERE jogador_id=$1", req.JogadorID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var mat string
			var qtd int
			rows.Scan(&mat, &qtd)
			materiaisJogador[mat] = qtd
		}
	}

	JsonResp(w, 200, map[string]any{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Campinho evoluiu para: %s!", nivelInfo.Nome),
		"campinho": CampinhoJogador{
			Nivel:        novoNivel,
			NivelInfo:    nivelInfo,
			ProximoNivel: proximoNivelInfo,
		},
		"materiais": materiaisJogador,
	})
}

// ========================
// QUESTS
// ========================

func HandleQuests(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		ErrResp(w, 400, "ID inválido")
		return
	}
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	jogador, err := getJogador(jogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	// Get all quests
	rows, err := db.Conn.Query(`SELECT id, nome, descricao, icone, tipo, objetivo,
		COALESCE(nivel_min, 0), COALESCE(nivel_max, 0),
		recompensa_material, recompensa_quantidade, recompensa_xp, recompensa_dinheiro,
		COALESCE(recompensa_energia, 0), COALESCE(recompensa_item_id, 0) FROM quests`)
	if err != nil {
		ErrResp(w, 500, "Erro ao carregar quests")
		return
	}
	defer rows.Close()

	// Get trabalhos total
	var trabalhosTotal int
	db.Conn.QueryRow("SELECT COALESCE(SUM(vezes_feito), 0) FROM maestria_trabalhos WHERE jogador_id=$1", jogadorID).Scan(&trabalhosTotal)

	// Get energia_gasta_total
	var energiaGasta int
	db.Conn.QueryRow("SELECT COALESCE(energia_gasta_total, 0) FROM jogadores WHERE id=$1", jogadorID).Scan(&energiaGasta)

	// Get desafios_1v1_vitorias
	var desafios1v1 int
	db.Conn.QueryRow("SELECT COALESCE(desafios_1v1_vitorias, 0) FROM jogadores WHERE id=$1", jogadorID).Scan(&desafios1v1)

	var quests []Quest
	for rows.Next() {
		var q Quest
		rows.Scan(&q.ID, &q.Nome, &q.Descricao, &q.Icone, &q.Tipo, &q.Objetivo,
			&q.NivelMin, &q.NivelMax,
			&q.RecompensaMaterial, &q.RecompensaQuantidade, &q.RecompensaXP, &q.RecompensaDinheiro,
			&q.RecompensaEnergia, &q.RecompensaItemID)

		// Filter by level: if nivel_max > 0 and player level > nivel_max, skip
		if q.NivelMax > 0 && jogador.Nivel > q.NivelMax {
			continue
		}
		// If nivel_min > 0 and player level < nivel_min, skip
		if q.NivelMin > 0 && jogador.Nivel < q.NivelMin {
			continue
		}

		// Filter position quests: pos_ata_* only for ATA, etc.
		if strings.HasPrefix(q.ID, "pos_") {
			parts := strings.Split(q.ID, "_")
			if len(parts) >= 2 && strings.ToUpper(jogador.Posicao) != strings.ToUpper(parts[1]) {
				continue
			}
		}

		// Calculate progress based on type
		switch q.Tipo {
		case "vitorias":
			q.Progresso = jogador.Vitorias
		case "trabalhos":
			q.Progresso = trabalhosTotal
		case "energia_gasta":
			q.Progresso = energiaGasta
		case "nivel":
			q.Progresso = jogador.Nivel
		case "fama":
			q.Progresso = jogador.PontosFama
		case "desafios_1v1":
			q.Progresso = desafios1v1
		}

		// Cap progress at objetivo for display
		if q.Progresso > q.Objetivo {
			q.Progresso = q.Objetivo
		}

		// Check if already claimed
		var completada bool
		err := db.Conn.QueryRow("SELECT completada FROM progresso_quests WHERE jogador_id=$1 AND quest_id=$2",
			jogadorID, q.ID).Scan(&completada)
		if err == nil {
			q.Completada = completada
		}

		quests = append(quests, q)
	}

	JsonResp(w, 200, map[string]any{
		"sucesso": true,
		"quests":  quests,
	})
}

func HandleResgatarQuest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int    `json:"jogador_id"`
		QuestID   string `json:"quest_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	// Get quest info
	var q Quest
	err = db.Conn.QueryRow(`SELECT id, nome, tipo, objetivo, recompensa_material, recompensa_quantidade,
		recompensa_xp, recompensa_dinheiro, COALESCE(recompensa_energia, 0), COALESCE(recompensa_item_id, 0),
		COALESCE(nivel_min, 0), COALESCE(nivel_max, 0) FROM quests WHERE id=$1`, req.QuestID).
		Scan(&q.ID, &q.Nome, &q.Tipo, &q.Objetivo, &q.RecompensaMaterial, &q.RecompensaQuantidade,
			&q.RecompensaXP, &q.RecompensaDinheiro, &q.RecompensaEnergia, &q.RecompensaItemID,
			&q.NivelMin, &q.NivelMax)
	if err != nil {
		ErrResp(w, 404, "Quest não encontrada")
		return
	}

	// Check if already claimed
	var completada bool
	err = db.Conn.QueryRow("SELECT completada FROM progresso_quests WHERE jogador_id=$1 AND quest_id=$2",
		req.JogadorID, req.QuestID).Scan(&completada)
	if err == nil && completada {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Essa quest já foi resgatada!"})
		return
	}

	// Calculate current progress
	var progresso int
	switch q.Tipo {
	case "vitorias":
		progresso = jogador.Vitorias
	case "trabalhos":
		db.Conn.QueryRow("SELECT COALESCE(SUM(vezes_feito), 0) FROM maestria_trabalhos WHERE jogador_id=$1", req.JogadorID).Scan(&progresso)
	case "energia_gasta":
		db.Conn.QueryRow("SELECT COALESCE(energia_gasta_total, 0) FROM jogadores WHERE id=$1", req.JogadorID).Scan(&progresso)
	case "nivel":
		progresso = jogador.Nivel
	case "fama":
		progresso = jogador.PontosFama
	case "desafios_1v1":
		db.Conn.QueryRow("SELECT COALESCE(desafios_1v1_vitorias, 0) FROM jogadores WHERE id=$1", req.JogadorID).Scan(&progresso)
	}

	if progresso < q.Objetivo {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Quest ainda não completada!"})
		return
	}

	// Add material
	if q.RecompensaMaterial != "" && q.RecompensaQuantidade > 0 {
		db.Conn.Exec(`INSERT INTO materiais_jogador (jogador_id, material, quantidade)
			VALUES ($1, $2, $3)
			ON CONFLICT (jogador_id, material) DO UPDATE SET quantidade = materiais_jogador.quantidade + $3`,
			req.JogadorID, q.RecompensaMaterial, q.RecompensaQuantidade)
	}

	// Add XP
	if q.RecompensaXP > 0 {
		jogador.XP += q.RecompensaXP
	}

	// Add money
	if q.RecompensaDinheiro > 0 {
		jogador.DinheiroMao += q.RecompensaDinheiro
	}

	// Add item reward to inventory
	if q.RecompensaItemID > 0 {
		db.Conn.Exec(`INSERT INTO inventario (jogador_id, item_id, quantidade)
			VALUES ($1, $2, 1)
			ON CONFLICT (jogador_id, item_id) DO UPDATE SET quantidade = inventario.quantidade + 1`,
			req.JogadorID, q.RecompensaItemID)
	}

	// Add energy reward as consumable item to inventory
	if q.RecompensaEnergia > 0 {
		var energyItemID int
		switch {
		case q.RecompensaEnergia <= 5:
			energyItemID = 63 // Água Mineral (3 energia)
		case q.RecompensaEnergia <= 10:
			energyItemID = 64 // Isotônico (8 energia)
		default:
			energyItemID = 65 // Energético Monster (15 energia)
		}
		db.Conn.Exec(`INSERT INTO inventario (jogador_id, item_id, quantidade)
			VALUES ($1, $2, 1)
			ON CONFLICT (jogador_id, item_id) DO UPDATE SET quantidade = inventario.quantidade + 1`,
			req.JogadorID, energyItemID)
	}

	// Grant title for position quests
	if strings.HasPrefix(q.ID, "pos_") {
		if jogador.Titulos == "" {
			jogador.Titulos = q.Nome
		} else if !strings.Contains(jogador.Titulos, q.Nome) {
			jogador.Titulos = jogador.Titulos + "," + q.Nome
		}
		jogador.Titulo = q.Nome // Set as active
	}

	// Level up check
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		jogador.VitalidadeMax++
		jogador.Vitalidade = jogador.VitalidadeMax
		novoNivel = jogador.Nivel
		levelUp = true
	}
	jogador.Rank = getRank(jogador.Nivel)
	saveJogador(jogador)

	// Mark as claimed
	db.Conn.Exec(`INSERT INTO progresso_quests (jogador_id, quest_id, progresso, completada)
		VALUES ($1, $2, $3, true)
		ON CONFLICT (jogador_id, quest_id) DO UPDATE SET completada = true, progresso = $3`,
		req.JogadorID, req.QuestID, progresso)

	msg := fmt.Sprintf("Quest '%s' resgatada!", q.Nome)
	if q.RecompensaMaterial != "" && q.RecompensaQuantidade > 0 {
		msg += fmt.Sprintf(" +%d %s", q.RecompensaQuantidade, q.RecompensaMaterial)
	}
	if q.RecompensaXP > 0 {
		msg += fmt.Sprintf(", +%d XP", q.RecompensaXP)
	}
	if q.RecompensaDinheiro > 0 {
		msg += fmt.Sprintf(", +R$ %d", q.RecompensaDinheiro)
	}
	if q.RecompensaItemID > 0 {
		var itemNome string
		db.Conn.QueryRow("SELECT nome FROM cat_itens WHERE id=$1", q.RecompensaItemID).Scan(&itemNome)
		if itemNome != "" {
			msg += fmt.Sprintf(", +1 %s", itemNome)
		}
	}
	if q.RecompensaEnergia > 0 {
		msg += ", +1 item de energia"
	}

	JsonResp(w, 200, map[string]any{
		"sucesso":    true,
		"mensagem":   msg,
		"jogador":    jogador,
		"level_up":   levelUp,
		"novo_nivel": novoNivel,
	})
}

// ========================
// POSIÇÃO & TÍTULOS
// ========================

func HandleEscolherPosicao(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método deve ser POST")
		return
	}
	var req struct {
		JogadorID int    `json:"jogador_id"`
		Posicao   string `json:"posicao"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	// Validate position
	posUpper := strings.ToUpper(req.Posicao)
	if posUpper != "GK" && posUpper != "DEF" && posUpper != "MED" && posUpper != "ATA" {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Posição inválida! Use GK, DEF, MED ou ATA."})
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if jogador.Posicao != "" {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Você já escolheu sua posição!"})
		return
	}
	jogador.Posicao = posUpper
	db.Conn.Exec("UPDATE jogadores SET posicao=$1 WHERE id=$2", posUpper, req.JogadorID)
	saveJogador(jogador)
	JsonResp(w, 200, map[string]any{"sucesso": true, "mensagem": "Posição escolhida!", "jogador": jogador})
}

func HandleConcederTitulo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método deve ser POST")
		return
	}
	var req struct {
		JogadorID int    `json:"jogador_id"`
		Titulo    string `json:"titulo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}
	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	// Check if already has this title
	if jogador.Titulos != "" {
		titulos := strings.Split(jogador.Titulos, ",")
		for _, t := range titulos {
			if t == req.Titulo {
				JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Você já tem esse título!"})
				return
			}
		}
	}
	// Add title
	if jogador.Titulos == "" {
		jogador.Titulos = req.Titulo
	} else {
		jogador.Titulos = jogador.Titulos + "," + req.Titulo
	}
	// Also set as active title
	jogador.Titulo = req.Titulo
	saveJogador(jogador)
	atualizado, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]any{"sucesso": true, "mensagem": "Título conquistado: " + req.Titulo, "jogador": atualizado})
}

// ========================
// DESAFIO 1v1 (PENALTY SHOOTOUT)
// ========================

// POST /api/desafio-1v1 — Criar desafio pendente (desafiante envia seus 5 chutes)
func HandleDesafio1v1(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		DesafianteID int      `json:"desafiante_id"`
		DesafiadoID  int      `json:"desafiado_id"`
		Chutes       []string `json:"chutes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	// Verifica nível mínimo para 1v1
	desafiante, err := getJogador(req.DesafianteID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	if desafiante.Nivel < 12 {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "O Desafio 1v1 libera no nível 12! Continue evoluindo."})
		return
	}

	if len(req.Chutes) != 5 {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Você precisa fazer exatamente 5 chutes!"})
		return
	}
	direcoes := map[string]bool{"esquerda": true, "centro": true, "direita": true}
	for _, c := range req.Chutes {
		if !direcoes[c] {
			JsonResp(w, 200, Desafio1v1Response{Mensagem: "Direção inválida: " + c})
			return
		}
	}
	if req.DesafianteID == req.DesafiadoID {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Você não pode se desafiar!"})
		return
	}

	periodo := periodoDesafio()
	var count int
	db.Conn.QueryRow("SELECT COUNT(*) FROM desafios_1v1 WHERE desafiante_id=$1 AND desafiado_id=$2 AND periodo=$3",
		req.DesafianteID, req.DesafiadoID, periodo).Scan(&count)
	if count > 0 {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Você já desafiou este jogador neste período! Próximo reset às 08:00 ou 18:00."})
		return
	}

	atacante, err := getJogador(req.DesafianteID)
	if err != nil {
		ErrResp(w, 404, "Desafiante não encontrado")
		return
	}
	desafiado, err := getJogador(req.DesafiadoID)
	if err != nil {
		ErrResp(w, 404, "Desafiado não encontrado")
		return
	}

	// Salva desafio como PENDENTE — só os chutes do desafiante
	chutesStr := strings.Join(req.Chutes, ",")
	var desafioID int
	db.Conn.QueryRow(`INSERT INTO desafios_1v1 (desafiante_id, desafiado_id, chutes_desafiante, status, periodo)
		VALUES ($1,$2,$3,'pendente',$4) RETURNING id`,
		req.DesafianteID, req.DesafiadoID, chutesStr, periodo).Scan(&desafioID)

	JsonResp(w, 200, Desafio1v1Response{
		Sucesso:  true,
		Mensagem: fmt.Sprintf("Desafio enviado para %s! Aguarde a resposta.", desafiado.Nome),
		Desafio: &Desafio1v1{
			ID: desafioID, DesafianteID: req.DesafianteID, DesafiadoID: req.DesafiadoID,
			ChutesDesafiante: chutesStr, Status: "pendente",
			NomeDesafiante: atacante.Nome, NomeDesafiado: desafiado.Nome,
		},
	})
}

// POST /api/desafio-1v1/responder — Desafiado responde com seus 5 chutes, resolve a partida
func HandleResponderDesafio1v1(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		DesafioID int      `json:"desafio_id"`
		JogadorID int      `json:"jogador_id"`
		Defesas   []string `json:"defesas"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	if len(req.Defesas) != 5 {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Você precisa escolher 5 defesas!"})
		return
	}
	direcoes := map[string]bool{"esquerda": true, "centro": true, "direita": true}
	for _, c := range req.Defesas {
		if !direcoes[c] {
			JsonResp(w, 200, Desafio1v1Response{Mensagem: "Direção inválida: " + c})
			return
		}
	}

	// Busca desafio pendente
	var desafianteID, desafiadoID int
	var chutesDesafianteStr, defesasDesafianteStr, status string
	err := db.Conn.QueryRow(`SELECT desafiante_id, desafiado_id, chutes_desafiante, defesas_desafiante, status
		FROM desafios_1v1 WHERE id=$1`, req.DesafioID).Scan(&desafianteID, &desafiadoID, &chutesDesafianteStr, &defesasDesafianteStr, &status)
	if err != nil {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Desafio não encontrado."})
		return
	}
	if status != "pendente" {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Este desafio já foi respondido!"})
		return
	}
	if req.JogadorID != desafiadoID {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Este desafio não é pra você!"})
		return
	}

	desafiante, _ := getJogador(desafianteID)
	desafiado, _ := getJogador(desafiadoID)
	if desafiante == nil || desafiado == nil {
		JsonResp(w, 200, Desafio1v1Response{Mensagem: "Jogador não encontrado."})
		return
	}

	chutesDesafiante := strings.Split(chutesDesafianteStr, ",")
	defesasDesafiado := req.Defesas
	defDesafiadoStr := strings.Join(defesasDesafiado, ",")

	// Resolve: desafiante chuta 5x, desafiado defende 5x (na ordem)
	gols := 0
	for i, chute := range chutesDesafiante {
		defesa := ""
		if i < len(defesasDesafiado) {
			defesa = defesasDesafiado[i]
		}
		if chute != defesa {
			gols++
		}
	}

	// Resultado + XP
	// Desafiante: fez gols. Desafiado: defendeu (5 - gols).
	// Desafiante vence se fez >= 3 gols (maioria de 5)
	// Desafiado vence se defendeu >= 3 (gols <= 2)
	var vencedorID int
	var xpDesafiante, xpDesafiado int
	var mensagem string
	defesas := 5 - gols
	if gols >= 3 {
		vencedorID = desafianteID
		xpDesafiante = 100
		xpDesafiado = 10
		db.Conn.Exec("UPDATE jogadores SET desafios_1v1_vitorias = COALESCE(desafios_1v1_vitorias,0) + 1 WHERE id=$1", desafianteID)
		mensagem = fmt.Sprintf("Cobrador venceu! %d gols em 5 chutes!", gols)
	} else if defesas >= 3 {
		vencedorID = desafiadoID
		xpDesafiante = 10
		xpDesafiado = 150
		db.Conn.Exec("UPDATE jogadores SET desafios_1v1_vitorias = COALESCE(desafios_1v1_vitorias,0) + 1 WHERE id=$1", desafiadoID)
		mensagem = fmt.Sprintf("Goleiro venceu! Defendeu %d de 5 chutes!", defesas)
	} else {
		// empate impossível com 5 chutes (3+2 ou 2+3), mas por segurança:
		vencedorID = 0
		xpDesafiante = 25
		xpDesafiado = 25
		mensagem = fmt.Sprintf("Empate! %d gols, %d defesas.", gols, defesas)
	}

	// Skill missions: penalti acertos (desafiante = kicker, gols = goals scored)
	updateSkillProgress(desafianteID, "PENALTI_ACERTOS", gols)

	// Combined missions: PENALTI_GOL
	if gols > 0 {
		updateCombinedProgress(desafianteID, "PENALTI_GOL", gols)
	}

	// Aplica XP pra ambos
	desafiante.XP += xpDesafiante
	for desafiante.XP >= desafiante.XPProximo {
		desafiante.XP -= desafiante.XPProximo
		desafiante.Nivel++
		desafiante.XPProximo = calcularXPProximo(desafiante.Nivel)
		desafiante.EnergiaMax = calcEnergiaMaxBase(desafiante.Nivel)
		desafiante.Energia = desafiante.EnergiaMax
		desafiante.Forca++
		desafiante.Velocidade++
		desafiante.Habilidade++
	}
	saveJogador(desafiante)

	desafiado.XP += xpDesafiado
	levelUp := false
	novoNivel := desafiado.Nivel
	for desafiado.XP >= desafiado.XPProximo {
		desafiado.XP -= desafiado.XPProximo
		desafiado.Nivel++
		desafiado.XPProximo = calcularXPProximo(desafiado.Nivel)
		desafiado.EnergiaMax = calcEnergiaMaxBase(desafiado.Nivel)
		desafiado.Energia = desafiado.EnergiaMax
		desafiado.Forca++
		desafiado.Velocidade++
		desafiado.Habilidade++
		levelUp = true
		novoNivel = desafiado.Nivel
	}
	saveJogador(desafiado)

	// Atualiza desafio no banco
	db.Conn.Exec(`UPDATE desafios_1v1 SET defesas_desafiado=$1, gols_desafiante=$2, gols_desafiado=0,
		vencedor_id=$3, status='concluido' WHERE id=$4`,
		defDesafiadoStr, gols, vencedorID, req.DesafioID)

	atualizado, _ := getJogador(desafiado.ID)
	JsonResp(w, 200, Desafio1v1Response{
		Sucesso:  true,
		Mensagem: mensagem,
		Desafio: &Desafio1v1{
			ID: req.DesafioID, DesafianteID: desafianteID, DesafiadoID: desafiadoID,
			GolsDesafiante: gols, GolsDesafiado: 0,
			ChutesDesafiante: chutesDesafianteStr, DefesasDesafiado: defDesafiadoStr,
			VencedorID: vencedorID, Status: "concluido",
			NomeDesafiante: desafiante.Nome, NomeDesafiado: desafiado.Nome,
		},
		Jogador:   atualizado,
		LevelUp:   levelUp,
		NovoNivel: novoNivel,
	})
}

// GET /api/desafios-1v1/{jogador_id} — Pendentes + histórico de hoje
func HandleDesafios1v1Historico(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	rows, err := db.Conn.Query(`
		SELECT d.id, d.desafiante_id, d.desafiado_id, d.gols_desafiante, d.gols_desafiado,
		       d.chutes_desafiante, d.defesas_desafiante, d.chutes_desafiado, d.defesas_desafiado,
		       d.vencedor_id, COALESCE(d.status,'pendente'), d.data::text,
		       j1.nome, j2.nome
		FROM desafios_1v1 d
		JOIN jogadores j1 ON j1.id = d.desafiante_id
		JOIN jogadores j2 ON j2.id = d.desafiado_id
		WHERE (d.desafiante_id = $1 OR d.desafiado_id = $1)
		AND (d.periodo = $2 OR d.data = CURRENT_DATE)
		ORDER BY d.criado_em DESC`, jogadorID, periodoDesafio())
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar desafios")
		return
	}
	defer rows.Close()

	var desafios []Desafio1v1
	for rows.Next() {
		var d Desafio1v1
		rows.Scan(&d.ID, &d.DesafianteID, &d.DesafiadoID, &d.GolsDesafiante, &d.GolsDesafiado,
			&d.ChutesDesafiante, &d.DefesasDesafiante, &d.ChutesDesafiado, &d.DefesasDesafiado,
			&d.VencedorID, &d.Status, &d.Data, &d.NomeDesafiante, &d.NomeDesafiado)
		desafios = append(desafios, d)
	}
	if desafios == nil {
		desafios = []Desafio1v1{}
	}

	JsonResp(w, 200, map[string]any{"sucesso": true, "desafios": desafios})
}

// POST /api/minigame/resultado — Envia resultado do minigame Match-3
func HandleMinigameResultado(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JogadorID int `json:"jogador_id"`
		Score     int `json:"score"`
		MaxCombo  int `json:"max_combo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	if jogador.Nivel < 15 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "O MiniGame libera no nível 15!"})
		return
	}

	// Anti-cheat: cap score máximo (30 moves × max ~150pts por move = ~4500)
	if req.Score > 5000 {
		req.Score = 5000
	}
	if req.Score < 0 {
		req.Score = 0
	}

	// Cooldown 2h
	if !podeJogarMinigame(req.JogadorID) {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": "Minigame em cooldown! Volte em 2 horas."})
		return
	}

	// Calcula recompensas baseado no score
	var moedas, xp, energia int
	var itemID int
	var mensagem string

	switch {
	case req.Score >= 2000:
		moedas = 3
		xp = 50
		energia = 15
		itemID = 65 // Energético Monster
		mensagem = fmt.Sprintf("INCRÍVEL! Score %d! +3 💎 +50 XP +Energético!", req.Score)
	case req.Score >= 1000:
		moedas = 2
		xp = 30
		energia = 10
		itemID = 64 // Isotônico
		mensagem = fmt.Sprintf("Muito bom! Score %d! +2 💎 +30 XP +Isotônico!", req.Score)
	case req.Score >= 500:
		moedas = 1
		xp = 20
		energia = 5
		itemID = 63 // Água Mineral
		mensagem = fmt.Sprintf("Bom jogo! Score %d! +1 💎 +20 XP +Água!", req.Score)
	default:
		moedas = 0
		xp = 10
		energia = 0
		mensagem = fmt.Sprintf("Score %d. +10 XP. Tente melhor amanhã!", req.Score)
	}

	// Eventos temporários: multiplicador XP minigame
	multXPMini := getMultiplicadorEvento("XP_MINIGAME")
	xp = int(float64(xp) * multXPMini)

	// Aplica recompensas
	jogador.Moedas += moedas
	jogador.XP += xp
	if energia > 0 {
		jogador.Energia = clampInt(jogador.Energia+energia, 0, jogador.EnergiaMax)
	}

	// Item pro inventário
	if itemID > 0 {
		db.Conn.Exec(`INSERT INTO inventario (jogador_id, item_id, quantidade)
			VALUES ($1, $2, 1)
			ON CONFLICT (jogador_id, item_id) DO UPDATE SET quantidade = inventario.quantidade + 1`,
			req.JogadorID, itemID)
	}

	// Level up check
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		levelUp = true
		novoNivel = jogador.Nivel
	}

	saveJogador(jogador)
	db.Conn.Exec("UPDATE jogadores SET ultimo_minigame=NOW() WHERE id=$1", req.JogadorID)

	// Skill missions: combo and score
	if req.MaxCombo > 0 {
		updateSkillProgress(req.JogadorID, "COMBO_MATCH3", req.MaxCombo)
	}
	updateSkillProgress(req.JogadorID, "SCORE_MATCH3", req.Score)

	// Weekly ranking: match3 score
	registrarWeekly(req.JogadorID, "score_match3", req.Score)

	// Combined missions: MINIGAME_PLAY
	updateCombinedProgress(req.JogadorID, "MINIGAME_PLAY", 1)

	atualizado, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]any{
		"sucesso":   true,
		"mensagem":  mensagem,
		"moedas":    moedas,
		"xp":        xp,
		"energia":   energia,
		"jogador":   atualizado,
		"level_up":  levelUp,
		"novo_nivel": novoNivel,
	})
}

// GET /api/minigame/status/{jogador_id} — Verifica se pode jogar hoje
func HandleMinigameStatus(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	pode, restante := statusMinigame(jogadorID)
	JsonResp(w, 200, map[string]any{"pode_jogar": pode, "restante_seg": restante})
}

// ========================
// PERFIL PÚBLICO & AMIZADES
// ========================

// GET /api/perfil-publico/{id}?viewer={viewerID}
func HandlePerfilPublico(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrResp(w, 405, "Método deve ser GET")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	targetID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	var p PerfilPublico
	err = db.Conn.QueryRow(`
		SELECT id, nome, nivel, avatar, pontos_fama, vitorias, derrotas,
		       forca, velocidade, habilidade, titulo, codigo_amigo, inventario_publico
		FROM jogadores WHERE id=$1`, targetID).Scan(
		&p.ID, &p.Nome, &p.Nivel, &p.Avatar, &p.PontosFama, &p.Vitorias, &p.Derrotas,
		&p.Forca, &p.Velocidade, &p.Habilidade, &p.Titulo, &p.CodigoAmigo, &p.InventarioPublico)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}
	p.Rank = getRank(p.Nivel)

	viewerStr := r.URL.Query().Get("viewer")
	viewerID, _ := strconv.Atoi(viewerStr)

	if viewerID > 0 && viewerID != targetID {
		var count int
		db.Conn.QueryRow(`SELECT COUNT(*) FROM amizades WHERE jogador_id=$1 AND amigo_id=$2 AND status='aceita'`,
			viewerID, targetID).Scan(&count)
		p.EhAmigo = count > 0

		if !p.EhAmigo {
			var pending int
			db.Conn.QueryRow(`SELECT COUNT(*) FROM amizades
				WHERE ((jogador_id=$1 AND amigo_id=$2) OR (jogador_id=$2 AND amigo_id=$1))
				AND status='pendente'`, viewerID, targetID).Scan(&pending)
			p.SolicitacaoPendente = pending > 0
		}
	}

	if p.InventarioPublico {
		rows, err := db.Conn.Query("SELECT item_id, quantidade, equipado FROM inventario WHERE jogador_id=$1 ORDER BY item_id", targetID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var inv InventarioItem
				rows.Scan(&inv.ItemID, &inv.Quantidade, &inv.Equipado)
				inv.Item = findItemByID(inv.ItemID)
				p.Inventario = append(p.Inventario, inv)
			}
		}
	}

	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "perfil": p})
}

// POST /api/amizade/solicitar
func HandleSolicitarAmizade(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método deve ser POST")
		return
	}

	var req struct {
		JogadorID   int    `json:"jogador_id"`
		CodigoAmigo string `json:"codigo_amigo"`
		AmigoID     int    `json:"amigo_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	amigoID := req.AmigoID
	if req.CodigoAmigo != "" {
		err := db.Conn.QueryRow("SELECT id FROM jogadores WHERE codigo_amigo=$1", req.CodigoAmigo).Scan(&amigoID)
		if err != nil {
			ErrResp(w, 404, "Código de amigo não encontrado")
			return
		}
	}

	if amigoID == 0 {
		ErrResp(w, 400, "Informe codigo_amigo ou amigo_id")
		return
	}

	if req.JogadorID == amigoID {
		ErrResp(w, 400, "Você não pode adicionar a si mesmo")
		return
	}

	// Check if already friends or pending
	var existing int
	db.Conn.QueryRow(`SELECT COUNT(*) FROM amizades
		WHERE ((jogador_id=$1 AND amigo_id=$2) OR (jogador_id=$2 AND amigo_id=$1))`,
		req.JogadorID, amigoID).Scan(&existing)
	if existing > 0 {
		ErrResp(w, 400, "Já existe uma solicitação ou amizade com este jogador")
		return
	}

	_, err := db.Conn.Exec(`INSERT INTO amizades (jogador_id, amigo_id, status) VALUES ($1, $2, 'pendente')`,
		req.JogadorID, amigoID)
	if err != nil {
		ErrResp(w, 500, "Erro ao enviar solicitação")
		return
	}

	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "mensagem": "Solicitação enviada!"})
}

// POST /api/amizade/responder
func HandleResponderAmizade(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método deve ser POST")
		return
	}

	var req struct {
		AmizadeID  int  `json:"amizade_id"`
		JogadorID  int  `json:"jogador_id"`
		Aceitar    bool `json:"aceitar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	// Verify the request is directed at this player
	var jogadorID, amigoID int
	err := db.Conn.QueryRow("SELECT jogador_id, amigo_id FROM amizades WHERE id=$1 AND amigo_id=$2 AND status='pendente'",
		req.AmizadeID, req.JogadorID).Scan(&jogadorID, &amigoID)
	if err != nil {
		ErrResp(w, 404, "Solicitação não encontrada")
		return
	}

	if req.Aceitar {
		db.Conn.Exec("UPDATE amizades SET status='aceita' WHERE id=$1", req.AmizadeID)
		// Insert reverse friendship
		db.Conn.Exec(`INSERT INTO amizades (jogador_id, amigo_id, status) VALUES ($1, $2, 'aceita')
			ON CONFLICT (jogador_id, amigo_id) DO UPDATE SET status='aceita'`, amigoID, jogadorID)
		JsonResp(w, 200, map[string]interface{}{"sucesso": true, "mensagem": "Amizade aceita!"})
	} else {
		db.Conn.Exec("DELETE FROM amizades WHERE id=$1", req.AmizadeID)
		JsonResp(w, 200, map[string]interface{}{"sucesso": true, "mensagem": "Solicitação recusada"})
	}
}

// GET /api/amizades/{jogador_id}
func HandleListarAmizades(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrResp(w, 405, "Método deve ser GET")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	rows, err := db.Conn.Query(`
		SELECT a.id, a.jogador_id, a.amigo_id, a.status, j.nome, j.nivel, j.avatar
		FROM amizades a
		JOIN jogadores j ON j.id = CASE WHEN a.jogador_id = $1 THEN a.amigo_id ELSE a.jogador_id END
		WHERE (a.jogador_id = $1 OR a.amigo_id = $1)
		ORDER BY a.status, a.criado_em DESC`, jogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar amizades")
		return
	}
	defer rows.Close()

	var amizades []Amizade
	for rows.Next() {
		var a Amizade
		rows.Scan(&a.ID, &a.JogadorID, &a.AmigoID, &a.Status, &a.Nome, &a.Nivel, &a.Avatar)
		a.Rank = getRank(a.Nivel)
		amizades = append(amizades, a)
	}
	if amizades == nil {
		amizades = []Amizade{}
	}

	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "amizades": amizades})
}

// POST /api/perfil/config
func HandlePerfilConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método deve ser POST")
		return
	}

	var req struct {
		JogadorID         int  `json:"jogador_id"`
		InventarioPublico bool `json:"inventario_publico"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	_, err := db.Conn.Exec("UPDATE jogadores SET inventario_publico=$1 WHERE id=$2", req.InventarioPublico, req.JogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro ao atualizar configuração")
		return
	}

	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "mensagem": "Configuração atualizada!"})
}

// ========================
// LOGIN STREAK
// ========================

// GET /api/streak/{jogador_id}
func HandleStreak(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	hoje := hojeJogo()

	var diasSeguidos, totalDias int
	var ultimoLogin sql.NullString
	err = db.Conn.QueryRow(`SELECT dias_seguidos, ultimo_login, total_dias FROM login_streak WHERE jogador_id=$1`, jogadorID).
		Scan(&diasSeguidos, &ultimoLogin, &totalDias)
	if err != nil {
		// No record yet
		recompensa := calcStreakRecompensa(1)
		JsonResp(w, 200, LoginStreak{
			DiasSeguidos: 0,
			UltimoLogin:  "",
			TotalDias:    0,
			Recompensa:   recompensa,
			JaColetou:    false,
		})
		return
	}

	jaColetou := false
	ul := ""
	if ultimoLogin.Valid {
		ul = ultimoLogin.String
		if len(ul) > 10 {
			ul = ul[:10]
		}
	}

	if ul == hoje {
		jaColetou = true
	} else {
		// Check if missed a day
		ontem := ontemJogo()
		if ul != ontem {
			diasSeguidos = 0
		}
	}

	var recompensa *StreakRecompensa
	if !jaColetou {
		recompensa = calcStreakRecompensa(diasSeguidos + 1)
	}

	JsonResp(w, 200, LoginStreak{
		DiasSeguidos: diasSeguidos,
		UltimoLogin:  ul,
		TotalDias:    totalDias,
		Recompensa:   recompensa,
		JaColetou:    jaColetou,
	})
}

// POST /api/streak/coletar
func HandleStreakColetar(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	hoje := hojeJogo()

	var diasSeguidos, totalDias int
	var ultimoLogin sql.NullString
	err = db.Conn.QueryRow(`SELECT dias_seguidos, ultimo_login, total_dias FROM login_streak WHERE jogador_id=$1`, req.JogadorID).
		Scan(&diasSeguidos, &ultimoLogin, &totalDias)

	ul := ""
	if err == nil && ultimoLogin.Valid {
		ul = ultimoLogin.String
		if len(ul) > 10 {
			ul = ul[:10]
		}
	}

	// Already collected today
	if ul == hoje {
		ErrResp(w, 200, "Recompensa já coletada hoje!")
		return
	}

	// Check if streak continues or resets
	ontem := ontemJogo()
	if ul == ontem {
		diasSeguidos++
	} else {
		diasSeguidos = 1
	}
	totalDias++

	recompensa := calcStreakRecompensa(diasSeguidos)

	// Apply rewards
	jogador.XP += recompensa.XP
	if recompensa.Energia > 0 {
		jogador.Energia = clampInt(jogador.Energia+recompensa.Energia, 0, jogador.EnergiaMax)
	}
	if recompensa.ItemID > 0 {
		db.Conn.Exec(`INSERT INTO inventario (jogador_id, item_id, quantidade)
			VALUES ($1, $2, 1)
			ON CONFLICT (jogador_id, item_id) DO UPDATE SET quantidade = inventario.quantidade + 1`,
			req.JogadorID, recompensa.ItemID)
	}

	// Level up check
	levelUp := false
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		levelUp = true
	}
	jogador.Rank = getRank(jogador.Nivel)

	saveJogador(jogador)

	// Upsert streak
	db.Conn.Exec(`INSERT INTO login_streak (jogador_id, dias_seguidos, ultimo_login, total_dias)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (jogador_id) DO UPDATE SET dias_seguidos=$2, ultimo_login=$3, total_dias=$4`,
		req.JogadorID, diasSeguidos, hoje, totalDias)

	atualizado, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":    true,
		"mensagem":   fmt.Sprintf("Streak dia %d! %s", diasSeguidos, recompensa.Desc),
		"streak":     LoginStreak{DiasSeguidos: diasSeguidos, UltimoLogin: hoje, TotalDias: totalDias, Recompensa: recompensa, JaColetou: true},
		"jogador":    atualizado,
		"level_up":   levelUp,
	})
}

// ========================
// SKILL MISSIONS
// ========================

// GET /api/skill-missions/{jogador_id}
func HandleSkillMissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	rows, err := db.Conn.Query(`
		SELECT sm.id, sm.nome, sm.descricao, sm.icone, sm.tipo, sm.alvo, sm.recompensa_xp, sm.recompensa_moedas,
		       COALESCE(sp.progresso, 0), COALESCE(sp.completada, FALSE)
		FROM skill_missions sm
		LEFT JOIN skill_progress sp ON sp.mission_id = sm.id AND sp.jogador_id = $1
		WHERE sm.ativo = TRUE
		ORDER BY sm.tipo, sm.alvo`, jogadorID)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar missões")
		return
	}
	defer rows.Close()

	var missions []SkillMission
	for rows.Next() {
		var m SkillMission
		rows.Scan(&m.ID, &m.Nome, &m.Descricao, &m.Icone, &m.Tipo, &m.Alvo, &m.RecompensaXP, &m.RecompensaMoedas, &m.Progresso, &m.Completada)
		missions = append(missions, m)
	}
	if missions == nil {
		missions = []SkillMission{}
	}

	JsonResp(w, 200, map[string]interface{}{"sucesso": true, "missions": missions})
}

// POST /api/skill-missions/progress
func HandleSkillProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int    `json:"jogador_id"`
		Tipo      string `json:"tipo"`
		Valor     int    `json:"valor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	// Update progress for non-completed missions of this type
	db.Conn.Exec(`INSERT INTO skill_progress (jogador_id, mission_id, progresso)
		SELECT $1, sm.id, $3 FROM skill_missions sm
		WHERE sm.tipo = $2 AND sm.ativo = TRUE
		AND NOT EXISTS (SELECT 1 FROM skill_progress sp WHERE sp.jogador_id=$1 AND sp.mission_id=sm.id AND sp.completada=TRUE)
		ON CONFLICT (jogador_id, mission_id) DO UPDATE SET progresso = GREATEST(skill_progress.progresso, $3)`,
		req.JogadorID, req.Tipo, req.Valor)

	completed := updateSkillProgress(req.JogadorID, req.Tipo, req.Valor)

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":    true,
		"completadas": completed,
	})
}

// ========================
// WEEKLY RANKING
// ========================

// GET /api/weekly/{tipo}
func HandleWeeklyRanking(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	tipo := parts[len(parts)-1]

	var campo string
	switch tipo {
	case "xp":
		campo = "xp_ganho"
	case "pvp":
		campo = "vitorias_pvp"
	case "match3":
		campo = "score_match3"
	default:
		ErrResp(w, 400, "Tipo inválido. Use: xp, pvp, match3")
		return
	}

	semana := semanaAtual()
	rows, err := db.Conn.Query(`
		SELECT wr.jogador_id, j.nome, j.nivel, j.avatar, wr.`+campo+`
		FROM weekly_ranking wr
		JOIN jogadores j ON j.id = wr.jogador_id
		WHERE wr.semana = $1
		ORDER BY wr.`+campo+` DESC
		LIMIT 50`, semana)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar ranking")
		return
	}
	defer rows.Close()

	var lista []WeeklyEntry
	pos := 1
	for rows.Next() {
		var e WeeklyEntry
		rows.Scan(&e.JogadorID, &e.Nome, &e.Nivel, &e.Avatar, &e.Valor)
		e.Posicao = pos
		pos++
		lista = append(lista, e)
	}
	if lista == nil {
		lista = []WeeklyEntry{}
	}

	JsonResp(w, 200, map[string]interface{}{
		"sucesso": true,
		"semana":  semana,
		"tipo":    tipo,
		"ranking": lista,
	})
}

// ========================
// CASAS (passive progression)
// ========================

var casasConfig = map[string]CasaConfig{
	"basica": {Tipo: "basica", Nome: "Casa Básica", PrecoMoedas: 5, XPHora: 10, EnQuant: 5, EnIntMin: 15},
	"media":  {Tipo: "media", Nome: "Casa Média", PrecoMoedas: 15, XPHora: 20, EnQuant: 10, EnIntMin: 30},
	"top":    {Tipo: "top", Nome: "Casa Top", PrecoMoedas: 40, XPHora: 30, EnQuant: 15, EnIntMin: 30},
}

var casasOrdem = map[string]int{"": 0, "basica": 1, "media": 2, "top": 3}

// GET /api/casa/{jogador_id}
func HandleCasa(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	var tipo string
	var ultimaColetaEpoch int64
	err = db.Conn.QueryRow(`SELECT COALESCE(tipo,''), EXTRACT(EPOCH FROM ultima_coleta)::BIGINT
		FROM casas WHERE jogador_id=$1`, jogadorID).Scan(&tipo, &ultimaColetaEpoch)
	if err != nil {
		// No house
		listaConfig := []CasaConfig{}
		for _, c := range casasConfig {
			listaConfig = append(listaConfig, c)
		}
		JsonResp(w, 200, map[string]interface{}{
			"sucesso": true,
			"casa":    Casa{Tipo: ""},
			"casas_disponiveis": listaConfig,
		})
		return
	}

	cfg, ok := casasConfig[tipo]
	if !ok {
		// Has row but empty type
		listaConfig := []CasaConfig{}
		for _, c := range casasConfig {
			listaConfig = append(listaConfig, c)
		}
		JsonResp(w, 200, map[string]interface{}{
			"sucesso": true,
			"casa":    Casa{Tipo: ""},
			"casas_disponiveis": listaConfig,
		})
		return
	}

	// Calculate accumulated rewards (capped at 12 hours)
	agora := time.Now().Unix()
	diffSeg := agora - ultimaColetaEpoch
	if diffSeg < 0 {
		diffSeg = 0
	}
	maxSeg := int64(12 * 3600)
	if diffSeg > maxSeg {
		diffSeg = maxSeg
	}
	horas := float64(diffSeg) / 3600.0
	minutos := float64(diffSeg) / 60.0

	xpAcumulado := int(horas * float64(cfg.XPHora))
	enAcumulado := 0
	if cfg.EnIntMin > 0 {
		enAcumulado = int(minutos/float64(cfg.EnIntMin)) * cfg.EnQuant
	}

	casa := Casa{
		Tipo:            tipo,
		XPDisponivel:    xpAcumulado,
		EnDisponivel:    enAcumulado,
		HorasAcumuladas: horas,
		UltimaColeta:    ultimaColetaEpoch,
	}

	listaConfig := []CasaConfig{}
	for _, c := range casasConfig {
		listaConfig = append(listaConfig, c)
	}

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":           true,
		"casa":              casa,
		"casas_disponiveis": listaConfig,
	})
}

// POST /api/casa/comprar
func HandleCasaComprar(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int    `json:"jogador_id"`
		Tipo      string `json:"tipo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	cfg, ok := casasConfig[req.Tipo]
	if !ok {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Tipo de casa inválido!"})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	if jogador.Moedas < cfg.PrecoMoedas {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": fmt.Sprintf("Moedas insuficientes! Precisa de %d moedas.", cfg.PrecoMoedas)})
		return
	}

	// Check current house
	var tipoAtual string
	db.Conn.QueryRow("SELECT COALESCE(tipo,'') FROM casas WHERE jogador_id=$1", req.JogadorID).Scan(&tipoAtual)
	if casasOrdem[req.Tipo] <= casasOrdem[tipoAtual] {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você já tem uma casa igual ou melhor!"})
		return
	}

	jogador.Moedas -= cfg.PrecoMoedas
	saveJogador(jogador)

	db.Conn.Exec(`INSERT INTO casas (jogador_id, tipo, ultima_coleta)
		VALUES ($1, $2, NOW())
		ON CONFLICT (jogador_id) DO UPDATE SET tipo=$2, ultima_coleta=NOW()`,
		req.JogadorID, req.Tipo)

	atualizado, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Você comprou a %s!", cfg.Nome),
		"jogador":  atualizado,
	})
}

// POST /api/casa/coletar
func HandleCasaColetar(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	var tipo string
	var ultimaColetaEpoch int64
	err := db.Conn.QueryRow(`SELECT COALESCE(tipo,''), EXTRACT(EPOCH FROM ultima_coleta)::BIGINT
		FROM casas WHERE jogador_id=$1`, req.JogadorID).Scan(&tipo, &ultimaColetaEpoch)
	if err != nil || tipo == "" {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Você não tem uma casa!"})
		return
	}

	cfg, ok := casasConfig[tipo]
	if !ok {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Tipo de casa inválido!"})
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	agora := time.Now().Unix()
	diffSeg := agora - ultimaColetaEpoch
	if diffSeg < 0 {
		diffSeg = 0
	}
	maxSeg := int64(12 * 3600)
	if diffSeg > maxSeg {
		diffSeg = maxSeg
	}
	horas := float64(diffSeg) / 3600.0
	minutos := float64(diffSeg) / 60.0

	xpGanho := int(horas * float64(cfg.XPHora))
	enGanho := 0
	if cfg.EnIntMin > 0 {
		enGanho = int(minutos/float64(cfg.EnIntMin)) * cfg.EnQuant
	}

	if xpGanho == 0 && enGanho == 0 {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Nada acumulado ainda! Espere um pouco."})
		return
	}

	jogador.XP += xpGanho
	jogador.Energia = clampInt(jogador.Energia+enGanho, 0, jogador.EnergiaMax)

	// Level up check
	levelUp := false
	novoNivel := jogador.Nivel
	for jogador.XP >= jogador.XPProximo {
		jogador.XP -= jogador.XPProximo
		jogador.Nivel++
		jogador.XPProximo = calcularXPProximo(jogador.Nivel)
		jogador.EnergiaMax = calcEnergiaMaxBase(jogador.Nivel)
		jogador.Energia = jogador.EnergiaMax
		jogador.Forca++
		jogador.Velocidade++
		jogador.Habilidade++
		levelUp = true
		novoNivel = jogador.Nivel
	}

	saveJogador(jogador)
	db.Conn.Exec("UPDATE casas SET ultima_coleta=NOW() WHERE jogador_id=$1", req.JogadorID)

	// Combined missions: CASA_COLETA
	updateCombinedProgress(req.JogadorID, "CASA_COLETA", 1)

	atualizado, _ := getJogador(req.JogadorID)
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":    true,
		"mensagem":   fmt.Sprintf("Coletou +%d XP e +%d Energia da casa!", xpGanho, enGanho),
		"xp_ganho":   xpGanho,
		"en_ganho":   enGanho,
		"level_up":   levelUp,
		"novo_nivel": novoNivel,
		"jogador":    atualizado,
	})
}

// ========================
// EVENTOS TEMPORÁRIOS
// ========================

// GET /api/eventos
func HandleEventos(w http.ResponseWriter, r *http.Request) {
	eventos := getEventosAtivos()
	if eventos == nil {
		eventos = []Evento{}
	}
	JsonResp(w, 200, map[string]interface{}{
		"sucesso": true,
		"eventos": eventos,
	})
}

// ========================
// MISSÕES COMBINADAS
// ========================

// GET /api/combined-missions/{jogador_id}
func HandleCombinedMissions(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	hoje := hojeJogo()

	rows, err := db.Conn.Query(`SELECT cm.id, cm.nome, COALESCE(cm.descricao,''), COALESCE(cm.icone,''),
		cm.objetivo1_tipo, cm.objetivo1_alvo, cm.objetivo2_tipo, cm.objetivo2_alvo,
		COALESCE(cm.objetivo3_tipo,''), COALESCE(cm.objetivo3_alvo,0),
		cm.recompensa_xp, cm.recompensa_dinheiro, cm.recompensa_moedas,
		COALESCE(cp.obj1_progresso,0), COALESCE(cp.obj2_progresso,0), COALESCE(cp.obj3_progresso,0),
		COALESCE(cp.completada,FALSE)
		FROM combined_missions cm
		LEFT JOIN combined_progress cp ON cm.id = cp.mission_id AND cp.jogador_id=$1 AND cp.data=$2::DATE
		WHERE cm.ativo=TRUE`, jogadorID, hoje)
	if err != nil {
		ErrResp(w, 500, "Erro ao buscar missões")
		return
	}
	defer rows.Close()

	var lista []CombinedMission
	for rows.Next() {
		var m CombinedMission
		rows.Scan(&m.ID, &m.Nome, &m.Descricao, &m.Icone,
			&m.Obj1Tipo, &m.Obj1Alvo, &m.Obj2Tipo, &m.Obj2Alvo,
			&m.Obj3Tipo, &m.Obj3Alvo,
			&m.RecompensaXP, &m.RecompensaDin, &m.RecompensaMoed,
			&m.Obj1Progresso, &m.Obj2Progresso, &m.Obj3Progresso,
			&m.Completada)
		lista = append(lista, m)
	}
	if lista == nil {
		lista = []CombinedMission{}
	}

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"missoes":  lista,
	})
}

// ========================
// FAMA — STATUS & PATROCÍNIO
// ========================

// GET /api/fama/{jogador_id}
func HandleFamaStatus(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	jogadorID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	jogador, err := getJogador(jogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	rank := GetFamaRank(jogador.PontosFama)

	// Calcula patrocínio acumulado
	var ultimaColetaEpoch int64
	db.Conn.QueryRow(`SELECT COALESCE(EXTRACT(EPOCH FROM ultima_coleta_patrocinio)::BIGINT, 0)
		FROM jogadores WHERE id=$1`, jogadorID).Scan(&ultimaColetaEpoch)

	dinheiroAcumulado := 0
	if rank.RendaHora > 0 && ultimaColetaEpoch > 0 {
		agora := time.Now().Unix()
		diffSeg := agora - ultimaColetaEpoch
		if diffSeg > 12*3600 {
			diffSeg = 12 * 3600
		}
		if diffSeg > 0 {
			horas := float64(diffSeg) / 3600.0
			dinheiroAcumulado = int(horas * float64(rank.RendaHora))
		}
	}

	// Atividade de hoje
	hoje := hojeJogo()
	var fezPvpHoje, logouHoje bool
	db.Conn.QueryRow(`SELECT COALESCE(fez_pvp, FALSE), COALESCE(logou, FALSE)
		FROM fama_atividade WHERE jogador_id=$1 AND data=$2`, jogadorID, hoje).Scan(&fezPvpHoje, &logouHoje)

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":              true,
		"fama":                 jogador.PontosFama,
		"rank":                 rank,
		"ranks":                GetAllFamaRanks(),
		"patrocinio_acumulado": dinheiroAcumulado,
		"fez_pvp_hoje":         fezPvpHoje,
		"protegido":            fezPvpHoje,
	})
}

// POST /api/fama/coletar-patrocinio
func HandleColetarPatrocinio(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		ErrResp(w, 405, "Método não permitido")
		return
	}

	var req struct {
		JogadorID int `json:"jogador_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	dinheiro, moedas, err := ColetarPatrocinio(req.JogadorID)
	if err != nil {
		JsonResp(w, 200, map[string]interface{}{"sucesso": false, "mensagem": "Nada para coletar ainda."})
		return
	}

	jogador, _ := getJogador(req.JogadorID)
	msg := fmt.Sprintf("Patrocínio coletado! +R$ %d", dinheiro)
	if moedas > 0 {
		msg += fmt.Sprintf(" +%d moedas", moedas)
	}

	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"mensagem": msg,
		"dinheiro": dinheiro,
		"moedas":   moedas,
		"jogador":  jogador,
	})
}

// POST /api/fama/decaimento (chamado internamente ou via cron)
func HandleFamaDecaimento(w http.ResponseWriter, r *http.Request) {
	afetados := AplicarDecaimentoFama()
	JsonResp(w, 200, map[string]interface{}{
		"sucesso":  true,
		"afetados": afetados,
	})
}
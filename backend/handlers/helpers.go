package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"joga-craque/db"
)

// ========================
// TIMEZONE & COOLDOWNS
// ========================

var spLoc *time.Location

func init() {
	var err error
	spLoc, err = time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		// Fallback: GMT-3 fixo
		spLoc = time.FixedZone("BRT", -3*60*60)
	}
}

// Retorna a hora atual em São Paulo
func nowSP() time.Time {
	return time.Now().In(spLoc)
}

// Retorna a data do "dia do jogo" (reseta às 08:00 SP)
// Se são 07:59 SP → ainda é "ontem". Se são 08:00 → já é "hoje".
func hojeJogo() string {
	sp := nowSP()
	if sp.Hour() < 8 {
		sp = sp.AddDate(0, 0, -1)
	}
	return sp.Format("2006-01-02")
}

// Retorna a data de "ontem" do jogo (mesmo critério do hojeJogo)
func ontemJogo() string {
	sp := nowSP()
	if sp.Hour() < 8 {
		sp = sp.AddDate(0, 0, -2)
	} else {
		sp = sp.AddDate(0, 0, -1)
	}
	return sp.Format("2006-01-02")
}

// Retorna a data do "período do desafio 1v1" (reseta 08:00 e 18:00 SP)
// Período 1: 08:00-17:59 | Período 2: 18:00-07:59
func periodoDesafio() string {
	sp := nowSP()
	h := sp.Hour()
	if h >= 8 && h < 18 {
		return sp.Format("2006-01-02") + "_AM"
	}
	if h >= 18 {
		return sp.Format("2006-01-02") + "_PM"
	}
	// 00:00-07:59 = ainda é o período PM do dia anterior
	ontem := sp.AddDate(0, 0, -1)
	return ontem.Format("2006-01-02") + "_PM"
}

// Minigame: cooldown de 2h. Retorna (podeJogar, segundosRestantes)
func statusMinigame(jogadorID int) (bool, int64) {
	var ultimoEm int64
	db.Conn.QueryRow(`SELECT COALESCE(EXTRACT(EPOCH FROM ultimo_minigame)::BIGINT, 0)
		FROM jogadores WHERE id=$1`, jogadorID).Scan(&ultimoEm)
	if ultimoEm == 0 {
		return true, 0
	}
	restante := (ultimoEm + 7200) - time.Now().Unix()
	if restante <= 0 {
		return true, 0
	}
	return false, restante
}

func podeJogarMinigame(jogadorID int) bool {
	pode, _ := statusMinigame(jogadorID)
	return pode
}

// ========================
// HELPERS E UTILITÁRIOS
// ========================

func calcEnergiaMaxBase(nivel int) int {
	// Calibrado para consumir ~1 barra completa por nível em cada faixa:
	// Nível  1 → 11  |  5 → 19  |  9 → 25  | 10 → 34
	// Nível 15 → 44  | 20 → 74  | 35 → 152 | 50 → 263
	// Nível 75 → 473 | 100 → 753
	base := 10 + nivel + nivel*nivel/25
	if nivel >= 5 {
		base += 3 // Base
	}
	if nivel >= 10 {
		base += 7 // Amador
	}
	if nivel >= 20 {
		base += 18 // Profissional
	}
	if nivel >= 35 {
		base += 30 // Craque
	}
	if nivel >= 50 {
		base += 45 // Elite
	}
	if nivel >= 75 {
		base += 60 // Estrela
	}
	if nivel >= 100 {
		base += 80 // Lenda
	}
	return base
}

func calcularXPProximo(nivel int) int {
	// Curva rebalanceada — ~15 dias intensivos até L40
	// Nível  1 →  15  |  5 →  75  | 10 → 200   (inicio rápido)
	// Nível 11 → 583  | 15 → 975  | 20 → 1600  (progressão firme)
	// Nível 21 → 3276 | 30 → 6300 | 40 → 10800 (desafiador)
	// Nível 50 → 16500 | 75 → 55875 | 100 → 101500 (endgame pesado)
	n := nivel
	switch {
	case n <= 10:
		if n == 1 {
			return 15
		}
		return n*n + n*10
	case n <= 20:
		return n*n*3 + n*20
	case n <= 50:
		return n*n*6 + n*30
	default:
		return n*n*10 + n*150 - 800
	}
}

func getRank(nivel int) string {
	switch {
	case nivel >= 150: return "Deus do Futebol"
	case nivel >= 100: return "Imortal"
	case nivel >= 75:  return "Lenda"
	case nivel >= 60:  return "Ídolo Nacional"
	case nivel >= 45:  return "Estrela"
	case nivel >= 35:  return "Craque"
	case nivel >= 25:  return "Profissional"
	case nivel >= 18:  return "Semi-Pro"
	case nivel >= 12:  return "Revelação"
	case nivel >= 8:   return "Promessa"
	case nivel >= 5:   return "Talento do Bairro"
	case nivel >= 3:   return "Garoto de Rua"
	default:           return "Peladeiro"
	}
}

func findItemByID(id int) *Item {
	var item Item
	err := db.Conn.QueryRow(`SELECT id, nome, descricao, preco, COALESCE(preco_moedas, 0), tipo, icone, COALESCE(raridade, 'comum'), nivel_min, nivel_max,
		bonus_forca, bonus_velocidade, bonus_habilidade, bonus_saude_max, bonus_energia_max,
		bonus_vit_max, recupera_energia, recupera_saude, slots_mochila, cooldown_minutos
		FROM cat_itens WHERE id=$1`, id).Scan(
		&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.PrecoMoedas, &item.Tipo, &item.Icone,
		&item.Raridade, &item.NivelMin, &item.NivelMax, &item.BonusForca, &item.BonusVelocidade,
		&item.BonusHabilidade, &item.BonusSaudeMax, &item.BonusEnergiaMax,
		&item.BonusVitMax, &item.RecuperaEnergia, &item.RecuperaSaude, &item.SlotsMochila,
		&item.CooldownMinutos)
	if err != nil {
		return nil
	}
	return &item
}

func calcularProximoItemEnergia(jogadorID, itemID int) int64 {
	var usadoEm time.Time
	db.Conn.QueryRow("SELECT usado_em FROM cooldown_item_jogador WHERE jogador_id=$1 AND item_id=$2",
		jogadorID, itemID).Scan(&usadoEm)
	if usadoEm.IsZero() {
		return 0
	}
	item := findItemByID(itemID)
	if item == nil || item.CooldownMinutos <= 0 {
		return 0
	}
	proximo := usadoEm.Add(time.Duration(item.CooldownMinutos) * time.Minute)
	if proximo.Before(time.Now()) {
		return 0
	}
	return proximo.Unix()
}

func findTrabalhoByID(id string) *Trabalho {
	var t Trabalho
	err := db.Conn.QueryRow(`SELECT id, nome, tier, nivel_min, energia, ganho_min, ganho_max, ganho_xp, requer_item, icone, limite_diario
		FROM cat_trabalhos WHERE id=$1`, id).Scan(
		&t.ID, &t.Nome, &t.Tier, &t.NivelMin, &t.Energia, &t.GanhoMin, &t.GanhoMax, &t.GanhoXP, &t.RequereItem, &t.Icone, &t.LimiteDiario)
	if err != nil {
		return nil
	}
	return &t
}

func estaBloquadoHoje(jogadorID int, trabalhoID string) bool {
	hoje := hojeJogo()
	var count int
	db.Conn.QueryRow("SELECT COUNT(*) FROM trabalhos_bloqueados_hoje WHERE jogador_id=$1 AND trabalho_id=$2 AND data=$3",
		jogadorID, trabalhoID, hoje).Scan(&count)
	return count > 0
}

func bloquearTrabalhoHoje(jogadorID int, trabalhoID string) {
	hoje := hojeJogo()
	db.Conn.Exec(`INSERT INTO trabalhos_bloqueados_hoje (jogador_id, trabalho_id, data)
		VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, jogadorID, trabalhoID, hoje)
}

func listarBloqueadosHoje(jogadorID int) []string {
	hoje := hojeJogo()
	rows, err := db.Conn.Query("SELECT trabalho_id FROM trabalhos_bloqueados_hoje WHERE jogador_id=$1 AND data=$2",
		jogadorID, hoje)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids
}

// Fator de energia por tier (replica utils.js no backend)
var tierFatorEnergia = map[string]float64{
	"Garoto": 0.10, "Base": 0.15, "Amador": 0.22,
	"Série C": 0.28, "Série B": 0.32, "Série A": 0.38,
	"Copinha Nacional": 0.42, "Continentão": 0.48, "Europa": 0.55,
	"Liga dos Craques": 0.62, "Seleçoca": 0.70, "Mundialito": 0.78,
	"Bola de Ouro": 0.82, "Ídolo": 0.88, "Lenda": 0.95,
}

func calcCustoEnergia(energiaBase, nivel int, tier string) int {
	fator := tierFatorEnergia[tier]
	if fator == 0 {
		fator = 0.10
	}
	custo := float64(energiaBase) + float64(nivel)*fator
	if nivel >= 40 {
		custo += float64(nivel-40) * 0.12
	}
	if nivel >= 70 {
		custo += float64(nivel-70) * 0.18
	}
	if nivel >= 90 {
		custo += float64(nivel-90) * 0.25
	}
	if (tier == "Estrela" || tier == "Lenda") && nivel >= 100 {
		if int(custo) < 80 {
			custo = 80
		}
	}
	r := int(custo + 0.5) // round
	if r < 1 {
		r = 1
	}
	return r
}

func calcRecompensaTrabalho(trabalho *Trabalho, nivel int) (ganhoMin, ganhoMax, ganhoXP int) {
	lvl := float64(nivel)
	// Dinheiro: crescimento reduzido (~30% menos que antes)
	fatorMin := 1.0 + lvl*0.022
	fatorMax := 1.0 + lvl*0.025
	// XP bonus por nível: mais contido
	bonusXP := int(lvl * 0.4)

	if nivel >= 30 {
		fatorMin += 0.05
		fatorMax += 0.06
		bonusXP += 2
	}
	if nivel >= 60 {
		fatorMin += 0.10
		fatorMax += 0.12
		bonusXP += 4
	}
	if nivel >= 90 {
		fatorMin += 0.15
		fatorMax += 0.18
		bonusXP += 8
	}

	ganhoMin = int(float64(trabalho.GanhoMin)*fatorMin + 0.5)
	ganhoMax = int(float64(trabalho.GanhoMax)*fatorMax + 0.5)
	ganhoXP = trabalho.GanhoXP + bonusXP
	return
}

// Fator de redução por maestria: quanto mais fez o trabalho, menos rende.
// Maestria 0-9 (nível 1): 100% | 10-24 (nível 2): 85% | 25-49 (nível 3): 70%
// 50-99 (nível 4): 58% | 100-199 (nível 5): 48% | 200+ (nível 6): 40%
// Piso de 40% — jogador nunca trava, só rende menos.
func calcFatorMaestria(vezes int) float64 {
	switch {
	case vezes < 10:
		return 1.0
	case vezes < 25:
		return 0.85
	case vezes < 50:
		return 0.70
	case vezes < 100:
		return 0.58
	case vezes < 200:
		return 0.48
	default:
		return 0.40
	}
}

// Tiers ordenados por progressão
var tierOrdem = []string{
	"Garoto", "Base", "Amador", "Série C", "Série B", "Série A",
	"Copinha Nacional", "Continentão", "Europa", "Liga dos Craques",
	"Seleçoca", "Mundialito", "Bola de Ouro", "Ídolo", "Lenda",
}

func getTierDoJogador(nivel int) string {
	switch {
	case nivel >= 190:
		return "Lenda"
	case nivel >= 160:
		return "Ídolo"
	case nivel >= 135:
		return "Bola de Ouro"
	case nivel >= 115:
		return "Mundialito"
	case nivel >= 100:
		return "Seleçoca"
	case nivel >= 85:
		return "Liga dos Craques"
	case nivel >= 72:
		return "Europa"
	case nivel >= 60:
		return "Continentão"
	case nivel >= 50:
		return "Copinha Nacional"
	case nivel >= 40:
		return "Série A"
	case nivel >= 30:
		return "Série B"
	case nivel >= 20:
		return "Série C"
	case nivel >= 10:
		return "Amador"
	case nivel >= 5:
		return "Base"
	default:
		return "Garoto"
	}
}

// Verifica se o jogador pode fazer trabalhos de um tier.
// Regra: só pode fazer tier atual, tiers superiores, e Amador (sempre liberado).
func podeFazerTier(tierTrabalho, tierJogador string) bool {
	if tierTrabalho == "Amador" {
		return true // Amador sempre disponível
	}
	idxTrabalho := -1
	idxJogador := -1
	for i, t := range tierOrdem {
		if t == tierTrabalho {
			idxTrabalho = i
		}
		if t == tierJogador {
			idxJogador = i
		}
	}
	// Pode fazer se o tier do trabalho é >= tier do jogador
	return idxTrabalho >= idxJogador
}

// Cooldown de 2h por TIER (classe)
func getCooldownTier(jogadorID int, tier string) int64 {
	var ultimoEm int64
	db.Conn.QueryRow(`SELECT COALESCE(EXTRACT(EPOCH FROM ultimo_em)::BIGINT, 0)
		FROM cooldown_trabalhos WHERE jogador_id=$1 AND trabalho_id=$2`,
		jogadorID, tier).Scan(&ultimoEm)
	if ultimoEm == 0 {
		return 0
	}
	agora := time.Now().Unix()
	restante := (ultimoEm + 7200) - agora // 7200 = 2 horas
	if restante <= 0 {
		return 0
	}
	return restante
}

func registrarCooldownTier(jogadorID int, tier string) {
	db.Conn.Exec(`INSERT INTO cooldown_trabalhos (jogador_id, trabalho_id, ultimo_em)
		VALUES ($1, $2, NOW())
		ON CONFLICT (jogador_id, trabalho_id) DO UPDATE SET ultimo_em = NOW()`,
		jogadorID, tier)
}

func findItemPremiumByID(id int) *ItemPremium {
	var item ItemPremium
	err := db.Conn.QueryRow(`SELECT id, nome, descricao, preco, tipo, icone, avatar_id, titulo_val, mochila_slots
		FROM cat_itens_premium WHERE id=$1`, id).Scan(
		&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.Tipo, &item.Icone,
		&item.AvatarID, &item.TituloVal, &item.MochilaSlots)
	if err != nil {
		return nil
	}
	return &item
}

func getJogador(id int) (*JogadorData, error) {
	var j JogadorData
	err := db.Conn.QueryRow(`
		SELECT id, nome, nivel, xp, xp_proximo, energia, energia_max, vitalidade, vitalidade_max,
		       saude, saude_max, forca, velocidade, habilidade, dinheiro_mao, dinheiro_banco,
		       pontos_fama, vitorias, derrotas, avatar, capacidade_mochila,
		       moedas, cooldown_premium, titulo, avatares_premium, itens_fama, tutorial_step,
		       codigo_amigo, inventario_publico, posicao, titulos, COALESCE(pvp_streak, 0),
		       COALESCE(clube_id,0), COALESCE(numero_camisa,0)
		FROM jogadores WHERE id = $1`, id).Scan(
		&j.ID, &j.Nome, &j.Nivel, &j.XP, &j.XPProximo, &j.Energia, &j.EnergiaMax,
		&j.Vitalidade, &j.VitalidadeMax, &j.Saude, &j.SaudeMax, &j.Forca, &j.Velocidade,
		&j.Habilidade, &j.DinheiroMao, &j.DinheiroBanco, &j.PontosFama, &j.Vitorias, &j.Derrotas, &j.Avatar,
		&j.CapacidadeMochila, &j.Moedas, &j.CooldownPremium, &j.Titulo, &j.AvataresPremium, &j.ItensFama, &j.TutorialStep,
		&j.CodigoAmigo, &j.InventarioPublico, &j.Posicao, &j.Titulos, &j.PvpStreak,
		&j.ClubeID, &j.NumeroCamisa)
	if err != nil {
		return nil, err
	}
	j.Rank = getRank(j.Nivel)
	esperado := calcEnergiaMaxBase(j.Nivel)
	if j.EnergiaMax != esperado {
		j.EnergiaMax = esperado
		j.Energia = clampInt(j.Energia, 0, j.EnergiaMax)
		db.Conn.Exec("UPDATE jogadores SET energia_max=$1, energia=$2 WHERE id=$3", j.EnergiaMax, j.Energia, j.ID)
	}
	return &j, nil
}

func saveJogador(j *JogadorData) error {
	_, err := db.Conn.Exec(`
		UPDATE jogadores SET nivel=$1, xp=$2, xp_proximo=$3, energia=$4, energia_max=$5,
		vitalidade=$6, vitalidade_max=$7, saude=$8, saude_max=$9, forca=$10, velocidade=$11,
		habilidade=$12, dinheiro_mao=$13, dinheiro_banco=$14, pontos_fama=$15,
		vitorias=$16, derrotas=$17, avatar=$18, capacidade_mochila=$19,
		moedas=$20, cooldown_premium=$21, titulo=$22, avatares_premium=$23, itens_fama=$24, tutorial_step=$25,
		codigo_amigo=$26, inventario_publico=$27, posicao=$28, titulos=$29, pvp_streak=$30,
		clube_id=$31, numero_camisa=$32, ultima_atualizacao=NOW()
		WHERE id=$33`,
		j.Nivel, j.XP, j.XPProximo, j.Energia, j.EnergiaMax, j.Vitalidade, j.VitalidadeMax,
		j.Saude, j.SaudeMax, j.Forca, j.Velocidade, j.Habilidade, j.DinheiroMao, j.DinheiroBanco,
		j.PontosFama, j.Vitorias, j.Derrotas, j.Avatar, j.CapacidadeMochila,
		j.Moedas, j.CooldownPremium, j.Titulo, j.AvataresPremium, j.ItensFama, j.TutorialStep,
		j.CodigoAmigo, j.InventarioPublico, j.Posicao, j.Titulos, j.PvpStreak,
		j.ClubeID, j.NumeroCamisa, j.ID)
	return err
}

func temItem(jogadorID, itemID int) bool {
	var count int
	db.Conn.QueryRow("SELECT COUNT(*) FROM inventario WHERE jogador_id=$1 AND item_id=$2 AND quantidade > 0", jogadorID, itemID).Scan(&count)
	return count > 0
}

func regenerarRecurso(id int, colTimer, colValor string, valorAtual, valorMax int, intervalo time.Duration, porTick int) (novoValor int, proximoTick int64) {
	var ultimaRecarga time.Time
	err := db.Conn.QueryRow("SELECT "+colTimer+" FROM jogadores WHERE id=$1", id).Scan(&ultimaRecarga)
	if err != nil || ultimaRecarga.IsZero() {
		agora := time.Now()
		db.Conn.Exec("UPDATE jogadores SET "+colTimer+"=$1 WHERE id=$2", agora, id)
		return valorAtual, agora.Add(intervalo).Unix()
	}

	agora := time.Now()
	ticks := int(agora.Sub(ultimaRecarga) / intervalo)

	if ticks > 0 {
		novaRecarga := ultimaRecarga.Add(time.Duration(ticks) * intervalo)
		if valorAtual < valorMax {
			valorAtual = clampInt(valorAtual+ticks*porTick, 0, valorMax)
			db.Conn.Exec("UPDATE jogadores SET "+colValor+"=$1, "+colTimer+"=$2 WHERE id=$3", valorAtual, novaRecarga, id)
		} else {
			db.Conn.Exec("UPDATE jogadores SET "+colTimer+"=$1 WHERE id=$2", novaRecarga, id)
		}
		ultimaRecarga = novaRecarga
	}

	return valorAtual, ultimaRecarga.Add(intervalo).Unix()
}

func regenerarEnergia(j *JogadorData) int64 {
	porTick := j.EnergiaMax / 15
	if porTick < 1 {
		porTick = 1
	}
	novoVal, proximo := regenerarRecurso(j.ID, "energia_ultima_recarga", "energia", j.Energia, j.EnergiaMax, 5*time.Minute, porTick)
	j.Energia = novoVal
	return proximo
}

func regenerarVitalidade(j *JogadorData) int64 {
	novoVal, proximo := regenerarRecurso(j.ID, "vitalidade_ultima_recarga", "vitalidade", j.Vitalidade, j.VitalidadeMax, 30*time.Minute, 1)
	j.Vitalidade = novoVal
	return proximo
}

func regenerarSaude(j *JogadorData) int64 {
	novoVal, proximo := regenerarRecurso(j.ID, "saude_ultima_recarga", "saude", j.Saude, j.SaudeMax, 10*time.Minute, 9)
	j.Saude = novoVal
	return proximo
}

func calcularProximoConsumivel(id int, cooldownPremium bool) int64 {
	var ultimo time.Time
	db.Conn.QueryRow("SELECT ultimo_consumivel_usado FROM jogadores WHERE id=$1", id).Scan(&ultimo)
	dur := 10 * time.Minute
	if cooldownPremium {
		dur = 5 * time.Minute
	}
	proximo := ultimo.Add(dur)
	if proximo.Before(time.Now()) {
		return 0
	}
	return proximo.Unix()
}

func calcularProximoEnergiaConsumivel(id int) int64 {
	var ultimo time.Time
	db.Conn.QueryRow("SELECT ultimo_energia_consumivel FROM jogadores WHERE id=$1", id).Scan(&ultimo)
	proximo := ultimo.Add(3 * time.Minute)
	if proximo.Before(time.Now()) {
		return 0
	}
	return proximo.Unix()
}

func atualizarProgressoTask(jogadorID int, tipo string, quantidade int) {
	hoje := hojeJogo()
	rows, err := db.Conn.Query(`SELECT id, objetivo FROM cat_tasks_diarias WHERE tipo=$1`, tipo)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var taskID string
		var objetivo int
		if rows.Scan(&taskID, &objetivo) != nil {
			continue
		}
		db.Conn.Exec(`
			INSERT INTO tasks_progresso (jogador_id, task_id, data, progresso, completada)
			VALUES ($1, $2, $3, $4, false)
			ON CONFLICT (jogador_id, task_id, data)
			DO UPDATE SET progresso = LEAST(tasks_progresso.progresso + $4, $5)
			WHERE tasks_progresso.completada = false`,
			jogadorID, taskID, hoje, quantidade, objetivo)
	}
}

// maestriaThresholds são os limites de vezes que definem cada nível de maestria
var maestriaThresholds = [5]int{10, 25, 50, 100, 200}

// maestriaTierXP define o bônus de XP ao completar todos os trabalhos de um tier no nível de maestria
// Índices: [0]=nivel2(10x), [1]=nivel3(25x), [2]=nivel4(50x), [3]=nivel5(100x), [4]=nivel6(200x)
var maestriaTierXP = map[string][5]int{
	"Garoto":       {200, 600, 1500, 4000, 10000},
	"Base":         {600, 1800, 4500, 12000, 30000},
	"Amador":       {1500, 4500, 12000, 32000, 80000},
	"Profissional": {3500, 10000, 28000, 75000, 200000},
	"Craque":       {8000, 24000, 65000, 175000, 450000},
	"Elite":        {18000, 55000, 150000, 400000, 1000000},
	"Estrela":      {40000, 120000, 330000, 900000, 2500000},
	"Lenda":        {90000, 270000, 750000, 2000000, 5500000},
}

func verificarMaestriaTierBonus(jogadorID int, tier string, vezesFeito int) int {
	// Verifica se vezesFeito acabou de cruzar algum threshold
	nivelIdx := -1
	for i, t := range maestriaThresholds {
		if vezesFeito == t {
			nivelIdx = i
			break
		}
	}
	if nivelIdx < 0 {
		return 0
	}
	threshold := maestriaThresholds[nivelIdx]

	// Verifica se TODOS os trabalhos do tier atingiram esse threshold
	var totalJobs, completedJobs int
	db.Conn.QueryRow(`SELECT COUNT(*) FROM cat_trabalhos WHERE tier=$1`, tier).Scan(&totalJobs)
	if totalJobs == 0 {
		return 0
	}
	db.Conn.QueryRow(`
		SELECT COUNT(*) FROM maestria_trabalhos
		WHERE jogador_id=$1 AND vezes_feito >= $2
		AND trabalho_id IN (SELECT id FROM cat_trabalhos WHERE tier=$3)`,
		jogadorID, threshold, tier).Scan(&completedJobs)
	if completedJobs < totalJobs {
		return 0
	}

	// Verifica se o bônus já foi concedido
	var existe int
	db.Conn.QueryRow(`SELECT COUNT(*) FROM maestria_tier_bonus WHERE jogador_id=$1 AND tier=$2 AND nivel=$3`,
		jogadorID, tier, nivelIdx+2).Scan(&existe)
	if existe > 0 {
		return 0
	}

	// Registra e retorna o bônus
	db.Conn.Exec(`INSERT INTO maestria_tier_bonus (jogador_id, tier, nivel) VALUES ($1,$2,$3)`,
		jogadorID, tier, nivelIdx+2)

	rewards, ok := maestriaTierXP[tier]
	if !ok {
		return 0
	}
	return rewards[nivelIdx]
}

func getConfigProgressao() ConfigProgressao {
	cfg := ConfigProgressao{
		VariedadeBonus3: 0.10,
		VariedadeBonus4: 0.20,
		VariedadeBonus5: 0.30,
	}
	rows, err := db.Conn.Query("SELECT chave, valor FROM config_progressao")
	if err != nil {
		return cfg
	}
	defer rows.Close()
	for rows.Next() {
		var chave string
		var valor float64
		if rows.Scan(&chave, &valor) != nil {
			continue
		}
		switch chave {
		case "variedade_bonus_3":
			cfg.VariedadeBonus3 = valor
		case "variedade_bonus_4":
			cfg.VariedadeBonus4 = valor
		case "variedade_bonus_5":
			cfg.VariedadeBonus5 = valor
		}
	}
	return cfg
}

func contarTrabalhoHoje(jogadorID int, trabalhoID string) int {
	hoje := hojeJogo()
	var vezes int
	db.Conn.QueryRow("SELECT vezes FROM trabalhos_hoje WHERE jogador_id=$1 AND trabalho_id=$2 AND data=$3",
		jogadorID, trabalhoID, hoje).Scan(&vezes)
	return vezes
}

func registrarTrabalhoHoje(jogadorID int, trabalhoID string) int {
	hoje := hojeJogo()
	var vezes int
	db.Conn.QueryRow(`
		INSERT INTO trabalhos_hoje (jogador_id, trabalho_id, data, vezes)
		VALUES ($1, $2, $3, 1)
		ON CONFLICT (jogador_id, trabalho_id, data)
		DO UPDATE SET vezes = trabalhos_hoje.vezes + 1
		RETURNING vezes`,
		jogadorID, trabalhoID, hoje).Scan(&vezes)
	return vezes
}

func contarVariedadeHoje(jogadorID int, tier string) int {
	hoje := hojeJogo()
	var count int
	db.Conn.QueryRow(`SELECT COUNT(DISTINCT th.trabalho_id)
		FROM trabalhos_hoje th
		JOIN cat_trabalhos ct ON ct.id = th.trabalho_id
		WHERE th.jogador_id=$1 AND th.data=$2 AND ct.tier=$3`,
		jogadorID, hoje, tier).Scan(&count)
	return count
}

func contarVariedadePorTier(jogadorID int) map[string]int {
	hoje := hojeJogo()
	rows, err := db.Conn.Query(`SELECT ct.tier, COUNT(DISTINCT th.trabalho_id)
		FROM trabalhos_hoje th
		JOIN cat_trabalhos ct ON ct.id = th.trabalho_id
		WHERE th.jogador_id=$1 AND th.data=$2
		GROUP BY ct.tier`, jogadorID, hoje)
	if err != nil {
		return map[string]int{}
	}
	defer rows.Close()
	m := map[string]int{}
	for rows.Next() {
		var tier string
		var count int
		rows.Scan(&tier, &count)
		m[tier] = count
	}
	return m
}

func calcularBonusVariedadeXP(diferentesHoje, ganhoXP int, cfg ConfigProgressao) int {
	if diferentesHoje >= 3 {
		return int(float64(ganhoXP) * cfg.VariedadeBonus3)
	}
	return 0
}

func clampInt(val, lo, hi int) int {
	if val < lo {
		return lo
	}
	if val > hi {
		return hi
	}
	return val
}

func JsonResp(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func ErrResp(w http.ResponseWriter, status int, msg string) {
	JsonResp(w, status, map[string]interface{}{"sucesso": false, "mensagem": msg})
}

func Cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

// ========================
// WEEKLY RANKING HELPERS
// ========================

func semanaAtual() string {
	sp := nowSP()
	year, week := sp.ISOWeek()
	return fmt.Sprintf("%d-W%02d", year, week)
}

func registrarWeekly(jogadorID int, campo string, valor int) {
	semana := semanaAtual()
	db.Conn.Exec(`INSERT INTO weekly_ranking (jogador_id, semana, `+campo+`)
		VALUES ($1, $2, $3)
		ON CONFLICT (jogador_id, semana) DO UPDATE SET `+campo+` = weekly_ranking.`+campo+` + $3`,
		jogadorID, semana, valor)
}

// ========================
// SKILL MISSIONS HELPER
// ========================

func updateSkillProgress(jogadorID int, tipo string, valor int) []string {
	var completed []string

	rows, err := db.Conn.Query(`SELECT id, nome, alvo, recompensa_xp, recompensa_moedas FROM skill_missions WHERE tipo=$1 AND ativo=TRUE`, tipo)
	if err != nil {
		return completed
	}
	defer rows.Close()

	for rows.Next() {
		var id, nome string
		var alvo, recompensaXP, recompensaMoedas int
		rows.Scan(&id, &nome, &alvo, &recompensaXP, &recompensaMoedas)

		if valor < alvo {
			continue
		}

		// Check if already completed
		var jaCompletada bool
		db.Conn.QueryRow(`SELECT completada FROM skill_progress WHERE jogador_id=$1 AND mission_id=$2`, jogadorID, id).Scan(&jaCompletada)
		if jaCompletada {
			continue
		}

		// Mark as complete
		db.Conn.Exec(`INSERT INTO skill_progress (jogador_id, mission_id, progresso, completada)
			VALUES ($1, $2, $3, TRUE)
			ON CONFLICT (jogador_id, mission_id) DO UPDATE SET progresso=$3, completada=TRUE`,
			jogadorID, id, valor)

		// Give rewards
		db.Conn.Exec(`UPDATE jogadores SET xp = xp + $1, moedas = moedas + $2 WHERE id=$3`, recompensaXP, recompensaMoedas, jogadorID)

		completed = append(completed, nome)
	}

	return completed
}

// ========================
// STREAK REWARD CALC
// ========================

func calcStreakRecompensa(dias int) *StreakRecompensa {
	ciclo := dias % 7
	if ciclo == 0 && dias > 0 {
		ciclo = 7
	}
	switch ciclo {
	case 1:
		return &StreakRecompensa{XP: 50, Desc: "+50 XP"}
	case 2:
		return &StreakRecompensa{XP: 80, Desc: "+80 XP"}
	case 3:
		return &StreakRecompensa{XP: 120, Energia: 10, Desc: "+120 XP +10 Energia"}
	case 4:
		return &StreakRecompensa{XP: 50, Desc: "+50 XP"}
	case 5:
		return &StreakRecompensa{XP: 200, Energia: 20, Desc: "+200 XP +20 Energia"}
	case 6:
		return &StreakRecompensa{XP: 80, Desc: "+80 XP"}
	case 7:
		return &StreakRecompensa{XP: 500, ItemID: 65, Desc: "+500 XP +Água de Coco"}
	default:
		return &StreakRecompensa{XP: 50, Desc: "+50 XP"}
	}
}

// ========================
// EVENTOS TEMPORÁRIOS — helpers
// ========================

func getEventosAtivos() []Evento {
	rows, err := db.Conn.Query(`SELECT id, nome, COALESCE(descricao,''), tipo, multiplicador,
		EXTRACT(EPOCH FROM inicio)::BIGINT, EXTRACT(EPOCH FROM fim)::BIGINT
		FROM eventos WHERE ativo=TRUE AND NOW() BETWEEN inicio AND fim`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var lista []Evento
	for rows.Next() {
		var e Evento
		rows.Scan(&e.ID, &e.Nome, &e.Descricao, &e.Tipo, &e.Multiplicador, &e.Inicio, &e.Fim)
		lista = append(lista, e)
	}
	return lista
}

func getMultiplicadorEvento(tipo string) float64 {
	eventos := getEventosAtivos()
	mult := 1.0
	for _, e := range eventos {
		if e.Tipo == tipo {
			mult *= e.Multiplicador
		}
	}
	return mult
}

// ========================
// SISTEMA DE FAMA — RANKS, PATROCÍNIOS, DECAIMENTO
// ========================

type FamaRankInfo struct {
	Rank       string  `json:"rank"`
	Min        int     `json:"min"`
	Max        int     `json:"max"`
	BonusXP    float64 `json:"bonus_xp"`
	Patrocinio string  `json:"patrocinio"`
	RendaHora  int     `json:"renda_hora"`
	MoedasDia  int     `json:"moedas_dia"`
}

var famaRanks = []FamaRankInfo{
	{"Desconhecido", 0, 499, 0, "", 0, 0},
	{"Promessa", 500, 1999, 0.05, "Loja do Bairro", 30, 0},
	{"Famoso", 2000, 4999, 0.10, "Raio Sports", 100, 0},
	{"Estrela", 5000, 9999, 0.15, "Listrada Pro", 300, 0},
	{"Ídolo", 10000, 19999, 0.20, "Touro Energy", 700, 1},
	{"Lenda Viva", 20000, 999999999, 0.25, "Mega Sponsor", 1500, 3},
}

func GetFamaRank(fama int) FamaRankInfo {
	for i := len(famaRanks) - 1; i >= 0; i-- {
		if fama >= famaRanks[i].Min {
			return famaRanks[i]
		}
	}
	return famaRanks[0]
}

func GetAllFamaRanks() []FamaRankInfo {
	return famaRanks
}

// Registra que o jogador fez PvP hoje (protege contra decaimento)
func RegistrarPvpHoje(jogadorID int) {
	hoje := hojeJogo()
	db.Conn.Exec(`INSERT INTO fama_atividade (jogador_id, data, fez_pvp)
		VALUES ($1, $2, TRUE)
		ON CONFLICT (jogador_id, data) DO UPDATE SET fez_pvp = TRUE`,
		jogadorID, hoje)
}

// Registra que o jogador logou hoje
func RegistrarLoginHoje(jogadorID int) {
	hoje := hojeJogo()
	db.Conn.Exec(`INSERT INTO fama_atividade (jogador_id, data, logou)
		VALUES ($1, $2, TRUE)
		ON CONFLICT (jogador_id, data) DO UPDATE SET logou = TRUE`,
		jogadorID, hoje)
}

// Aplica decaimento de fama para todos os jogadores que não jogaram ontem
func AplicarDecaimentoFama() int {
	ontem := ontemJogo()
	// Pega todos os jogadores com fama > 0
	rows, err := db.Conn.Query(`SELECT id, pontos_fama FROM jogadores WHERE pontos_fama > 0`)
	if err != nil {
		return 0
	}
	defer rows.Close()

	afetados := 0
	for rows.Next() {
		var id, fama int
		rows.Scan(&id, &fama)

		// Verifica atividade de ontem
		var fezPvp, logou bool
		db.Conn.QueryRow(`SELECT COALESCE(fez_pvp, FALSE), COALESCE(logou, FALSE)
			FROM fama_atividade WHERE jogador_id=$1 AND data=$2`, id, ontem).Scan(&fezPvp, &logou)

		var perda int
		if fezPvp {
			// Fez PvP: sem decaimento
			continue
		} else if logou {
			// Logou mas não fez PvP: -1% (mín 5, máx 100)
			perda = fama / 100
			if perda < 5 {
				perda = 5
			}
			if perda > 100 {
				perda = 100
			}
		} else {
			// Não logou: -2% (mín 10, máx 200)
			perda = fama * 2 / 100
			if perda < 10 {
				perda = 10
			}
			if perda > 200 {
				perda = 200
			}
		}

		novaFama := fama - perda
		if novaFama < 0 {
			novaFama = 0
		}
		db.Conn.Exec("UPDATE jogadores SET pontos_fama=$1 WHERE id=$2", novaFama, id)
		afetados++
	}
	return afetados
}

// Coleta renda de patrocínio acumulada
func ColetarPatrocinio(jogadorID int) (int, int, error) {
	rank := GetFamaRank(0)
	var fama int
	db.Conn.QueryRow("SELECT pontos_fama FROM jogadores WHERE id=$1", jogadorID).Scan(&fama)
	rank = GetFamaRank(fama)

	if rank.RendaHora <= 0 {
		return 0, 0, fmt.Errorf("sem patrocínio")
	}

	// Pega última coleta de patrocínio
	var ultimaColetaEpoch int64
	err := db.Conn.QueryRow(`SELECT COALESCE(EXTRACT(EPOCH FROM ultima_coleta_patrocinio)::BIGINT, 0)
		FROM jogadores WHERE id=$1`, jogadorID).Scan(&ultimaColetaEpoch)
	if err != nil {
		return 0, 0, err
	}

	agora := time.Now().Unix()
	if ultimaColetaEpoch == 0 {
		// Primeira coleta: dá 1 hora de bônus
		ultimaColetaEpoch = agora - 3600
	}

	diffSeg := agora - ultimaColetaEpoch
	if diffSeg < 60 {
		return 0, 0, fmt.Errorf("coletado recentemente")
	}

	// Cap em 12 horas
	maxSeg := int64(12 * 3600)
	if diffSeg > maxSeg {
		diffSeg = maxSeg
	}

	horas := float64(diffSeg) / 3600.0
	dinheiro := int(horas * float64(rank.RendaHora))
	moedas := 0
	if rank.MoedasDia > 0 {
		// Moedas: 1 por dia completo acumulado (cap 12h)
		if diffSeg >= 86400 {
			moedas = rank.MoedasDia
		}
	}

	if dinheiro <= 0 && moedas <= 0 {
		return 0, 0, fmt.Errorf("nada acumulado")
	}

	db.Conn.Exec(`UPDATE jogadores SET dinheiro_mao = dinheiro_mao + $1, moedas = moedas + $2,
		ultima_coleta_patrocinio = NOW() WHERE id=$3`, dinheiro, moedas, jogadorID)

	return dinheiro, moedas, nil
}

// ========================
// MISSÕES COMBINADAS — helpers
// ========================

// ========================
// EVENTOS ALEATÓRIOS DE TRABALHO
// ========================

type eventoTemplate struct {
	id       string
	titulo   string
	desc     string
	icone    string
	op1ID    string
	op1Texto string
	op1Icone string
	op2ID    string
	op2Texto string
	op2Icone string
}

var eventosTrabalho = []eventoTemplate{
	{
		"olheiro", "Um olheiro te viu jogando!",
		"Um cara de terno está anotando tudo. O que você faz?", "🕵️",
		"impressionar", "Mandar um drible impossível", "🔥",
		"seguro", "Jogar seguro e consistente", "🛡️",
	},
	{
		"treta", "Treta no vestiário!",
		"Dois jogadores estão quase se pegando. O que você faz?", "😤",
		"apartar", "Apartar a briga", "🤝",
		"louco", "Meter o louco junto", "💥",
	},
	{
		"chuva", "Chuva torrencial no campo!",
		"O campo virou um lamaçal. O que você faz?", "🌧️",
		"lama", "Jogar na chuva mesmo!", "💪",
		"esperar", "Esperar passar a chuva", "☂️",
	},
	{
		"empresario", "Empresário com proposta suspeita...",
		"Ele promete muito dinheiro, mas algo parece errado.", "🤵",
		"aceitar", "Aceitar a proposta", "💰",
		"recusar", "Recusar com firmeza", "✋",
	},
	{
		"torcida", "Torcida invade o treino!",
		"Os fãs estão pedindo autógrafos e fotos.", "📸",
		"autografo", "Dar autógrafos e tirar fotos", "✍️",
		"focar", "Focar no treino e ignorar", "🎯",
	},
	{
		"lesao_leve", "Pisou errado no treino!",
		"Uma torção no tornozelo. Continua ou para?", "🤕",
		"continuar", "Continuar jogando no sacrifício", "🔥",
		"parar", "Parar e se cuidar", "🏥",
	},
	{
		"reporter", "Reporter quer entrevista exclusiva!",
		"A câmera está ligada. O que você faz?", "🎤",
		"entrevista", "Dar a entrevista bombástica", "📺",
		"humilde", "Ser humilde e discreto", "😌",
	},
	{
		"gato_campo", "Um gato invadiu o campo!",
		"O jogo parou. Todo mundo tá olhando.", "🐱",
		"pegar", "Pegar o gato e virar herói", "😻",
		"chutar", "Chutar a bola pro gato brincar", "⚽",
	},
	{
		"patrao", "O presidente do clube te chamou!",
		"Ele quer conversar na sala dele. Parece sério.", "🏢",
		"negociar", "Pedir aumento de salário", "💰",
		"agradecer", "Agradecer pela oportunidade", "🙏",
	},
	{
		"rival", "Encontrou seu rival no caminho!",
		"Aquele jogador que sempre te provoca.", "😈",
		"provocar", "Provocar de volta", "🗣️",
		"classe", "Ignorar com classe", "😎",
	},
	{
		"sonho", "Sonhou que fazia o gol do título!",
		"Acordou motivadão. A energia está diferente hoje.", "💭",
		"treinar_dobro", "Treinar o dobro", "💪",
		"relaxar", "Aproveitar a motivação com calma", "😊",
	},
	{
		"apostador", "Um cara oferece grana pra você perder!",
		"'É só errar um gol...' ele sussurra.", "🎰",
		"aceitar_aposta", "Aceitar e fazer corpo mole", "💸",
		"denunciar", "Denunciar pra diretoria", "🚨",
	},
}

func GerarEventoTrabalho(jogador *JogadorData, ganhoDin, ganhoXP int) (*EventoTrabalho, *ResultadoEvento) {
	if jogador.Nivel < 10 {
		return nil, nil
	}
	// 20% de chance
	if rand.Intn(100) >= 20 {
		return nil, nil
	}

	tmpl := eventosTrabalho[rand.Intn(len(eventosTrabalho))]
	evento := &EventoTrabalho{
		ID:        tmpl.id,
		Titulo:    tmpl.titulo,
		Descricao: tmpl.desc,
		Icone:     tmpl.icone,
		Opcoes: []OpcaoEvento{
			{ID: tmpl.op1ID, Texto: tmpl.op1Texto, Icone: tmpl.op1Icone},
			{ID: tmpl.op2ID, Texto: tmpl.op2Texto, Icone: tmpl.op2Icone},
		},
	}

	// Escolhe aleatoriamente a opção que o jogador "escolheria" — na verdade resolve server-side com uma escolha aleatória
	// Mas vamos deixar o frontend escolher! O evento retorna pendente.
	return evento, nil
}

// Aplica resultado do evento baseado na escolha do jogador
func AplicarEventoTrabalho(jogador *JogadorData, eventoID, opcaoID string, ganhoDin, ganhoXP int) *ResultadoEvento {
	resultado := &ResultadoEvento{OpcaoID: opcaoID, Sucesso: true}

	// Escala baseada no nível do jogador para manter relevância
	lvl := jogador.Nivel
	famaBase := 5 + lvl/3    // 5-18 dependendo do nível
	saudeBase := 8 + lvl/4   // 8-18
	energiaBase := 3 + lvl/8 // 3-8

	switch eventoID {
	case "olheiro":
		if opcaoID == "impressionar" {
			if rand.Intn(100) < 55 {
				resultado.BonusXP = int(float64(ganhoXP) * 1.5)
				resultado.BonusFama = famaBase + rand.Intn(famaBase)
				resultado.Texto = "O olheiro ficou IMPRESSIONADO! Seu nome circula nos clubes grandes! Fama e XP massivos!"
			} else {
				resultado.BonusDin = -int(float64(ganhoDin) * 0.8)
				resultado.BonusEnergia = -(energiaBase + rand.Intn(3))
				resultado.PerdaSaude = saudeBase / 2
				resultado.Texto = "Errou o drible feio e caiu de cara... Olheiro foi embora rindo. Vergonha total."
				resultado.Sucesso = false
			}
		} else {
			resultado.BonusXP = int(float64(ganhoXP) * 0.4)
			resultado.BonusFama = famaBase / 2
			resultado.Texto = "Jogou seguro. O olheiro anotou seu nome, mas sem destaque."
		}

	case "treta":
		if opcaoID == "apartar" {
			resultado.BonusFama = famaBase + rand.Intn(famaBase)
			resultado.BonusXP = int(float64(ganhoXP) * 0.5)
			resultado.BonusEnergia = energiaBase / 2
			resultado.Texto = "Você acalmou todo mundo! Virou referência no vestiário. Respeito total!"
		} else {
			resultado.BonusDin = int(float64(ganhoDin) * 1.0)
			resultado.PerdaSaude = saudeBase + rand.Intn(saudeBase/2)
			resultado.PerdaFama = famaBase / 2
			resultado.BonusEnergia = -(energiaBase)
			resultado.Texto = "Porrada feia! Ganhou moral mas saiu todo machucado. Precisou de gelo."
		}

	case "chuva":
		if opcaoID == "lama" {
			resultado.BonusXP = int(float64(ganhoXP) * 1.2)
			resultado.BonusEnergia = -(energiaBase + rand.Intn(3))
			resultado.PerdaSaude = saudeBase / 3
			resultado.Texto = "Jogou na lama como guerreiro! Treino insano, evolução brutal!"
		} else {
			resultado.BonusDin = -int(float64(ganhoDin) * 0.5)
			resultado.BonusEnergia = -(energiaBase / 2)
			resultado.Texto = "Esperou demais, perdeu metade do treino. Rendeu pouco."
		}

	case "empresario":
		if opcaoID == "aceitar" {
			resultado.BonusDin = int(float64(ganhoDin) * 5)
			resultado.PerdaFama = famaBase*2 + rand.Intn(famaBase)
			resultado.PerdaSaude = saudeBase / 2
			resultado.Texto = "Dinheiro absurdo no bolso! Mas saiu em todos os jornais como mercenário..."
		} else {
			resultado.BonusFama = famaBase + rand.Intn(famaBase)
			if rand.Intn(100) < 40 {
				resultado.BonusDin = int(float64(ganhoDin) * 1.5)
				resultado.BonusXP = int(float64(ganhoXP) * 0.5)
				resultado.Texto = "Recusou com classe! O presidente te deu bônus gordo por honestidade!"
			} else {
				resultado.BonusXP = int(float64(ganhoXP) * 0.3)
				resultado.Texto = "Recusou firme. Sua reputação disparou nos bastidores!"
			}
		}

	case "torcida":
		if opcaoID == "autografo" {
			resultado.BonusFama = famaBase + rand.Intn(famaBase)
			resultado.BonusEnergia = energiaBase + rand.Intn(3)
			resultado.BonusXP = int(float64(ganhoXP) * 0.3)
			resultado.Texto = "A torcida te carregou! Energia renovada, fama nas alturas!"
		} else {
			resultado.BonusXP = int(float64(ganhoXP) * 0.7)
			resultado.PerdaFama = famaBase / 3
			resultado.Texto = "Focou 100% no treino. Rendeu muito, mas a torcida ficou chateada."
		}

	case "lesao_leve":
		if opcaoID == "continuar" {
			if rand.Intn(100) < 45 {
				resultado.BonusXP = int(float64(ganhoXP) * 1.5)
				resultado.BonusFama = famaBase
				resultado.Texto = "Jogou no sacrifício e BRILHOU! Que raça! A torcida gritou seu nome!"
			} else {
				resultado.PerdaSaude = saudeBase + rand.Intn(saudeBase)
				resultado.BonusEnergia = -(energiaBase + rand.Intn(energiaBase))
				resultado.Texto = "Forçou demais e PIOROU MUITO a lesão... Vai precisar de tratamento sério."
				resultado.Sucesso = false
			}
		} else {
			resultado.BonusEnergia = energiaBase
			resultado.PerdaSaude = saudeBase / 4
			resultado.Texto = "Parou e cuidou do corpo. Recuperou energia mas perdeu um pouco de saúde."
		}

	case "reporter":
		if opcaoID == "entrevista" {
			if rand.Intn(100) < 55 {
				resultado.BonusFama = famaBase*2 + rand.Intn(famaBase)
				resultado.BonusDin = int(float64(ganhoDin) * 0.5)
				resultado.Texto = "VIRALIZOU! Entrevista bombou, patrocínios batendo na porta!"
			} else {
				resultado.PerdaFama = famaBase + rand.Intn(famaBase)
				resultado.BonusEnergia = -(energiaBase)
				resultado.PerdaSaude = saudeBase / 3
				resultado.Texto = "Falou MUITO errado ao vivo... Memes, hate, estresse total. Desastre!"
				resultado.Sucesso = false
			}
		} else {
			resultado.BonusFama = famaBase / 2
			resultado.BonusXP = int(float64(ganhoXP) * 0.3)
			resultado.Texto = "Resposta humilde e certeira. Imagem sólida construída."
		}

	case "gato_campo":
		if opcaoID == "pegar" {
			resultado.BonusFama = famaBase + rand.Intn(famaBase)
			resultado.BonusXP = int(float64(ganhoXP) * 0.3)
			resultado.Texto = "Pegou o gato e virou meme positivo! Fama explodiu nas redes!"
		} else {
			resultado.BonusXP = int(float64(ganhoXP) * 0.4)
			resultado.BonusFama = famaBase / 2
			resultado.BonusEnergia = energiaBase / 2
			resultado.Texto = "O gato amou a bola! Momento fofo viralizou e você descansou."
		}

	case "patrao":
		if opcaoID == "negociar" {
			if rand.Intn(100) < 40 {
				resultado.BonusDin = int(float64(ganhoDin) * 4)
				resultado.BonusFama = famaBase / 2
				resultado.Texto = "Negociação ÉPICA! Salário quadruplicou! Você manda no clube agora!"
			} else {
				resultado.PerdaFama = famaBase
				resultado.BonusEnergia = -(energiaBase)
				resultado.PerdaSaude = saudeBase / 3
				resultado.Texto = "O presidente ficou FURIOSO. Clima pesadíssimo, estresse total..."
				resultado.Sucesso = false
			}
		} else {
			resultado.BonusFama = famaBase
			resultado.BonusXP = int(float64(ganhoXP) * 0.5)
			resultado.BonusDin = int(float64(ganhoDin) * 0.3)
			resultado.Texto = "Humildade conquista! O presidente te respeita e te deu um bônus."
		}

	case "rival":
		if opcaoID == "provocar" {
			if rand.Intn(100) < 45 {
				resultado.BonusXP = int(float64(ganhoXP) * 1.0)
				resultado.BonusFama = famaBase + rand.Intn(famaBase/2)
				resultado.Texto = "HUMILHOU o rival! A provocação virou motivação insana!"
			} else {
				resultado.PerdaFama = famaBase
				resultado.PerdaSaude = saudeBase + rand.Intn(saudeBase/2)
				resultado.BonusEnergia = -(energiaBase + rand.Intn(3))
				resultado.Texto = "A treta EXPLODIU! Porrada, cartão vermelho, suspensão. Saiu destruído."
				resultado.Sucesso = false
			}
		} else {
			resultado.BonusFama = famaBase + rand.Intn(famaBase/2)
			resultado.BonusXP = int(float64(ganhoXP) * 0.3)
			resultado.Texto = "Ignorou com estilo! A torcida aplaudiu de pé. Maturidade de craque!"
		}

	case "sonho":
		if opcaoID == "treinar_dobro" {
			resultado.BonusXP = int(float64(ganhoXP) * 1.5)
			resultado.BonusEnergia = -(energiaBase + rand.Intn(energiaBase))
			resultado.PerdaSaude = saudeBase / 3
			resultado.Texto = "Treinou como NUNCA na vida! Evolução absurda mas corpo no limite!"
		} else {
			resultado.BonusXP = int(float64(ganhoXP) * 0.5)
			resultado.BonusEnergia = energiaBase
			resultado.BonusFama = famaBase / 3
			resultado.Texto = "Aproveitou a motivação com equilíbrio. Dia produtivo e saudável!"
		}

	case "apostador":
		if opcaoID == "aceitar_aposta" {
			resultado.BonusDin = int(float64(ganhoDin) * 8)
			resultado.PerdaFama = famaBase*3 + rand.Intn(famaBase*2)
			resultado.PerdaSaude = saudeBase
			resultado.BonusEnergia = -(energiaBase)
			resultado.Texto = "Dinheiro SUJO pesado no bolso... Mas se descobrirem, acabou sua carreira."
		} else {
			resultado.BonusFama = famaBase*2 + rand.Intn(famaBase)
			resultado.BonusXP = int(float64(ganhoXP) * 0.8)
			resultado.BonusDin = int(float64(ganhoDin) * 1.0)
			resultado.Texto = "HERÓI! Denunciou a máfia! O clube te premiou com bônus e a fama explodiu!"
		}
	}

	// Aplica no jogador
	if resultado.BonusDin != 0 {
		jogador.DinheiroMao += resultado.BonusDin
		if jogador.DinheiroMao < 0 {
			jogador.DinheiroMao = 0
		}
	}
	if resultado.BonusXP != 0 {
		jogador.XP += resultado.BonusXP
	}
	if resultado.BonusFama != 0 {
		jogador.PontosFama += resultado.BonusFama
		if jogador.PontosFama < 0 {
			jogador.PontosFama = 0
		}
	}
	if resultado.PerdaFama != 0 {
		jogador.PontosFama -= resultado.PerdaFama
		if jogador.PontosFama < 0 {
			jogador.PontosFama = 0
		}
	}
	if resultado.BonusEnergia != 0 {
		jogador.Energia += resultado.BonusEnergia
		if jogador.Energia < 0 {
			jogador.Energia = 0
		}
		if jogador.Energia > jogador.EnergiaMax {
			jogador.Energia = jogador.EnergiaMax
		}
	}
	if resultado.PerdaSaude != 0 {
		jogador.Saude -= resultado.PerdaSaude
		if jogador.Saude < 0 {
			jogador.Saude = 0
		}
	}

	return resultado
}

func updateCombinedProgress(jogadorID int, tipo string, quantidade int) {
	hoje := hojeJogo()

	rows, err := db.Conn.Query(`SELECT id, objetivo1_tipo, objetivo1_alvo, objetivo2_tipo, objetivo2_alvo,
		COALESCE(objetivo3_tipo,''), COALESCE(objetivo3_alvo,0),
		recompensa_xp, recompensa_dinheiro, recompensa_moedas
		FROM combined_missions WHERE ativo=TRUE`)
	if err != nil {
		return
	}
	defer rows.Close()

	type cm struct {
		id                        string
		t1                        string
		a1                        int
		t2                        string
		a2                        int
		t3                        string
		a3, xp, din, moedas       int
	}
	var missions []cm
	for rows.Next() {
		var m cm
		rows.Scan(&m.id, &m.t1, &m.a1, &m.t2, &m.a2, &m.t3, &m.a3, &m.xp, &m.din, &m.moedas)
		missions = append(missions, m)
	}

	for _, m := range missions {
		// Check if this mission has an objective matching tipo
		matches1 := m.t1 == tipo
		matches2 := m.t2 == tipo
		matches3 := m.t3 != "" && m.t3 == tipo
		if !matches1 && !matches2 && !matches3 {
			continue
		}

		// Ensure progress row exists
		db.Conn.Exec(`INSERT INTO combined_progress (jogador_id, mission_id, data)
			VALUES ($1, $2, $3::DATE)
			ON CONFLICT DO NOTHING`, jogadorID, m.id, hoje)

		// Check if already completed today
		var completada bool
		db.Conn.QueryRow(`SELECT completada FROM combined_progress
			WHERE jogador_id=$1 AND mission_id=$2 AND data=$3::DATE`,
			jogadorID, m.id, hoje).Scan(&completada)
		if completada {
			continue
		}

		// Increment matching objectives
		if matches1 {
			db.Conn.Exec(`UPDATE combined_progress SET obj1_progresso = obj1_progresso + $1
				WHERE jogador_id=$2 AND mission_id=$3 AND data=$4::DATE`,
				quantidade, jogadorID, m.id, hoje)
		}
		if matches2 {
			db.Conn.Exec(`UPDATE combined_progress SET obj2_progresso = obj2_progresso + $1
				WHERE jogador_id=$2 AND mission_id=$3 AND data=$4::DATE`,
				quantidade, jogadorID, m.id, hoje)
		}
		if matches3 {
			db.Conn.Exec(`UPDATE combined_progress SET obj3_progresso = obj3_progresso + $1
				WHERE jogador_id=$2 AND mission_id=$3 AND data=$4::DATE`,
				quantidade, jogadorID, m.id, hoje)
		}

		// Check if all objectives met
		var p1, p2, p3 int
		db.Conn.QueryRow(`SELECT obj1_progresso, obj2_progresso, obj3_progresso
			FROM combined_progress WHERE jogador_id=$1 AND mission_id=$2 AND data=$3::DATE`,
			jogadorID, m.id, hoje).Scan(&p1, &p2, &p3)

		allMet := p1 >= m.a1 && p2 >= m.a2
		if m.t3 != "" {
			allMet = allMet && p3 >= m.a3
		}

		if allMet {
			db.Conn.Exec(`UPDATE combined_progress SET completada=TRUE
				WHERE jogador_id=$1 AND mission_id=$2 AND data=$3::DATE`,
				jogadorID, m.id, hoje)

			// Give rewards
			db.Conn.Exec(`UPDATE jogadores SET xp = xp + $1, dinheiro_mao = dinheiro_mao + $2, moedas = moedas + $3
				WHERE id=$4`, m.xp, m.din, m.moedas, jogadorID)
		}
	}
}
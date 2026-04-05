package handlers

import (
	"encoding/json"
	"fmt"
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
	// Curva piecewise calibrada por faixa:
	// Nível  1 →  12  |  5 →  60  | 10 → 170   (fácil)
	// Nível 11 → 228  | 15 → 480  | 20 → 880   (médio)
	// Nível 21 → 1302 | 30 → 3150 | 50 → 8250  (médio-alto)
	// Nível 51 → 15555 | 75 → 33875 | 100 → 59000 (desafiador)
	n := nivel
	switch {
	case n <= 10:
		if n == 1 {
			return 12
		}
		return n*n + n*7
	case n <= 20:
		return n*n*2 + n*8
	case n <= 50:
		return n*n*3 + n*12
	default:
		return n*n*5 + n*80 - 500
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
	err := db.Conn.QueryRow(`SELECT id, nome, descricao, preco, tipo, icone, COALESCE(raridade, 'comum'), nivel_min, nivel_max,
		bonus_forca, bonus_velocidade, bonus_habilidade, bonus_saude_max, bonus_energia_max,
		bonus_vit_max, recupera_energia, recupera_saude, slots_mochila, cooldown_minutos
		FROM cat_itens WHERE id=$1`, id).Scan(
		&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.Tipo, &item.Icone,
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
	"Copa do Brasil": 0.42, "Libertadores": 0.48, "Europa": 0.55,
	"Champions": 0.62, "Seleção": 0.70, "Copa do Mundo": 0.78,
	"Ballon d'Or": 0.82, "Ídolo": 0.88, "Lenda": 0.95,
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
	fatorMin := 1.0 + lvl*0.035
	fatorMax := 1.0 + lvl*0.040
	bonusXP := int(lvl * 0.6)

	if nivel >= 30 {
		fatorMin += 0.08
		fatorMax += 0.10
		bonusXP += 3
	}
	if nivel >= 60 {
		fatorMin += 0.15
		fatorMax += 0.18
		bonusXP += 6
	}
	if nivel >= 90 {
		fatorMin += 0.20
		fatorMax += 0.25
		bonusXP += 10
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
	"Copa do Brasil", "Libertadores", "Europa", "Champions",
	"Seleção", "Copa do Mundo", "Ballon d'Or", "Ídolo", "Lenda",
}

func getTierDoJogador(nivel int) string {
	switch {
	case nivel >= 150:
		return "Lenda"
	case nivel >= 120:
		return "Ídolo"
	case nivel >= 100:
		return "Ballon d'Or"
	case nivel >= 85:
		return "Copa do Mundo"
	case nivel >= 72:
		return "Seleção"
	case nivel >= 60:
		return "Champions"
	case nivel >= 50:
		return "Europa"
	case nivel >= 42:
		return "Libertadores"
	case nivel >= 36:
		return "Copa do Brasil"
	case nivel >= 30:
		return "Série A"
	case nivel >= 24:
		return "Série B"
	case nivel >= 18:
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
		       codigo_amigo, inventario_publico, posicao, titulos, COALESCE(pvp_streak, 0)
		FROM jogadores WHERE id = $1`, id).Scan(
		&j.ID, &j.Nome, &j.Nivel, &j.XP, &j.XPProximo, &j.Energia, &j.EnergiaMax,
		&j.Vitalidade, &j.VitalidadeMax, &j.Saude, &j.SaudeMax, &j.Forca, &j.Velocidade,
		&j.Habilidade, &j.DinheiroMao, &j.DinheiroBanco, &j.PontosFama, &j.Vitorias, &j.Derrotas, &j.Avatar,
		&j.CapacidadeMochila, &j.Moedas, &j.CooldownPremium, &j.Titulo, &j.AvataresPremium, &j.ItensFama, &j.TutorialStep,
		&j.CodigoAmigo, &j.InventarioPublico, &j.Posicao, &j.Titulos, &j.PvpStreak)
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
		codigo_amigo=$26, inventario_publico=$27, posicao=$28, titulos=$29, pvp_streak=$30, ultima_atualizacao=NOW()
		WHERE id=$31`,
		j.Nivel, j.XP, j.XPProximo, j.Energia, j.EnergiaMax, j.Vitalidade, j.VitalidadeMax,
		j.Saude, j.SaudeMax, j.Forca, j.Velocidade, j.Habilidade, j.DinheiroMao, j.DinheiroBanco,
		j.PontosFama, j.Vitorias, j.Derrotas, j.Avatar, j.CapacidadeMochila,
		j.Moedas, j.CooldownPremium, j.Titulo, j.AvataresPremium, j.ItensFama, j.TutorialStep,
		j.CodigoAmigo, j.InventarioPublico, j.Posicao, j.Titulos, j.PvpStreak, j.ID)
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
	novoVal, proximo := regenerarRecurso(j.ID, "saude_ultima_recarga", "saude", j.Saude, j.SaudeMax, 10*time.Minute, 5)
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
	var fator float64
	switch {
	case diferentesHoje >= 5:
		fator = cfg.VariedadeBonus5
	case diferentesHoje >= 4:
		fator = cfg.VariedadeBonus4
	case diferentesHoje >= 3:
		fator = cfg.VariedadeBonus3
	default:
		return 0
	}
	return int(float64(ganhoXP) * fator)
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
// MISSÕES COMBINADAS — helpers
// ========================

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
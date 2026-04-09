package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"joga-craque/db"
)

// ============================================================
// SISTEMA DE TREINO
// Inspirado no modo Carreira do FIFA: o jogador escolhe um
// treino específico, paga o cooldown e ganha bônus de atributo.
// Cada nível de treino oferece DILEMAS — opções equilibradas
// onde uma é mais especializada e outra é híbrida ou maior, mas
// com cooldown maior — forçando builds diferentes entre players.
// ============================================================

type Treino struct {
	ID             string `json:"id"`
	Nome           string `json:"nome"`
	Descricao      string `json:"descricao"`
	Icone          string `json:"icone"`
	Categoria      string `json:"categoria"` // Iniciante, Intermediário, Avançado, Elite, Lendário
	NivelMin       int    `json:"nivel_min"`
	CooldownMin    int    `json:"cooldown_minutos"`
	BonusForca     int    `json:"bonus_forca"`
	BonusVelocidade int   `json:"bonus_velocidade"`
	BonusHabilidade int   `json:"bonus_habilidade"`
	CustoEnergia   int    `json:"custo_energia"`
}

type TreinoView struct {
	Treino
	ProximoEm    int64 `json:"proximo_em"`     // unix segundos quando libera (0 se livre)
	VezesFeito   int   `json:"vezes_feito"`
	Disponivel   bool  `json:"disponivel"`
	NivelOK      bool  `json:"nivel_ok"`
}

// Catálogo hardcoded — fácil de balancear
var catalogoTreinos = []Treino{
	// ===== INICIANTE (nível 1+) — escolha pura, 60 min =====
	{
		ID: "treino_forca_basico", Nome: "Musculação no Quintal",
		Descricao: "Levanta peso de cimento. Dói, mas funciona.",
		Icone: "💪", Categoria: "Iniciante",
		NivelMin: 1, CooldownMin: 60, CustoEnergia: 2,
		BonusForca: 2,
	},
	{
		ID: "treino_velocidade_basico", Nome: "Corrida na Praia",
		Descricao: "Tiros na areia fofa. Pernas em chamas.",
		Icone: "💨", Categoria: "Iniciante",
		NivelMin: 1, CooldownMin: 60, CustoEnergia: 2,
		BonusVelocidade: 2,
	},
	{
		ID: "treino_habilidade_basico", Nome: "Embaixadinhas",
		Descricao: "Mil toques na bola. Pé virando bússola.",
		Icone: "⚽", Categoria: "Iniciante",
		NivelMin: 1, CooldownMin: 60, CustoEnergia: 2,
		BonusHabilidade: 2,
	},

	// ===== INTERMEDIÁRIO (nível 8+) — híbridos, 90 min =====
	{
		ID: "treino_potencia", Nome: "Treino de Potência",
		Descricao: "Saltos pliométricos: explosão e velocidade juntas.",
		Icone: "🔥", Categoria: "Intermediário",
		NivelMin: 8, CooldownMin: 90, CustoEnergia: 3,
		BonusForca: 1, BonusVelocidade: 2,
	},
	{
		ID: "treino_finta", Nome: "Treino de Finta",
		Descricao: "Cones e mudança de direção. Rapidez + drible.",
		Icone: "🌀", Categoria: "Intermediário",
		NivelMin: 8, CooldownMin: 90, CustoEnergia: 3,
		BonusVelocidade: 1, BonusHabilidade: 2,
	},
	{
		ID: "treino_disputa", Nome: "Treino de Disputa",
		Descricao: "Dividida no físico — força bruta e técnica.",
		Icone: "🛡️", Categoria: "Intermediário",
		NivelMin: 8, CooldownMin: 90, CustoEnergia: 3,
		BonusForca: 2, BonusHabilidade: 1,
	},

	// ===== AVANÇADO (nível 18+) — especialista puro, 2h =====
	{
		ID: "treino_personal_forca", Nome: "Personal Trainer (Força)",
		Descricao: "Bodybuilder cuida do seu shape. Tudo no peito.",
		Icone: "🏋️", Categoria: "Avançado",
		NivelMin: 18, CooldownMin: 120, CustoEnergia: 4,
		BonusForca: 4,
	},
	{
		ID: "treino_sprint_pro", Nome: "Sprint Profissional",
		Descricao: "Treino de explosão com cronômetro a laser.",
		Icone: "⚡", Categoria: "Avançado",
		NivelMin: 18, CooldownMin: 120, CustoEnergia: 4,
		BonusVelocidade: 4,
	},
	{
		ID: "treino_finalizacao_pro", Nome: "Finalização Profissional",
		Descricao: "500 chutes com cobrança no canto. Pé calibrado.",
		Icone: "🎯", Categoria: "Avançado",
		NivelMin: 18, CooldownMin: 120, CustoEnergia: 4,
		BonusHabilidade: 4,
	},

	// ===== ELITE (nível 30+) — escolhas táticas, 3h =====
	{
		ID: "treino_olimpico", Nome: "Treino Olímpico",
		Descricao: "Programa de medalhista. Força bruta e fôlego.",
		Icone: "🥇", Categoria: "Elite",
		NivelMin: 30, CooldownMin: 180, CustoEnergia: 5,
		BonusForca: 5, BonusVelocidade: 1,
	},
	{
		ID: "treino_velocista_mundial", Nome: "Velocista Mundial",
		Descricao: "Técnica de Bolt aplicada ao futebol.",
		Icone: "🏃", Categoria: "Elite",
		NivelMin: 30, CooldownMin: 180, CustoEnergia: 5,
		BonusVelocidade: 5, BonusHabilidade: 1,
	},
	{
		ID: "treino_drible_magico", Nome: "Drible Mágico",
		Descricao: "Aulas particulares com lenda do drible.",
		Icone: "✨", Categoria: "Elite",
		NivelMin: 30, CooldownMin: 180, CustoEnergia: 5,
		BonusHabilidade: 5, BonusForca: 1,
	},

	// ===== LENDÁRIO (nível 50+) — especialização extrema =====
	{
		ID: "treino_titan", Nome: "Treino do Titã",
		Descricao: "Programa secreto. Vira parede no ataque.",
		Icone: "🗿", Categoria: "Lendário",
		NivelMin: 50, CooldownMin: 240, CustoEnergia: 6,
		BonusForca: 8,
	},
	{
		ID: "treino_relampago", Nome: "Treino Relâmpago",
		Descricao: "Ninguém te alcança. Nem o vento.",
		Icone: "⚡", Categoria: "Lendário",
		NivelMin: 50, CooldownMin: 240, CustoEnergia: 6,
		BonusVelocidade: 8,
	},
	{
		ID: "treino_maestro", Nome: "Treino do Maestro",
		Descricao: "Toque de bola que vira poesia.",
		Icone: "🎼", Categoria: "Lendário",
		NivelMin: 50, CooldownMin: 240, CustoEnergia: 6,
		BonusHabilidade: 8,
	},
	{
		ID: "treino_bola_de_ouro", Nome: "Treino Bola de Ouro",
		Descricao: "Tudo no melhor nível. Cooldown brutal.",
		Icone: "🏆", Categoria: "Lendário",
		NivelMin: 60, CooldownMin: 360, CustoEnergia: 8,
		BonusForca: 4, BonusVelocidade: 4, BonusHabilidade: 4,
	},

	// ===== MITO (nível 80+) — endgame =====
	{
		ID: "treino_mitologico_forca", Nome: "Força Mitológica",
		Descricao: "Hércules teria vergonha do seu shape.",
		Icone: "💎", Categoria: "Mito",
		NivelMin: 80, CooldownMin: 300, CustoEnergia: 8,
		BonusForca: 12, BonusVelocidade: 2,
	},
	{
		ID: "treino_mitologico_velocidade", Nome: "Velocidade Sobrenatural",
		Descricao: "Risca o gramado. Câmeras não acompanham.",
		Icone: "💎", Categoria: "Mito",
		NivelMin: 80, CooldownMin: 300, CustoEnergia: 8,
		BonusVelocidade: 12, BonusHabilidade: 2,
	},
	{
		ID: "treino_mitologico_habilidade", Nome: "Habilidade Divina",
		Descricao: "Faz a bola obedecer pelo olhar.",
		Icone: "💎", Categoria: "Mito",
		NivelMin: 80, CooldownMin: 300, CustoEnergia: 8,
		BonusHabilidade: 12, BonusForca: 2,
	},
}

func findTreinoByID(id string) *Treino {
	for i := range catalogoTreinos {
		if catalogoTreinos[i].ID == id {
			return &catalogoTreinos[i]
		}
	}
	return nil
}

// GET /api/treinos/{jogadorID} — lista todos os treinos com cooldown e progresso
func HandleTreinos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrResp(w, 405, "Método não permitido")
		return
	}
	idStr := r.URL.Path[len("/api/treinos/"):]
	jogadorID, err := strconv.Atoi(idStr)
	if err != nil {
		ErrResp(w, 400, "ID inválido")
		return
	}

	jogador, err := getJogador(jogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	// Carrega cooldowns + contagem
	cooldowns := map[string]time.Time{}
	rows, _ := db.Conn.Query("SELECT treino_id, ultimo_em FROM treinos_cooldown WHERE jogador_id=$1", jogadorID)
	if rows != nil {
		for rows.Next() {
			var tid string
			var t time.Time
			rows.Scan(&tid, &t)
			cooldowns[tid] = t
		}
		rows.Close()
	}
	contagem := map[string]int{}
	rows2, _ := db.Conn.Query("SELECT treino_id, vezes_feito FROM treinos_total WHERE jogador_id=$1", jogadorID)
	if rows2 != nil {
		for rows2.Next() {
			var tid string
			var v int
			rows2.Scan(&tid, &v)
			contagem[tid] = v
		}
		rows2.Close()
	}

	agora := time.Now()
	var lista []TreinoView
	for _, t := range catalogoTreinos {
		view := TreinoView{Treino: t}
		view.NivelOK = jogador.Nivel >= t.NivelMin
		view.VezesFeito = contagem[t.ID]
		if last, ok := cooldowns[t.ID]; ok {
			next := last.Add(time.Duration(t.CooldownMin) * time.Minute)
			if next.After(agora) {
				view.ProximoEm = next.Unix()
			}
		}
		view.Disponivel = view.NivelOK && view.ProximoEm == 0
		lista = append(lista, view)
	}
	JsonResp(w, 200, lista)
}

// POST /api/treinar — executa um treino
func HandleTreinar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		ErrResp(w, 405, "Método não permitido")
		return
	}
	var req struct {
		JogadorID int    `json:"jogador_id"`
		TreinoID  string `json:"treino_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrResp(w, 400, "Dados inválidos")
		return
	}

	t := findTreinoByID(req.TreinoID)
	if t == nil {
		ErrResp(w, 400, "Treino não encontrado")
		return
	}

	jogador, err := getJogador(req.JogadorID)
	if err != nil {
		ErrResp(w, 404, "Jogador não encontrado")
		return
	}

	if jogador.Nivel < t.NivelMin {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": fmt.Sprintf("Você precisa ser nível %d para este treino!", t.NivelMin)})
		return
	}

	// Cooldown
	var ultimoEm time.Time
	db.Conn.QueryRow("SELECT ultimo_em FROM treinos_cooldown WHERE jogador_id=$1 AND treino_id=$2",
		req.JogadorID, req.TreinoID).Scan(&ultimoEm)
	if !ultimoEm.IsZero() {
		next := ultimoEm.Add(time.Duration(t.CooldownMin) * time.Minute)
		if next.After(time.Now()) {
			restante := int(next.Sub(time.Now()).Minutes())
			JsonResp(w, 200, map[string]any{
				"sucesso":  false,
				"mensagem": fmt.Sprintf("Cooldown! Aguarde %d min para repetir esse treino.", restante+1),
				"proximo_em": next.Unix(),
			})
			return
		}
	}

	// Energia
	regenerarEnergia(jogador)
	if jogador.Energia < t.CustoEnergia {
		JsonResp(w, 200, map[string]any{"sucesso": false, "mensagem": fmt.Sprintf("Energia insuficiente! Precisa de %d.", t.CustoEnergia)})
		return
	}

	jogador.Energia -= t.CustoEnergia
	jogador.Forca += t.BonusForca
	jogador.Velocidade += t.BonusVelocidade
	jogador.Habilidade += t.BonusHabilidade

	if err := saveJogador(jogador); err != nil {
		ErrResp(w, 500, "Erro ao salvar")
		return
	}

	// Atualiza cooldown e contagem
	db.Conn.Exec(`INSERT INTO treinos_cooldown (jogador_id, treino_id, ultimo_em)
		VALUES ($1, $2, NOW())
		ON CONFLICT (jogador_id, treino_id) DO UPDATE SET ultimo_em = NOW()`,
		req.JogadorID, req.TreinoID)
	db.Conn.Exec(`INSERT INTO treinos_total (jogador_id, treino_id, vezes_feito)
		VALUES ($1, $2, 1)
		ON CONFLICT (jogador_id, treino_id) DO UPDATE SET vezes_feito = treinos_total.vezes_feito + 1`,
		req.JogadorID, req.TreinoID)

	jogador.ProximaEnergiaEm = regenerarEnergia(jogador)

	// Mensagem com bônus aplicados
	bonusTexto := ""
	if t.BonusForca > 0 {
		bonusTexto += fmt.Sprintf(" +%d Força", t.BonusForca)
	}
	if t.BonusVelocidade > 0 {
		bonusTexto += fmt.Sprintf(" +%d Velocidade", t.BonusVelocidade)
	}
	if t.BonusHabilidade > 0 {
		bonusTexto += fmt.Sprintf(" +%d Habilidade", t.BonusHabilidade)
	}

	proximoEm := time.Now().Add(time.Duration(t.CooldownMin) * time.Minute).Unix()

	JsonResp(w, 200, map[string]any{
		"sucesso":     true,
		"mensagem":    fmt.Sprintf("Treino concluído!%s", bonusTexto),
		"jogador":     jogador,
		"bonus_forca": t.BonusForca,
		"bonus_velocidade": t.BonusVelocidade,
		"bonus_habilidade": t.BonusHabilidade,
		"proximo_em":  proximoEm,
	})
}

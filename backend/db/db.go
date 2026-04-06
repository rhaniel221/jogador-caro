package db

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"

	_ "github.com/lib/pq"
)

// Conn é a variável global de conexão acessível por outros pacotes
var Conn *sql.DB

func InitDB(connStr string) {
	var err error
	Conn, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Erro ao conectar:", err)
	}

	if err = Conn.Ping(); err != nil {
		log.Fatal("Erro no ping:", err)
	}
	fmt.Println("Banco de dados conectado!")

	createTables()
}

func createTables() {
	// Cria tabelas
	Conn.Exec(`CREATE TABLE IF NOT EXISTS jogadores (
		id SERIAL PRIMARY KEY,
		nome VARCHAR(50) NOT NULL,
		nivel INT DEFAULT 1,
		xp INT DEFAULT 0,
		xp_proximo INT DEFAULT 9,
		energia INT DEFAULT 15,
		energia_max INT DEFAULT 15,
		vitalidade INT DEFAULT 5,
		vitalidade_max INT DEFAULT 5,
		saude INT DEFAULT 100,
		saude_max INT DEFAULT 100,
		forca INT DEFAULT 5,
		velocidade INT DEFAULT 5,
		habilidade INT DEFAULT 5,
		dinheiro_mao INT DEFAULT 500,
		dinheiro_banco INT DEFAULT 0,
		pontos_fama INT DEFAULT 0,
		vitorias INT DEFAULT 0,
		derrotas INT DEFAULT 0,
		avatar INT DEFAULT 1,
		criado_em TIMESTAMP DEFAULT NOW(),
		ultima_atualizacao TIMESTAMP DEFAULT NOW()
	)`)

	// Migração - adiciona colunas novas se não existirem
	for _, m := range []string{
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS xp_proximo INT DEFAULT 9`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS energia_max INT DEFAULT 15`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS vitalidade_max INT DEFAULT 5`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS saude_max INT DEFAULT 100`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS forca INT DEFAULT 5`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS velocidade INT DEFAULT 5`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS habilidade INT DEFAULT 5`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS pontos_fama INT DEFAULT 0`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS vitorias INT DEFAULT 0`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS derrotas INT DEFAULT 0`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS avatar INT DEFAULT 1`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultima_atualizacao TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS energia_ultima_recarga TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS vitalidade_ultima_recarga TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS saude_ultima_recarga TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultimo_consumivel_usado TIMESTAMP DEFAULT '2000-01-01'`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultimo_energia_consumivel TIMESTAMP DEFAULT '2000-01-01'`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS capacidade_mochila INT DEFAULT 5`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS moedas INT DEFAULT 0`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS cooldown_premium BOOLEAN DEFAULT false`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS titulo VARCHAR(100) DEFAULT ''`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS avatares_premium TEXT DEFAULT ''`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS itens_fama TEXT DEFAULT ''`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultimo_trabalho_id VARCHAR(50) DEFAULT ''`,
		`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS streak_consecutiva INT DEFAULT 0`,
		`ALTER TABLE jogadores ADD CONSTRAINT jogadores_nome_unique UNIQUE (nome)`,
		`ALTER TABLE cat_itens ADD COLUMN IF NOT EXISTS cooldown_minutos INT DEFAULT 0`,
		`ALTER TABLE cat_itens ADD COLUMN IF NOT EXISTS preco_moedas INT DEFAULT 0`,
	} {
		Conn.Exec(m)
	}

	Conn.Exec(`CREATE TABLE IF NOT EXISTS inventario (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		item_id INT NOT NULL,
		quantidade INT DEFAULT 1,
		equipado BOOLEAN DEFAULT false,
		UNIQUE(jogador_id, item_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS maestria_trabalhos (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		trabalho_id VARCHAR(50) NOT NULL,
		vezes_feito INT DEFAULT 0,
		UNIQUE(jogador_id, trabalho_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS combates (
		id SERIAL PRIMARY KEY,
		atacante_id INT REFERENCES jogadores(id),
		defensor_id INT REFERENCES jogadores(id),
		vencedor_id INT REFERENCES jogadores(id),
		dinheiro_roubado INT DEFAULT 0,
		criado_em TIMESTAMP DEFAULT NOW()
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS tasks_progresso (
		jogador_id INT REFERENCES jogadores(id),
		task_id VARCHAR(50),
		data DATE DEFAULT CURRENT_DATE,
		progresso INT DEFAULT 0,
		completada BOOLEAN DEFAULT false,
		PRIMARY KEY (jogador_id, task_id, data)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS foruns (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		mensagem TEXT NOT NULL,
		criado_em TIMESTAMP DEFAULT NOW()
	)`)

	// Tabelas de catálogo
	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_itens (
		id INT PRIMARY KEY,
		nome VARCHAR(150) NOT NULL,
		descricao TEXT DEFAULT '',
		preco INT DEFAULT 0,
		tipo VARCHAR(30) DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		nivel_min INT DEFAULT 0,
		nivel_max INT DEFAULT 0,
		bonus_forca INT DEFAULT 0,
		bonus_velocidade INT DEFAULT 0,
		bonus_habilidade INT DEFAULT 0,
		bonus_saude_max INT DEFAULT 0,
		bonus_energia_max INT DEFAULT 0,
		bonus_vit_max INT DEFAULT 0,
		recupera_energia INT DEFAULT 0,
		recupera_saude INT DEFAULT 0,
		slots_mochila INT DEFAULT 0
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_trabalhos (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		tier VARCHAR(50) DEFAULT '',
		nivel_min INT DEFAULT 1,
		energia INT DEFAULT 1,
		ganho_min INT DEFAULT 0,
		ganho_max INT DEFAULT 0,
		ganho_xp INT DEFAULT 0,
		requer_item INT DEFAULT 0,
		icone VARCHAR(20) DEFAULT ''
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_itens_premium (
		id INT PRIMARY KEY,
		nome VARCHAR(150) NOT NULL,
		descricao TEXT DEFAULT '',
		preco INT DEFAULT 0,
		tipo VARCHAR(30) DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		avatar_id INT DEFAULT 0,
		titulo_val VARCHAR(100) DEFAULT '',
		mochila_slots INT DEFAULT 0
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_itens_fama (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(150) NOT NULL,
		descricao TEXT DEFAULT '',
		preco INT DEFAULT 0,
		fama_ganha INT DEFAULT 0,
		icone VARCHAR(20) DEFAULT '',
		unico BOOLEAN DEFAULT false,
		categoria VARCHAR(30) DEFAULT '',
		limite_compra INT DEFAULT 1
	)`)
	Conn.Exec(`ALTER TABLE cat_itens_fama ADD COLUMN IF NOT EXISTS categoria VARCHAR(30) DEFAULT ''`)
	Conn.Exec(`ALTER TABLE cat_itens_fama ADD COLUMN IF NOT EXISTS limite_compra INT DEFAULT 1`)
	Conn.Exec(`CREATE TABLE IF NOT EXISTS fama_compras (
		jogador_id INT REFERENCES jogadores(id),
		item_id VARCHAR(50),
		quantidade INT DEFAULT 1,
		PRIMARY KEY (jogador_id, item_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_tasks_diarias (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(150) NOT NULL,
		descricao TEXT DEFAULT '',
		tipo VARCHAR(50) DEFAULT '',
		objetivo INT DEFAULT 0,
		recompensa_dinheiro INT DEFAULT 0,
		recompensa_xp INT DEFAULT 0,
		recompensa_fama INT DEFAULT 0,
		dificuldade VARCHAR(20) DEFAULT ''
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cat_avatares (
		id INT PRIMARY KEY,
		icone VARCHAR(20) NOT NULL,
		tipo VARCHAR(20) DEFAULT 'comum'
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cooldown_item_jogador (
		jogador_id INT REFERENCES jogadores(id),
		item_id INT NOT NULL,
		usado_em TIMESTAMP DEFAULT '2000-01-01',
		PRIMARY KEY (jogador_id, item_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS maestria_tier_bonus (
		jogador_id INT REFERENCES jogadores(id),
		tier VARCHAR(50) NOT NULL,
		nivel INT NOT NULL,
		PRIMARY KEY (jogador_id, tier, nivel)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS trabalhos_hoje (
    jogador_id INT REFERENCES jogadores(id),
    trabalho_id VARCHAR(50) NOT NULL,
    data DATE DEFAULT CURRENT_DATE,
    vezes INT DEFAULT 1,
    PRIMARY KEY (jogador_id, trabalho_id, data)
)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS config_progressao (
    chave VARCHAR(100) PRIMARY KEY,
    valor FLOAT NOT NULL DEFAULT 0,
    descricao TEXT DEFAULT ''
)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS trabalhos_bloqueados_hoje (
    jogador_id INT REFERENCES jogadores(id),
    trabalho_id VARCHAR(50) NOT NULL,
    data DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (jogador_id, trabalho_id, data)
)`)

	// Migração: adiciona limite_diario se não existir
	Conn.Exec(`ALTER TABLE cat_trabalhos ADD COLUMN IF NOT EXISTS limite_diario INT DEFAULT 0`)

	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS tutorial_step INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS desafios_1v1_vitorias INT DEFAULT 0`)

	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS energia_gasta_total INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS minigame_hoje DATE`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultimo_minigame TIMESTAMP`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS minigame_recordes (
		jogador_id INT PRIMARY KEY REFERENCES jogadores(id),
		score INT DEFAULT 0,
		max_combo INT DEFAULT 0,
		jogadas INT DEFAULT 1,
		atualizado_em TIMESTAMP DEFAULT NOW()
	)`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultimo_periodo_desafio VARCHAR(20) DEFAULT ''`)
	Conn.Exec(`ALTER TABLE desafios_1v1 ADD COLUMN IF NOT EXISTS periodo VARCHAR(20) DEFAULT ''`)

	// Migração: posição e títulos
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS posicao VARCHAR(10) DEFAULT ''`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS titulos TEXT DEFAULT ''`)

	// Migração: raridade em cat_itens
	Conn.Exec(`ALTER TABLE cat_itens ADD COLUMN IF NOT EXISTS raridade VARCHAR(20) DEFAULT 'comum'`)

	// Migração: novos campos em quests
	Conn.Exec(`ALTER TABLE quests ADD COLUMN IF NOT EXISTS nivel_min INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE quests ADD COLUMN IF NOT EXISTS nivel_max INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE quests ADD COLUMN IF NOT EXISTS recompensa_item_id INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE quests ADD COLUMN IF NOT EXISTS recompensa_energia INT DEFAULT 0`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS cooldown_trabalhos (
    jogador_id INT REFERENCES jogadores(id),
    trabalho_id VARCHAR(50) NOT NULL,
    ultimo_em TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (jogador_id, trabalho_id)
)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS missoes (
		id VARCHAR(50) PRIMARY KEY,
		fase INT DEFAULT 1,
		ordem INT DEFAULT 0,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		tipo VARCHAR(50) DEFAULT 'instant',
		vezes_necessarias INT DEFAULT 1,
		tempo_minutos INT DEFAULT 0,
		custo_energia INT DEFAULT 0,
		recompensa_xp INT DEFAULT 0,
		recompensa_dinheiro INT DEFAULT 0,
		recompensa_moedas INT DEFAULT 0,
		nivel_libera INT DEFAULT 0,
		requer_missao VARCHAR(50) DEFAULT '',
		dialogo_inicio TEXT DEFAULT '',
		dialogo_fim TEXT DEFAULT ''
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS progresso_missoes (
		jogador_id INT REFERENCES jogadores(id),
		missao_id VARCHAR(50) NOT NULL,
		vezes_feitas INT DEFAULT 0,
		completada BOOLEAN DEFAULT FALSE,
		inicio_em TIMESTAMP,
		PRIMARY KEY (jogador_id, missao_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS campinho_niveis (
		nivel INT PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		arte VARCHAR(200) DEFAULT '',
		bonus_xp_pct INT DEFAULT 10
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS campinho_requisitos (
		nivel INT NOT NULL,
		tipo VARCHAR(50) NOT NULL,
		objetivo INT DEFAULT 1,
		descricao VARCHAR(200) DEFAULT '',
		PRIMARY KEY (nivel, tipo)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS campinho_materiais (
		nivel INT NOT NULL,
		material VARCHAR(50) NOT NULL,
		quantidade INT DEFAULT 1,
		PRIMARY KEY (nivel, material)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS campinho_jogador (
		jogador_id INT PRIMARY KEY REFERENCES jogadores(id),
		nivel INT DEFAULT 0,
		ultimo_bonus DATE
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS materiais_jogador (
		jogador_id INT REFERENCES jogadores(id),
		material VARCHAR(50) NOT NULL,
		quantidade INT DEFAULT 0,
		PRIMARY KEY (jogador_id, material)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS quests (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		tipo VARCHAR(50) DEFAULT '',
		objetivo INT DEFAULT 1,
		recompensa_material VARCHAR(50) DEFAULT '',
		recompensa_quantidade INT DEFAULT 1,
		recompensa_xp INT DEFAULT 0,
		recompensa_dinheiro INT DEFAULT 0
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS progresso_quests (
		jogador_id INT REFERENCES jogadores(id),
		quest_id VARCHAR(50) NOT NULL,
		progresso INT DEFAULT 0,
		completada BOOLEAN DEFAULT FALSE,
		PRIMARY KEY (jogador_id, quest_id)
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS desafios_1v1 (
		id SERIAL PRIMARY KEY,
		desafiante_id INT REFERENCES jogadores(id),
		desafiado_id INT REFERENCES jogadores(id),
		gols_desafiante INT DEFAULT 0,
		gols_desafiado INT DEFAULT 0,
		chutes_desafiante TEXT DEFAULT '',
		defesas_desafiante TEXT DEFAULT '',
		chutes_desafiado TEXT DEFAULT '',
		defesas_desafiado TEXT DEFAULT '',
		vencedor_id INT DEFAULT 0,
		status VARCHAR(20) DEFAULT 'pendente',
		data DATE DEFAULT CURRENT_DATE,
		criado_em TIMESTAMP DEFAULT NOW()
	)`)
	Conn.Exec(`ALTER TABLE desafios_1v1 ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente'`)

	// Friend code + public profile settings
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS codigo_amigo VARCHAR(7) DEFAULT ''`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS inventario_publico BOOLEAN DEFAULT FALSE`)

	// Friendships table
	Conn.Exec(`CREATE TABLE IF NOT EXISTS amizades (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		amigo_id INT REFERENCES jogadores(id),
		status VARCHAR(20) DEFAULT 'pendente',
		criado_em TIMESTAMP DEFAULT NOW(),
		UNIQUE(jogador_id, amigo_id)
	)`)

	// Generate codes for existing players without one
	rows, _ := Conn.Query("SELECT id FROM jogadores WHERE codigo_amigo = '' OR codigo_amigo IS NULL")
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var pid int
			rows.Scan(&pid)
			Conn.Exec("UPDATE jogadores SET codigo_amigo=$1 WHERE id=$2", GerarCodigoAmigo(), pid)
		}
	}

	seedCatalogos()

	fmt.Println("Tabelas verificadas!")
}

func GerarCodigoAmigo() string {
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := ""
	for i := 0; i < 3; i++ {
		code += string(chars[rand.Intn(len(chars))])
	}
	code += "-"
	for i := 0; i < 3; i++ {
		code += string("0123456789"[rand.Intn(10)])
	}
	return code
}

func seedCatalogos() {
	// Seed cat_itens
	itens := []struct {
		id, preco, nivelMin, nivelMax, bonusForca, bonusVelocidade, bonusHabilidade int
		bonusSaudeMax, bonusEnergiaMax, bonusVitMax, recuperaEnergia, recuperaSaude, slotsMochila int
		nome, descricao, tipo, icone string
	}{
		// Consumíveis — preço realista BR
		// === CONSUMÍVEIS — 2 de energia + 1 de saúde por faixa ===
		// Regra: barato = pouca energia, cooldown curto | caro = muita energia, cooldown longo
		// Preço proporcional ao que o nível ganha

		// Nível 1-4 (Garoto) — ganho ~5-25/trabalho, energia max ~11-14
		{14, 3, 1, 4, 0, 0, 0, 0, 0, 0, 3, 0, 0, "Água da Torneira", "Hidratação básica", "consumivel", "💧"},
		{30, 15, 1, 4, 0, 0, 0, 0, 0, 0, 8, 0, 0, "Sanduíche", "Lanche completo", "consumivel", "🥪"},
		{5, 15, 1, 4, 0, 0, 0, 0, 0, 0, 0, 15, 0, "Bandagem", "Curativo básico", "consumivel", "🩹"},

		// Nível 5-9 (Base) — ganho ~10-55/trabalho, energia max ~19-25
		{63, 8, 5, 9, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Água Mineral", "Hidratação boa", "consumivel", "💧"},
		{31, 35, 5, 9, 0, 0, 0, 0, 0, 0, 12, 0, 0, "Arroz e Feijão", "Refeição completa", "consumivel", "🍚"},
		{64, 38, 5, 9, 0, 0, 0, 0, 0, 0, 0, 25, 0, "Kit Primeiros Socorros", "Recupera saúde", "consumivel", "🩺"},

		// Nível 10-17 (Amador) — ganho ~40-150/trabalho, energia max ~34-45
		{70, 25, 10, 17, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Isotônico Light", "Reidratação leve", "consumivel", "🥤"},
		{32, 80, 10, 17, 0, 0, 0, 0, 0, 0, 15, 0, 0, "Frango Grelhado", "Proteína pro treino", "consumivel", "🍗"},
		{71, 90, 10, 17, 0, 0, 0, 0, 0, 0, 0, 40, 0, "Kit Médico Amador", "Tratamento completo", "consumivel", "🩺"},

		// Nível 18-23 (Série C) — ganho ~150-800/trabalho, energia max ~50-60
		{72, 100, 18, 23, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Bebida Proteica", "Energia rápida", "consumivel", "🧉"},
		{33, 500, 18, 23, 0, 0, 0, 0, 0, 0, 18, 0, 0, "Macarrão do Craque", "Carboidratos pro jogo", "consumivel", "🍝"},
		{73, 525, 18, 23, 0, 0, 0, 0, 0, 0, 0, 60, 0, "Spray Criogênico", "Recuperação rápida", "consumivel", "🧊"},

		// Nível 24-35 (Série B/A) — ganho ~400-4000/trabalho, energia max ~65-90
		{74, 400, 24, 35, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Vitamina B12", "Boost rápido", "consumivel", "💊"},
		{34, 2000, 24, 35, 0, 0, 0, 0, 0, 0, 22, 0, 0, "Banquete do Campeão", "Refeição dos grandes", "consumivel", "🍖"},
		{75, 2250, 24, 35, 0, 0, 0, 0, 0, 0, 0, 80, 0, "Tratamento Fisioterapia", "Recuperação profissional", "consumivel", "💉"},

		// Nível 36-49 (Copa BR/Libertadores) — ganho ~2K-35K/trabalho, energia max ~95-130
		{76, 2000, 36, 49, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Isotônico Power", "Energia rápida", "consumivel", "⚡"},
		{77, 10000, 36, 49, 0, 0, 0, 0, 0, 0, 25, 0, 0, "Carga de Inspiração", "Explosão de energia", "consumivel", "🔥"},
		{78, 10500, 36, 49, 0, 0, 0, 0, 0, 0, 0, 100, 0, "Tratamento VIP", "Saúde de craque", "consumivel", "💉"},

		// Nível 50-71 (Europa/Champions) — ganho ~15K-350K/trabalho
		{79, 10000, 50, 71, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Suplemento Elite", "Boost rápido", "consumivel", "✨"},
		{80, 50000, 50, 71, 0, 0, 0, 0, 0, 0, 30, 0, 0, "Shake Premium", "Energia premium", "consumivel", "💎"},
		{81, 52500, 50, 71, 0, 0, 0, 0, 0, 0, 0, 120, 0, "Nanomedicina", "Regeneração futurista", "consumivel", "🧬"},

		// Nível 72+ (Seleção/Copa/Lenda) — ganho ~150K-60M/trabalho
		{82, 50000, 72, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Elixir Rápido", "Energia instantânea", "consumivel", "🌟"},
		{83, 300000, 72, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, "Soro do GOAT", "Energia dos deuses", "consumivel", "🏆"},
		{84, 300000, 72, 0, 0, 0, 0, 0, 0, 0, 0, 150, 0, "Terapia Genética", "Saúde máxima", "consumivel", "🧬"},
		// Equipamentos — nível baixo
		{6, 15, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Camisa do Time", "Necessária para trabalhar no estádio", "equipamento", "👕"},
		{7, 20, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, "Chuteira Básica", "Uma chuteira simples pra dar os primeiros chutes", "equipamento", "👟"},
		{10, 12, 1, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, "Protetor de Canela", "Protege da entrada dura dos rivais", "equipamento", "🦵"},
		{9, 30, 3, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, "Luva do Goleiro", "Protege as mãos e aumenta a vitalidade", "equipamento", "🥊"},
		{18, 22, 3, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, "Joelheira", "Protege os joelhos nas divididas", "equipamento", "🦿"},
		// Equipamentos — nível médio
		{12, 60, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, "Tênis de Corrida", "Para correr mais rápido que os adversários", "equipamento", "🏃"},
		{11, 80, 5, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, "Kit de Musculação", "Treino de força para se tornar mais poderoso", "equipamento", "💪"},
		{19, 45, 5, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, "Meias de Compressão", "Melhora o desempenho nas corridas", "equipamento", "🧦"},
		{8, 120, 8, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, "Chuteira Profissional", "Chuteira dos grandes jogadores", "equipamento", "⚽"},
		{20, 250, 10, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, "Colete Tático", "Equipamento dos treinadores profissionais", "equipamento", "🦺"},
		{21, 450, 15, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, "Capacete de Treino", "Proteção máxima nos treinamentos pesados", "equipamento", "⛑️"},
		// Mochilas
		{22, 40, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, "Mochila Escolar", "Comporta mais itens que o bolso. Capacidade: 8 tipos", "mochila", "🎒"},
		{23, 150, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, "Mochila Esportiva", "A mochila do atleta amador. Capacidade: 12 tipos", "mochila", "👜"},
		{24, 600, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, "Mochila do Profissional", "Espaço de sobra para os itens do craque. Capacidade: 16 tipos", "mochila", "💼"},
		{25, 2000, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, "Mochila do Craque", "A maior mochila do jogo. Capacidade: 22 tipos", "mochila", "🏅"},
		// Equipamentos de tier alto — necessários para trabalhos Craque+
		{35, 2500, 25, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, "Uniforme de Clube", "Uniforme oficial de clube profissional. Libera: Titular, Seleçoca Sub-23.", "equipamento", "🎽"},
		{36, 12000, 40, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, "Chuteira de Elite", "Chuteira das grandes ligas europeias. Libera: Liga Europeia.", "equipamento", "👟"},
		{37, 50000, 60, 0, 0, 3, 4, 0, 0, 0, 0, 0, 0, "Chuteira Dourada", "Usada pelos maiores craques do mundo. Libera: Liga dos Craques.", "equipamento", "⭐"},
		{38, 180000, 80, 0, 1, 3, 5, 0, 0, 0, 0, 0, 0, "Uniforme da Seleçoca", "O uniforme sagrado do país. Libera: Seleçoca, Mundialito.", "equipamento", "🇧🇷"},
		// Level 1-10 (Garoto/Base) - Comum
		{40, 10, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, "Munhequeira", "Acessório básico do jogador de rua", "equipamento", "🏋️"},
		{41, 15, 3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, "Faixa de Cabeça", "Estilo e velocidade", "equipamento", "🎀"},
		{42, 25, 5, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, "Bola de Treino", "Melhora o domínio de bola", "equipamento", "⚽"},
		// Level 1-10 - Raro (missão)
		{43, 0, 5, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, "Chuteira Raio Street", "Lendária das ruas. +2 Força +1 Velocidade", "equipamento", "👟"},
		{44, 0, 8, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, "Kit Drible Mágico", "Domínio total. +2 Velocidade +2 Habilidade", "equipamento", "✨"},
		// Level 10-20 (Amador) - Comum
		{45, 50, 10, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, "Faixa de Capitão", "Liderança no campo. +2 Força", "equipamento", "©️"},
		{46, 70, 12, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, "Tornozeleira Pro", "Agilidade profissional", "equipamento", "🦶"},
		{47, 90, 15, 0, 0, 0, 2, 10, 0, 0, 0, 0, 0, "Caneleira Reforçada", "Proteção e habilidade", "equipamento", "🛡️"},
		// Level 10-20 - Raro (missão)
		{48, 0, 10, 0, 3, 2, 0, 0, 0, 0, 0, 0, 0, "Chuteira Listrada Copa", "A favorita dos craques. +3 Força +2 Velocidade", "equipamento", "👟"},
		{49, 0, 15, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, "Luva Predator", "Reflexos sobre-humanos. +3 Vel +3 Hab", "equipamento", "🧤"},
		// Level 10-20 - Épico (missão)
		{50, 0, 18, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, "Uniforme Seleçoca Sub-20", "Orgulho nacional. +3 em tudo", "equipamento", "🇧🇷"},
		// Level 20-35 (Profissional) - Comum
		{51, 200, 20, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, "Suplemento Whey", "Força máxima no treino", "equipamento", "💊"},
		{52, 300, 25, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, "Relógio GPS", "Controla sua velocidade em campo", "equipamento", "⌚"},
		{53, 400, 28, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, "Bola Oficial Pro", "Toque perfeito. +3 Habilidade", "equipamento", "⚽"},
		// Level 20-35 - Raro (missão)
		{54, 0, 22, 0, 4, 3, 0, 0, 0, 0, 0, 0, 0, "Chuteira Mercurial", "Velocidade mortal. +4 Força +3 Vel", "equipamento", "⚡"},
		{55, 0, 28, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, "Kit Joga Bonito", "Drible e estilo. +4 Vel +4 Hab", "equipamento", "🌟"},
		// Level 20-35 - Épico (missão)
		{56, 0, 30, 0, 5, 4, 4, 0, 0, 0, 0, 0, 0, "Uniforme Real Madrid", "Galáctico. +5F +4V +4H", "equipamento", "⚪"},
		// Level 35-50 (Craque/Elite) - Raro (missão)
		{57, 0, 35, 0, 5, 5, 3, 0, 0, 0, 0, 0, 0, "Chuteira Phantom GT", "Precisão letal. +5F +5V +3H", "equipamento", "👻"},
		{58, 0, 42, 0, 4, 6, 5, 0, 0, 0, 0, 0, 0, "Kit El Pibe", "Magia pura. +4F +6V +5H", "equipamento", "🐐"},
		// Level 35-50 - Épico (missão)
		{59, 0, 38, 0, 6, 5, 5, 0, 0, 0, 0, 0, 0, "Armadura do Capitão", "+6F +5V +5H", "equipamento", "🛡️"},
		// Level 35-50 - Lendário (missão)
		{60, 0, 45, 0, 7, 6, 6, 0, 0, 0, 0, 0, 0, "Chuteira CR7 Dourada", "A arma do GOAT. +7F +6V +6H", "equipamento", "👑"},
		// Level 50+ - Lendário (missão)
		{61, 0, 55, 0, 8, 7, 7, 0, 0, 0, 0, 0, 0, "Manto Sagrado", "Usado pelos imortais. +8F +7V +7H", "equipamento", "🦸"},
		{62, 0, 70, 0, 10, 8, 8, 0, 0, 0, 0, 0, 0, "Kit Rei do Campo", "A lenda das lendas. +10F +8V +8H", "equipamento", "🏆"},
		// === ITENS DE CLASSE (desbloqueiam trabalho top de cada tier) ===
		// Garoto: bebidas já pede item 6 (Camisa R$15)
		// Base: pelada já pede item 7 (Chuteira R$20)
		// === ITENS DE CLASSE (desbloqueiam trabalho top de cada tier) ===
		{100, 50, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Colete de Flanelinha", "Necessário pra trabalhar no estádio", "equipamento", "🦺"},
		{101, 200, 10, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, "Crachá de Olheiro", "Credencial de captador amador", "equipamento", "🪪"},
		{102, 600, 18, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, "Contrato Série C", "Vínculo com clube da 3ª divisão", "equipamento", "📋"},
		{103, 1500, 24, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, "Contrato Série B", "Vínculo com clube da 2ª divisão", "equipamento", "📋"},
		{104, 3500, 30, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, "Contrato Série A", "Contrato profissional 1ª divisão", "equipamento", "📝"},
		{105, 8000, 36, 0, 2, 1, 1, 0, 0, 0, 0, 0, 0, "Passe Copinha Nacional", "Inscrição na Copinha Nacional", "equipamento", "🏆"},
		{106, 25000, 42, 0, 2, 2, 1, 0, 0, 0, 0, 0, 0, "Passe Continentão", "Inscrição no Continentão", "equipamento", "🌎"},
		{107, 80000, 50, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, "Passaporte Europeu", "Documentação pra jogar na Europa", "equipamento", "🛂"},
		{108, 250000, 60, 0, 3, 2, 2, 0, 0, 0, 0, 0, 0, "Passe Liga dos Craques", "Inscrição na Liga dos Craques", "equipamento", "🌟"},
		{109, 800000, 72, 0, 3, 3, 2, 0, 0, 0, 0, 0, 0, "Convocação Oficial", "Documento da CBF", "equipamento", "🇧🇷"},
		{110, 2500000, 85, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, "Credencial Mundial", "Acesso ao Mundialito", "equipamento", "🏆"},
		{111, 8000000, 100, 0, 4, 3, 3, 0, 0, 0, 0, 0, 0, "Convite Bola de Ouro", "Indicação à Bola de Ouro", "equipamento", "🥇"},
		{112, 20000000, 120, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, "Troféu de Ídolo", "Reconhecimento eterno", "equipamento", "🗿"},
		// === CONSUMÍVEIS POR FAIXA — preço ~40% do trabalho top do tier ===
		// Nível 1-9 (Garoto) — trabalhos pagam 2-25
		{63, 8, 1, 9, 0, 0, 0, 0, 0, 0, 3, 0, 0, "Água Mineral", "Hidratação básica", "consumivel", "💧"},
		{64, 18, 1, 9, 0, 0, 0, 0, 0, 0, 0, 15, 0, "Curativo Simples", "Primeiro socorro", "consumivel", "🩹"},
		// Nível 10-17 (Amador) — trabalhos pagam 40-150
		{70, 60, 10, 17, 0, 0, 0, 0, 0, 0, 8, 0, 0, "Isotônico Sport", "Reidratação profissional", "consumivel", "🥤"},
		{71, 113, 10, 17, 0, 0, 0, 0, 0, 0, 0, 30, 0, "Kit Médico Amador", "Tratamento completo", "consumivel", "🩺"},
		{72, 135, 10, 17, 0, 0, 0, 0, 0, 0, 5, 15, 0, "Bebida Proteica", "Energia + saúde", "consumivel", "🧉"},
		// Nível 18-29 (Série C/B) — trabalhos pagam 150-1800
		{73, 1500, 18, 29, 0, 0, 0, 0, 0, 0, 15, 0, 0, "Vitamina B12 Especial", "Boost de energia pro", "consumivel", "💊"},
		{74, 2700, 18, 29, 0, 0, 0, 0, 0, 0, 0, 60, 0, "Spray Criogênico", "Recuperação instantânea", "consumivel", "🧊"},
		{75, 3300, 18, 29, 0, 0, 0, 0, 0, 0, 10, 30, 0, "Isotônico Power", "Energia + saúde premium", "consumivel", "⚡"},
		// Nível 30-49 (Série A/Copa/Liberta) — trabalhos pagam 800-35000
		{76, 2500, 30, 49, 0, 0, 0, 0, 0, 0, 20, 0, 0, "Carga de Inspiração", "Explosão de energia", "consumivel", "🔥"},
		{77, 5250, 30, 49, 0, 0, 0, 0, 0, 0, 0, 80, 0, "Tratamento VIP", "Saúde de craque", "consumivel", "💉"},
		{78, 7500, 30, 49, 0, 0, 0, 0, 0, 0, 12, 40, 0, "Shake do Campeão", "Recuperação total", "consumivel", "🥛"},
		// Nível 50-71 (Europa/Champions) — trabalhos pagam 15K-350K
		{79, 30000, 50, 71, 0, 0, 0, 0, 0, 0, 30, 0, 0, "Suplemento Elite", "Energia de elite", "consumivel", "✨"},
		{80, 60000, 50, 71, 0, 0, 0, 0, 0, 0, 0, 100, 0, "Nanomedicina", "Regeneração futurista", "consumivel", "🧬"},
		{81, 82500, 50, 71, 0, 0, 0, 0, 0, 0, 20, 60, 0, "Soro Premium", "Recuperação completa", "consumivel", "💎"},
		// Nível 72+ (Seleção/Copa/Lenda) — trabalhos pagam 150K-60M
		{82, 200000, 72, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, "Elixir Lendário", "Energia dos deuses", "consumivel", "🌟"},
		{83, 450000, 72, 0, 0, 0, 0, 0, 0, 0, 0, 150, 0, "Terapia Genética", "Saúde máxima", "consumivel", "🧬"},
		{84, 675000, 72, 0, 0, 0, 0, 0, 0, 0, 30, 80, 0, "Soro do GOAT", "O melhor de tudo", "consumivel", "🏆"},
		// Itens de missão (preço 0, ganhos em quests)
		{65, 0, 1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, "Água de Coco", "Recompensa de missão", "consumivel", "🥥"},
	}
	for _, it := range itens {
		Conn.Exec(`INSERT INTO cat_itens
			(id, nome, descricao, preco, tipo, icone, nivel_min, nivel_max,
			 bonus_forca, bonus_velocidade, bonus_habilidade, bonus_saude_max, bonus_energia_max,
			 bonus_vit_max, recupera_energia, recupera_saude, slots_mochila)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
			ON CONFLICT (id) DO UPDATE SET
				nome=EXCLUDED.nome,
				descricao=EXCLUDED.descricao,
				preco=EXCLUDED.preco,
				nivel_min=EXCLUDED.nivel_min,
				nivel_max=EXCLUDED.nivel_max,
				recupera_energia=EXCLUDED.recupera_energia,
				recupera_saude=EXCLUDED.recupera_saude`,
			it.id, it.nome, it.descricao, it.preco, it.tipo, it.icone,
			it.nivelMin, it.nivelMax, it.bonusForca, it.bonusVelocidade, it.bonusHabilidade,
			it.bonusSaudeMax, it.bonusEnergiaMax, it.bonusVitMax,
			it.recuperaEnergia, it.recuperaSaude, it.slotsMochila)
	}

	// Cooldowns: barato+pouco = cooldown curto | caro+muito = cooldown longo
	energyItems := []struct{ id, recuperaEnergia, cooldown int }{
		// Garoto (1-4): barato 10min, caro 20min
		{14, 3, 10}, {30, 8, 20}, {5, 0, 15},
		// Base (5-9): barato 10min, caro 20min
		{63, 5, 10}, {31, 12, 20}, {64, 0, 15},
		// Amador (10-17): barato 10min, caro 20min
		{70, 5, 10}, {32, 15, 20}, {71, 0, 15},
		// Série C (18-23): barato 10min, caro 25min
		{72, 5, 10}, {33, 18, 25}, {73, 0, 15},
		// Série B/A (24-35): barato 10min, caro 25min
		{74, 5, 10}, {34, 22, 25}, {75, 0, 15},
		// Copa/Liberta (36-49): barato 10min, caro 25min
		{76, 5, 10}, {77, 25, 25}, {78, 0, 15},
		// Europa/Champions (50-71): barato 10min, caro 25min
		{79, 5, 10}, {80, 30, 25}, {81, 0, 15},
		// Seleção/Lenda (72+): barato 10min, caro 25min
		{82, 5, 10}, {83, 40, 25}, {84, 0, 15},
		// Missão
		{65, 5, 15},
	}
	for _, e := range energyItems {
		Conn.Exec(`UPDATE cat_itens SET recupera_energia=$1, cooldown_minutos=$2 WHERE id=$3`,
			e.recuperaEnergia, e.cooldown, e.id)
	}

	// Itens de saúde (recupera_saude > 0) custam moedas, não dinheiro
	saudeMoedas := map[int]int{
		// Saúde pura
		5: 1, 64: 1,       // Garoto/Base: 1 moeda
		71: 2,              // Amador: 2 moedas
		74: 3,              // Série C/B: 3 moedas
		77: 5,              // Série A/Copa: 5 moedas
		80: 8,              // Europa/Champions: 8 moedas
		83: 12,             // Seleção/Lenda: 12 moedas
		// Combo (energia + saúde)
		72: 2,              // Amador combo: 2 moedas
		75: 4,              // Série C/B combo: 4 moedas
		78: 6,              // Série A/Copa combo: 6 moedas
		81: 10,             // Europa combo: 10 moedas
		84: 15,             // Lenda combo: 15 moedas
		// Antigos (primeira seção, sobrescritos mas por segurança)
		73: 3,
	}
	for id, moedas := range saudeMoedas {
		Conn.Exec(`UPDATE cat_itens SET preco_moedas=$1, preco=0 WHERE id=$2`, moedas, id)
	}

	// Update rarities for new items
	raridadeUpdates := map[int]string{
		43: "raro", 44: "raro", 48: "raro", 49: "raro", 54: "raro", 55: "raro", 57: "raro", 58: "raro",
		50: "epico", 56: "epico", 59: "epico",
		60: "lendario", 61: "lendario", 62: "lendario",
		63: "comum", 64: "comum", 65: "comum",
	}
	for id, rar := range raridadeUpdates {
		Conn.Exec("UPDATE cat_itens SET raridade=$1 WHERE id=$2", rar, id)
	}

	// Seed cat_trabalhos
	type trabalhoSeed struct {
		id, tier, nome, icone string
		nivelMin, energia, ganhoMin, ganhoMax, ganhoXP, requerItem, limiteDiario int
	}
	trabalhos := []trabalhoSeed{
		// === GAROTO (nv 1-4) ===
		{"bola", "Garoto", "Pegar bola que saiu de campo", "⚽", 1, 2, 2, 5, 3, 0, 20},
		{"fogos", "Garoto", "Vender fogos de artifício", "🎆", 1, 2, 5, 10, 3, 0, 20},
		{"dogao", "Garoto", "Vender dogão na porta do estádio", "🌭", 1, 2, 8, 15, 4, 0, 15},
		{"bebidas", "Garoto", "Vender bebidas no estádio", "🍺", 2, 6, 15, 25, 10, 6, 12},
		// === BASE (nv 5-9) ===
		{"panfleto", "Base", "Distribuir panfleto de evento", "📄", 5, 2, 10, 18, 5, 0, 15},
		{"lavajato", "Base", "Trabalhar no lava-jato", "🚗", 5, 3, 25, 40, 12, 0, 10},
		{"pelada", "Base", "Jogar pelada organizada", "⚽", 5, 3, 20, 35, 12, 7, 10},
		{"escolinha", "Base", "Monitor de escolinha de futebol", "🧒", 6, 7, 35, 55, 14, 100, 8},
		// === AMADOR (nv 10-17) ===
		{"campinho", "Amador", "Treinar no campinho do bairro", "🏃", 10, 2, 40, 65, 16, 7, 8},
		{"arbitro", "Amador", "Árbitro de pelada", "🟨", 10, 2, 50, 80, 16, 0, 8},
		{"treino", "Amador", "Ajudar no treino do time local", "🎯", 10, 3, 80, 120, 30, 7, 6},
		{"captador", "Amador", "Captador de jovens talentos", "🔍", 13, 7, 100, 150, 33, 101, 6},
		// === SÉRIE C (nv 18-23) ===
		{"serie_c_treino", "Série C", "Treinar no CT do clube", "🏟️", 18, 3, 150, 250, 35, 8, 6},
		{"serie_c_jogo", "Série C", "Jogar partida da Série C", "⚽", 18, 4, 250, 400, 50, 8, 5},
		{"serie_c_gol", "Série C", "Marcar gol na Série C", "🥅", 20, 4, 350, 550, 65, 8, 4},
		{"serie_c_destaque", "Série C", "Ser destaque da rodada", "⭐", 22, 8, 500, 800, 80, 102, 3},
		// === SÉRIE B (nv 24-29) ===
		{"serie_b_treino", "Série B", "Treinar com time da Série B", "🏋️", 24, 3, 400, 650, 55, 8, 6},
		{"serie_b_jogo", "Série B", "Jogar partida da Série B", "⚽", 24, 4, 600, 1000, 75, 8, 5},
		{"serie_b_artilheiro", "Série B", "Artilheiro da rodada", "🎯", 26, 5, 900, 1400, 95, 8, 4},
		{"serie_b_acesso", "Série B", "Lutar pelo acesso", "🏆", 28, 9, 1200, 1800, 110, 103, 3},
		// === SÉRIE A (nv 30-35) ===
		{"serie_a_treino", "Série A", "Treinar no CT profissional", "🏟️", 30, 3, 800, 1200, 70, 8, 5},
		{"serie_a_jogo", "Série A", "Jogar partida do Boleirão", "⚽", 30, 4, 1200, 2000, 90, 8, 4},
		{"serie_a_classico", "Série A", "Jogar clássico regional", "🔥", 32, 5, 1800, 3000, 115, 8, 3},
		{"serie_a_titulo", "Série A", "Disputar título brasileiro", "🏆", 34, 9, 2500, 4000, 135, 104, 3},
		// === COPINHA NACIONAL (nv 36-41) ===
		{"copa_br_fase", "Copinha Nacional", "Jogar fase de grupos", "🏆", 36, 4, 2000, 3500, 100, 35, 4},
		{"copa_br_quartas", "Copinha Nacional", "Quartas de final", "⚡", 38, 5, 3500, 5500, 130, 35, 3},
		{"copa_br_semi", "Copinha Nacional", "Semifinal da Copinha", "🔥", 39, 5, 5000, 8000, 160, 35, 3},
		{"copa_br_final", "Copinha Nacional", "Final da Copinha Nacional", "🏆", 41, 9, 8000, 12000, 200, 105, 2},
		// === CONTINENTÃO (nv 42-49) ===
		{"liberta_fase", "Continentão", "Fase de grupos do Continentão", "🌎", 42, 4, 5000, 8000, 120, 35, 4},
		{"liberta_oitavas", "Continentão", "Oitavas do Continentão", "⚔️", 44, 5, 8000, 13000, 150, 35, 3},
		{"liberta_semi", "Continentão", "Semifinal do Continentão", "🔥", 46, 5, 13000, 20000, 185, 35, 2},
		{"liberta_final", "Continentão", "Final do Continentão", "🏆", 48, 9, 20000, 35000, 220, 106, 2},
		// === EUROPA (nv 50-59) ===
		{"europa_contrato", "Europa", "Assinar com clube europeu", "📝", 50, 4, 15000, 25000, 140, 36, 4},
		{"europa_liga", "Europa", "Jogar liga nacional europeia", "🌍", 52, 4, 25000, 40000, 170, 36, 3},
		{"europa_destaque", "Europa", "Melhor jogador do mês", "⭐", 55, 5, 40000, 65000, 200, 36, 3},
		{"europa_mvp", "Europa", "MVP da temporada europeia", "🏅", 58, 9, 65000, 100000, 250, 107, 2},
		// === LIGA DOS CRAQUES (nv 60-71) ===
		{"ucl_fase", "Liga dos Craques", "Fase de grupos da Liga", "🌟", 60, 4, 50000, 80000, 180, 37, 3},
		{"ucl_quartas", "Liga dos Craques", "Quartas da Liga dos Craques", "⚡", 63, 5, 80000, 130000, 220, 37, 3},
		{"ucl_semi", "Liga dos Craques", "Semifinal da Liga", "🔥", 66, 5, 130000, 200000, 280, 37, 2},
		{"ucl_final", "Liga dos Craques", "Final da Liga dos Craques", "🏆", 69, 9, 200000, 350000, 350, 108, 2},
		// === SELEÇOCA (nv 72-84) ===
		{"selecao_conv", "Seleçoca", "Convocado pra Seleçoca", "🇧🇷", 72, 4, 150000, 250000, 250, 38, 3},
		{"selecao_amistoso", "Seleçoca", "Amistoso internacional", "⚽", 74, 5, 250000, 400000, 300, 38, 3},
		{"selecao_eliminatorias", "Seleçoca", "Eliminatórias do Mundialito", "🌎", 78, 5, 400000, 600000, 380, 38, 2},
		{"selecao_titular", "Seleçoca", "Titular da Seleçoca", "⭐", 82, 9, 600000, 1000000, 450, 109, 2},
		// === MUNDIALITO (nv 85-99) ===
		{"copa_fase", "Mundialito", "Fase de grupos do Mundialito", "🏆", 85, 4, 500000, 800000, 350, 38, 3},
		{"copa_oitavas", "Mundialito", "Oitavas do Mundialito", "⚔️", 88, 5, 800000, 1300000, 450, 38, 2},
		{"copa_semi", "Mundialito", "Semifinal do Mundialito", "🔥", 92, 5, 1300000, 2000000, 550, 38, 2},
		{"copa_final", "Mundialito", "Final do Mundialito", "🏆", 96, 9, 2000000, 3500000, 700, 110, 1},
		// === BOLA DE OURO (nv 100-119) ===
		{"ballon_indicado", "Bola de Ouro", "Indicado à Bola de Ouro", "🥇", 100, 5, 2000000, 3500000, 600, 0, 2},
		{"ballon_top3", "Bola de Ouro", "Top 3 da Bola de Ouro", "🏅", 105, 5, 3500000, 5500000, 750, 0, 2},
		{"ballon_vencedor", "Bola de Ouro", "Vencer a Bola de Ouro", "🥇", 110, 9, 5500000, 8000000, 900, 111, 1},
		// === ÍDOLO (nv 120-149) ===
		{"idolo_estatua", "Ídolo", "Ganhar estátua no clube", "🗿", 120, 5, 800000, 1300000, 1000, 0, 1},
		{"idolo_camisa", "Ídolo", "Camisa aposentada", "👕", 130, 5, 1000000, 1700000, 1200, 0, 1},
		{"idolo_hino", "Ídolo", "Torcida canta seu nome", "🎵", 140, 9, 1500000, 2500000, 1400, 112, 1},
		// === LENDA (nv 150+) ===
		{"hall_fama", "Lenda", "Entrar no Hall da Fama", "👑", 150, 5, 2000000, 3500000, 2000, 0, 1},
		{"lenda_embaixador", "Lenda", "Embaixador do futebol mundial", "🌍", 175, 5, 3000000, 5000000, 3000, 0, 1},
		{"lenda_imortal", "Lenda", "O Imortal do Futebol", "✨", 200, 9, 5000000, 8000000, 5000, 0, 1},
	}
	for _, t := range trabalhos {
		Conn.Exec(`INSERT INTO cat_trabalhos
			(id, nome, tier, nivel_min, energia, ganho_min, ganho_max, ganho_xp, requer_item, icone, limite_diario)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			ON CONFLICT (id) DO UPDATE SET
				energia=EXCLUDED.energia,
				ganho_min=EXCLUDED.ganho_min,
				ganho_max=EXCLUDED.ganho_max,
				ganho_xp=EXCLUDED.ganho_xp,
				requer_item=EXCLUDED.requer_item,
				limite_diario=EXCLUDED.limite_diario`,
			t.id, t.nome, t.tier, t.nivelMin, t.energia, t.ganhoMin, t.ganhoMax, t.ganhoXP, t.requerItem, t.icone, t.limiteDiario)
	}

	// Seed cat_itens_premium
	type premiumSeed struct {
		id, preco, avatarID, mochilaSlots int
		nome, descricao, tipo, icone, tituloVal string
	}
	premium := []premiumSeed{
		{1, 15, 11, 0, "Avatar Dragão", "Avatar premium exclusivo — Dragão", "avatar", "🐉", ""},
		{2, 20, 12, 0, "Avatar Unicórnio", "Avatar premium exclusivo — Unicórnio", "avatar", "🦄", ""},
		{3, 20, 13, 0, "Avatar Máscara", "Avatar misterioso exclusivo — Máscara", "avatar", "🎭", ""},
		{4, 25, 14, 0, "Avatar Diamante", "Avatar do craque de elite — Diamante", "avatar", "💎", ""},
		{5, 25, 15, 0, "Avatar Lua", "Avatar mágico noturno — Lua", "avatar", "🌙", ""},
		{6, 20, 0, 0, "Título: Craque Lendário", "Aparece ao seu nome no ranking", "titulo", "🏅", "Craque Lendário"},
		{7, 40, 0, 0, "Título: Campeão do Mundo", "O título mais prestioso do jogo", "titulo", "🌍", "Campeão do Mundo"},
		{8, 80, 0, 50, "Mochila VIP", "50 slots de inventário permanentes", "mochila_vip", "👝", ""},
		{9, 60, 0, 0, "Cooldown Premium", "Reduz cooldown de consumíveis de 10min para 5min permanentemente", "perk_cooldown", "⚡", ""},
	}
	for _, p := range premium {
		Conn.Exec(`INSERT INTO cat_itens_premium
			(id, nome, descricao, preco, tipo, icone, avatar_id, titulo_val, mochila_slots)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			ON CONFLICT (id) DO NOTHING`,
			p.id, p.nome, p.descricao, p.preco, p.tipo, p.icone, p.avatarID, p.tituloVal, p.mochilaSlots)
	}

	// Seed cat_itens_fama — apenas itens de luxo (motos, carros, apartamentos)
	type famaSeed struct {
		id, nome, descricao, icone, categoria string
		preco, famaGanha, limite              int
	}
	fama := []famaSeed{
		// Motos (limite 2 por modelo)
		{"moto_cg", "CG 160", "A moto do trabalhador", "🏍️", "moto", 5000, 30, 2},
		{"moto_fazer", "Fazer 250", "Estilo e velocidade nas ruas", "🏍️", "moto", 15000, 80, 2},
		{"moto_cb500", "CB 500", "Moto de respeito", "🏍️", "moto", 40000, 200, 2},
		{"moto_bmw", "BMW S1000", "Supermáquina alemã", "🏍️", "moto", 120000, 600, 2},
		{"moto_ducati", "Ducati Panigale", "A moto dos sonhos", "🏍️", "moto", 350000, 1500, 2},
		// Carros (limite 2 por modelo)
		{"carro_uno", "Uno Mille", "O primeiro carro do craque", "🚗", "carro", 8000, 40, 2},
		{"carro_civic", "Civic Si", "Conforto e potência", "🚗", "carro", 35000, 150, 2},
		{"carro_hilux", "Hilux SW4", "Pra quem manda no bairro", "🚙", "carro", 80000, 400, 2},
		{"carro_bmw", "BMW M3", "Luxo europeu na garagem", "🚗", "carro", 200000, 900, 2},
		{"carro_ferrari", "Ferrari 488", "O carro dos campeões", "🏎️", "carro", 500000, 2000, 2},
		{"carro_bugatti", "Bugatti Chiron", "Hipercar lendário", "🏎️", "carro", 1500000, 5000, 2},
		// Apartamentos (limite 1 por modelo)
		{"apto_kitnet", "Kitnet no Bairro", "Saiu da casa dos pais", "🏠", "apartamento", 50000, 100, 1},
		{"apto_2quartos", "Apartamento 2 Quartos", "Confortável e funcional", "🏢", "apartamento", 150000, 350, 1},
		{"apto_cobertura", "Cobertura Duplex", "Vista panorâmica da cidade", "🏢", "apartamento", 500000, 1200, 1},
		{"apto_penthouse", "Penthouse de Luxo", "O topo do mundo", "🏢", "apartamento", 1500000, 3500, 1},
		{"apto_mansao", "Mansão do Craque", "Piscina, churrasqueira e tudo mais", "🏰", "apartamento", 5000000, 10000, 1},
	}
	// Limpar itens antigos que não existem mais
	Conn.Exec(`DELETE FROM cat_itens_fama WHERE id NOT IN ('moto_cg','moto_fazer','moto_cb500','moto_bmw','moto_ducati','carro_uno','carro_civic','carro_hilux','carro_bmw','carro_ferrari','carro_bugatti','apto_kitnet','apto_2quartos','apto_cobertura','apto_penthouse','apto_mansao')`)
	for _, f := range fama {
		Conn.Exec(`INSERT INTO cat_itens_fama
			(id, nome, descricao, preco, fama_ganha, icone, unico, categoria, limite_compra)
			VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8)
			ON CONFLICT (id) DO UPDATE SET preco=$4, fama_ganha=$5, categoria=$7, limite_compra=$8`,
			f.id, f.nome, f.descricao, f.preco, f.famaGanha, f.icone, f.categoria, f.limite)
	}

	// Seed cat_tasks_diarias
	type taskSeed struct {
		id, nome, descricao, tipo, dificuldade string
		objetivo, recompensaDinheiro, recompensaXP, recompensaFama int
	}
	tasks := []taskSeed{
		{"t_trabalhos_3", "Suado no Treino", "Faça 3 trabalhos hoje", "trabalhos", "facil", 3, 200, 1, 5},
		{"t_trabalhos_8", "Jornada Completa", "Faça 8 trabalhos hoje", "trabalhos", "medio", 8, 600, 1, 15},
		{"t_dinheiro_500", "Ganhador do Dia", "Ganhe R$ 500 trabalhando", "ganho_dinheiro", "facil", 500, 300, 1, 5},
		{"t_dinheiro_3000", "Empresário de Si Mesmo", "Ganhe R$ 3.000 trabalhando", "ganho_dinheiro", "medio", 3000, 1000, 1, 20},
		{"t_combate_1", "Hora do Duelo", "Participe de 1 combate", "combates", "facil", 1, 400, 1, 25},
		{"t_combate_3", "Guerreiro", "Participe de 3 combates", "combates", "dificil", 3, 1500, 1, 80},
	}
	for _, t := range tasks {
		Conn.Exec(`INSERT INTO cat_tasks_diarias
			(id, nome, descricao, tipo, objetivo, recompensa_dinheiro, recompensa_xp, recompensa_fama, dificuldade)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			ON CONFLICT (id) DO NOTHING`,
			t.id, t.nome, t.descricao, t.tipo, t.objetivo, t.recompensaDinheiro, t.recompensaXP, t.recompensaFama, t.dificuldade)
	}

	// Seed cat_avatares
	type avatarSeed struct {
		id int
		icone, tipo string
	}
	avatares := []avatarSeed{
		{1, "⚽", "comum"}, {2, "🏆", "comum"}, {3, "👟", "comum"}, {4, "🥅", "comum"},
		{5, "🎽", "comum"}, {6, "🌟", "comum"}, {7, "🦁", "comum"}, {8, "🦅", "comum"},
		{9, "🐯", "comum"}, {10, "🔥", "comum"},
		{11, "🐉", "premium"}, {12, "🦄", "premium"}, {13, "🎭", "premium"},
		{14, "💎", "premium"}, {15, "🌙", "premium"},
	}
	for _, a := range avatares {
		Conn.Exec(`INSERT INTO cat_avatares (id, icone, tipo) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
			a.id, a.icone, a.tipo)
	}

	// Seed campinho_niveis
	type campinhoNivelSeed struct {
		nivel      int
		nome, desc, arte string
		bonusXP    int
	}
	campinhoNiveis := []campinhoNivelSeed{
		{0, "Campo de Terra", "Seu campinho humilde. Um pedaço de chão batido.", "/estadios/campo-simples.png", 10},
		{1, "Com Traves de Madeira", "Agora tem gol! Traves feitas com madeira do bairro.", "/estadios/campo-simples.png", 10},
		{2, "Campo Marcado", "Linhas de gesso marcam o campo. Parece quase oficial!", "/estadios/campo-simples.png", 10},
		{3, "Com Grama", "Gramado plantado! Agora sim parece um campo de verdade.", "/estadios/campo-simples.png", 10},
		{4, "Com Arquibancada", "Torcida tem onde sentar! O bairro inteiro vem assistir.", "/estadios/campo-simples.png", 10},
		{5, "Com Iluminação", "Jogos noturnos! Holofotes iluminam o campo.", "/estadios/campo-simples.png", 10},
		{6, "Estádio Completo", "Um mini-estádio! Seu legado no bairro.", "/estadios/campo-simples.png", 10},
	}
	for _, cn := range campinhoNiveis {
		Conn.Exec(`INSERT INTO campinho_niveis (nivel, nome, descricao, arte, bonus_xp_pct)
			VALUES ($1,$2,$3,$4,$5) ON CONFLICT (nivel) DO NOTHING`,
			cn.nivel, cn.nome, cn.desc, cn.arte, cn.bonusXP)
	}

	// Seed campinho_materiais
	type matSeed struct {
		nivel int
		material string
		quantidade int
	}
	materiais := []matSeed{
		{1, "Madeira", 3}, {1, "Prego", 2},
		{2, "Gesso", 5}, {2, "Cal", 2},
		{3, "Semente", 5}, {3, "Adubo", 3},
		{4, "Metal", 8}, {4, "Solda", 5},
		{5, "Fio", 10}, {5, "Lampada", 5}, {5, "Poste", 3},
		{6, "Concreto", 15}, {6, "Tinta", 10}, {6, "Rede", 5},
	}
	for _, m := range materiais {
		Conn.Exec(`INSERT INTO campinho_materiais (nivel, material, quantidade)
			VALUES ($1,$2,$3) ON CONFLICT (nivel, material) DO NOTHING`,
			m.nivel, m.material, m.quantidade)
	}

	// Seed campinho_requisitos (desafios pra cada nível atual)
	type reqSeed struct {
		nivel    int
		tipo     string
		objetivo int
		descricao string
	}
	requisitos := []reqSeed{
		// Nível 0 (Campo de Terra) → pra ir pro 1
		{0, "energia_gasta", 1000, "Gaste 1.000 de energia"},
		{0, "vitorias", 100, "Vença 100 batalhas no estádio"},
		{0, "desafios_1v1", 10, "Vença 10 desafios 1v1"},
		// Nível 1 (Com Traves) → pra ir pro 2
		{1, "energia_gasta", 3000, "Gaste 3.000 de energia"},
		{1, "vitorias", 250, "Vença 250 batalhas no estádio"},
		{1, "desafios_1v1", 25, "Vença 25 desafios 1v1"},
		// Nível 2 (Campo Marcado) → pra ir pro 3
		{2, "energia_gasta", 6000, "Gaste 6.000 de energia"},
		{2, "vitorias", 500, "Vença 500 batalhas"},
		{2, "desafios_1v1", 50, "Vença 50 desafios 1v1"},
		// Nível 3 (Com Grama) → pra ir pro 4
		{3, "energia_gasta", 12000, "Gaste 12.000 de energia"},
		{3, "vitorias", 1000, "Vença 1.000 batalhas"},
		{3, "desafios_1v1", 100, "Vença 100 desafios 1v1"},
		// Nível 4 (Com Arquibancada) → pra ir pro 5
		{4, "energia_gasta", 25000, "Gaste 25.000 de energia"},
		{4, "vitorias", 2000, "Vença 2.000 batalhas"},
		{4, "desafios_1v1", 200, "Vença 200 desafios 1v1"},
		// Nível 5 (Com Iluminação) → pra ir pro 6
		{5, "energia_gasta", 50000, "Gaste 50.000 de energia"},
		{5, "vitorias", 5000, "Vença 5.000 batalhas"},
		{5, "desafios_1v1", 500, "Vença 500 desafios 1v1"},
	}
	for _, r := range requisitos {
		Conn.Exec(`INSERT INTO campinho_requisitos (nivel, tipo, objetivo, descricao)
			VALUES ($1,$2,$3,$4) ON CONFLICT (nivel, tipo) DO UPDATE SET objetivo=EXCLUDED.objetivo, descricao=EXCLUDED.descricao`,
			r.nivel, r.tipo, r.objetivo, r.descricao)
	}

	// Seed quests
	type questSeed struct {
		id, nome, descricao, icone, tipo, recompensaMaterial string
		objetivo, nivelMin, nivelMax                         int
		recompensaQuantidade, recompensaXP, recompensaDinheiro, recompensaEnergia, recompensaItemID int
	}
	questsList := []questSeed{
		// Old material quests (campinho system) — always available (nivel_min=0, nivel_max=0)
		{"q_batalhas_10", "Guerreiro Iniciante", "Vença 10 batalhas no estádio", "⚔️", "vitorias", "Madeira", 10, 0, 0, 2, 5, 0, 0, 0},
		{"q_trabalhos_20", "Trabalhador Dedicado", "Complete 20 trabalhos", "💼", "trabalhos", "Madeira", 20, 0, 0, 1, 0, 20, 0, 0},
		{"q_energia_100", "Maratonista", "Gaste 100 de energia em trabalhos", "⚡", "energia_gasta", "Prego", 100, 0, 0, 2, 10, 0, 0, 0},
		{"q_batalhas_30", "Lutador Experiente", "Vença 30 batalhas", "⚔️", "vitorias", "Gesso", 30, 0, 0, 3, 10, 0, 0, 0},
		{"q_trabalhos_50", "Profissional", "Complete 50 trabalhos", "💼", "trabalhos", "Gesso", 50, 0, 0, 2, 0, 50, 0, 0},
		{"q_fama_100", "Famoso do Bairro", "Acumule 100 de fama", "⭐", "fama", "Cal", 100, 0, 0, 2, 15, 0, 0, 0},
		{"q_batalhas_80", "Campeão Local", "Vença 80 batalhas", "⚔️", "vitorias", "Semente", 80, 0, 0, 3, 20, 0, 0, 0},
		{"q_nivel_15", "Promessa", "Alcance nível 15", "📊", "nivel", "Semente", 15, 0, 0, 2, 0, 100, 0, 0},
		{"q_trabalhos_100", "Veterano", "Complete 100 trabalhos", "💼", "trabalhos", "Adubo", 100, 0, 0, 3, 0, 80, 0, 0},
		{"q_batalhas_150", "Gladiador", "Vença 150 batalhas", "⚔️", "vitorias", "Metal", 150, 0, 0, 4, 30, 0, 0, 0},
		{"q_fama_500", "Celebridade", "Acumule 500 de fama", "⭐", "fama", "Metal", 500, 0, 0, 4, 0, 200, 0, 0},
		{"q_energia_500", "Incansável", "Gaste 500 de energia", "⚡", "energia_gasta", "Solda", 500, 0, 0, 3, 25, 0, 0, 0},
		{"q_nivel_25", "Semi-Pro", "Alcance nível 25", "📊", "nivel", "Solda", 25, 0, 0, 2, 0, 150, 0, 0},
		{"q_batalhas_300", "Lenda do Estádio", "Vença 300 batalhas", "⚔️", "vitorias", "Fio", 300, 0, 0, 5, 50, 0, 0, 0},
		{"q_trabalhos_300", "Workaholic", "Complete 300 trabalhos", "💼", "trabalhos", "Lampada", 300, 0, 0, 3, 0, 300, 0, 0},
		{"q_fama_1000", "Ídolo", "Acumule 1000 de fama", "⭐", "fama", "Poste", 1000, 0, 0, 3, 40, 0, 0, 0},
		{"q_nivel_40", "Craque", "Alcance nível 40", "📊", "nivel", "Fio", 40, 0, 0, 5, 0, 500, 0, 0},
		{"q_batalhas_500", "Imortal", "Vença 500 batalhas", "⚔️", "vitorias", "Concreto", 500, 0, 0, 8, 80, 0, 0, 0},
		{"q_trabalhos_500", "Lenda Trabalhadora", "Complete 500 trabalhos", "💼", "trabalhos", "Tinta", 500, 0, 0, 5, 0, 500, 0, 0},
		{"q_fama_3000", "Hall da Fama", "Acumule 3000 de fama", "⭐", "fama", "Rede", 3000, 0, 0, 3, 100, 0, 0, 0},
		{"q_nivel_60", "Elite", "Alcance nível 60", "📊", "nivel", "Concreto", 60, 0, 0, 7, 0, 1000, 0, 0},
		{"q_energia_2000", "Máquina", "Gaste 2000 de energia", "⚡", "energia_gasta", "Tinta", 2000, 0, 0, 5, 60, 0, 0, 0},

		// NEW level-based quests — Level 1-10
		{"m_rua_10v", "Rei da Rua", "Vença 10 batalhas no estádio", "⚔️", "vitorias", "", 10, 1, 10, 0, 5, 15, 0, 43},
		{"m_rua_energia", "Maratonista Iniciante", "Gaste 50 de energia", "⚡", "energia_gasta", "", 50, 1, 10, 0, 8, 0, 5, 0},
		{"m_rua_trab", "Batalhador", "Complete 15 trabalhos", "💼", "trabalhos", "", 15, 1, 10, 0, 10, 20, 0, 0},
		{"m_rua_1v1", "Ousado", "Vença 3 desafios 1v1", "⚽", "desafios_1v1", "", 3, 1, 10, 0, 12, 0, 0, 44},

		// Level 10-20
		{"m_amador_50v", "Gladiador Amador", "Vença 50 batalhas", "⚔️", "vitorias", "", 50, 10, 20, 0, 20, 50, 0, 48},
		{"m_amador_energia", "Incansável", "Gaste 200 de energia", "⚡", "energia_gasta", "", 200, 10, 20, 0, 25, 0, 10, 0},
		{"m_amador_trab", "Profissional do Bico", "Complete 40 trabalhos", "💼", "trabalhos", "", 40, 10, 20, 0, 30, 80, 0, 0},
		{"m_amador_1v1", "Artilheiro", "Vença 8 desafios 1v1", "⚽", "desafios_1v1", "", 8, 10, 20, 0, 35, 0, 0, 49},
		{"m_amador_epic", "Camisa 10", "Vença 15 desafios 1v1", "🌟", "desafios_1v1", "", 15, 10, 20, 0, 50, 100, 0, 50},

		// Level 20-35
		{"m_pro_100v", "Centurião", "Vença 100 batalhas", "⚔️", "vitorias", "", 100, 20, 35, 0, 60, 150, 0, 54},
		{"m_pro_energia", "Motor Infinito", "Gaste 500 de energia", "⚡", "energia_gasta", "", 500, 20, 35, 0, 50, 0, 15, 0},
		{"m_pro_trab", "Veterano", "Complete 80 trabalhos", "💼", "trabalhos", "", 80, 20, 35, 0, 70, 200, 0, 0},
		{"m_pro_1v1", "Cobrador Mortal", "Vença 20 desafios 1v1", "⚽", "desafios_1v1", "", 20, 20, 35, 0, 80, 0, 0, 55},
		{"m_pro_epic", "Galáctico", "Vença 30 desafios 1v1 e 200 batalhas", "🌟", "vitorias", "", 200, 20, 35, 0, 120, 300, 0, 56},

		// Level 35-50
		{"m_craque_200v", "Ídolo", "Vença 200 batalhas", "⚔️", "vitorias", "", 200, 35, 50, 0, 100, 400, 0, 57},
		{"m_craque_1v1", "Artilheiro Supremo", "Vença 40 desafios 1v1", "⚽", "desafios_1v1", "", 40, 35, 50, 0, 150, 0, 0, 58},
		{"m_craque_epic", "Capitão Imortal", "Vença 300 batalhas", "🛡️", "vitorias", "", 300, 35, 50, 0, 200, 500, 0, 59},
		{"m_craque_legend", "O Escolhido", "Vença 60 desafios 1v1", "👑", "desafios_1v1", "", 60, 35, 50, 0, 300, 800, 0, 60},

		// Level 50+
		{"m_elite_legend", "Imortal", "Vença 500 batalhas", "🦸", "vitorias", "", 500, 50, 70, 0, 400, 1000, 0, 61},
		{"m_elite_goat", "O GOAT", "Vença 100 desafios 1v1", "🏆", "desafios_1v1", "", 100, 50, 999, 0, 600, 2000, 0, 62},

		// ========================
		// POSITION QUESTS — give titles per tier
		// ========================

		// Amador (nivel 10-17)
		{"pos_ata_amador", "Garoto de Ouro", "Vença 30 batalhas como Atacante", "⚽", "vitorias", "", 30, 10, 17, 0, 25, 50, 0, 0},
		{"pos_def_amador", "Muralha do Bairro", "Vença 30 batalhas como Defensor", "🛡️", "vitorias", "", 30, 10, 17, 0, 25, 50, 0, 0},
		{"pos_med_amador", "Maestro da Rua", "Complete 50 trabalhos como Meia", "🎯", "trabalhos", "", 50, 10, 17, 0, 25, 50, 0, 0},
		{"pos_gk_amador", "Mãos de Aço", "Vença 10 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 10, 10, 17, 0, 25, 50, 0, 0},

		// Série C (nivel 18-23)
		{"pos_ata_seriec", "Artilheiro da C", "Vença 50 batalhas como Atacante", "⚽", "vitorias", "", 50, 18, 23, 0, 40, 80, 0, 0},
		{"pos_def_seriec", "Zagueiro Implacável", "Vença 50 batalhas como Defensor", "🛡️", "vitorias", "", 50, 18, 23, 0, 40, 80, 0, 0},
		{"pos_med_seriec", "Meia de Classe", "Complete 80 trabalhos como Meia", "🎯", "trabalhos", "", 80, 18, 23, 0, 40, 80, 0, 0},
		{"pos_gk_seriec", "Paredão da C", "Vença 15 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 15, 18, 23, 0, 40, 80, 0, 0},

		// Série B (nivel 24-29)
		{"pos_ata_serieb", "Goleador da B", "Vença 80 batalhas como Atacante", "⚽", "vitorias", "", 80, 24, 29, 0, 60, 120, 0, 0},
		{"pos_def_serieb", "Xerife da B", "Vença 80 batalhas como Defensor", "🛡️", "vitorias", "", 80, 24, 29, 0, 60, 120, 0, 0},
		{"pos_med_serieb", "Camisa 10 da B", "Complete 120 trabalhos como Meia", "🎯", "trabalhos", "", 120, 24, 29, 0, 60, 120, 0, 0},
		{"pos_gk_serieb", "Santo da B", "Vença 20 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 20, 24, 29, 0, 60, 120, 0, 0},

		// Série A (nivel 30-35)
		{"pos_ata_seriea", "Artilheiro do Boleirão", "Vença 120 batalhas como Atacante", "⚽", "vitorias", "", 120, 30, 35, 0, 80, 180, 0, 0},
		{"pos_def_seriea", "Melhor Zagueiro BR", "Vença 120 batalhas como Defensor", "🛡️", "vitorias", "", 120, 30, 35, 0, 80, 180, 0, 0},
		{"pos_med_seriea", "Craque do Boleirão", "Complete 180 trabalhos como Meia", "🎯", "trabalhos", "", 180, 30, 35, 0, 80, 180, 0, 0},
		{"pos_gk_seriea", "Goleiro do Ano", "Vença 30 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 30, 30, 35, 0, 80, 180, 0, 0},

		// Copinha Nacional (nivel 36-41)
		{"pos_ata_copabr", "Matador da Copinha", "Vença 160 batalhas como Atacante", "⚽", "vitorias", "", 160, 36, 41, 0, 100, 250, 0, 0},
		{"pos_def_copabr", "Muro da Copinha", "Vença 160 batalhas como Defensor", "🛡️", "vitorias", "", 160, 36, 41, 0, 100, 250, 0, 0},
		{"pos_med_copabr", "Maestro da Copinha", "Complete 240 trabalhos como Meia", "🎯", "trabalhos", "", 240, 36, 41, 0, 100, 250, 0, 0},
		{"pos_gk_copabr", "Muralha da Copinha", "Vença 40 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 40, 36, 41, 0, 100, 250, 0, 0},

		// Continentão (nivel 42-49)
		{"pos_ata_liberta", "Goleador do Continentão", "Vença 200 batalhas como Atacante", "⚽", "vitorias", "", 200, 42, 49, 0, 130, 350, 0, 0},
		{"pos_def_liberta", "Xerife do Continente", "Vença 200 batalhas como Defensor", "🛡️", "vitorias", "", 200, 42, 49, 0, 130, 350, 0, 0},
		{"pos_med_liberta", "Camisa 10 do Continente", "Complete 300 trabalhos como Meia", "🎯", "trabalhos", "", 300, 42, 49, 0, 130, 350, 0, 0},
		{"pos_gk_liberta", "Paredão do Continente", "Vença 50 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 50, 42, 49, 0, 130, 350, 0, 0},

		// Europa (nivel 50-59)
		{"pos_ata_europa", "Artilheiro Europeu", "Vença 250 batalhas como Atacante", "⚽", "vitorias", "", 250, 50, 59, 0, 170, 500, 0, 0},
		{"pos_def_europa", "Melhor Zagueiro EU", "Vença 250 batalhas como Defensor", "🛡️", "vitorias", "", 250, 50, 59, 0, 170, 500, 0, 0},
		{"pos_med_europa", "Meia de Ouro EU", "Complete 380 trabalhos como Meia", "🎯", "trabalhos", "", 380, 50, 59, 0, 170, 500, 0, 0},
		{"pos_gk_europa", "Goleiro de Ouro EU", "Vença 60 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 60, 50, 59, 0, 170, 500, 0, 0},

		// Liga dos Craques (nivel 60-71)
		{"pos_ata_champions", "Rei da Liga", "Vença 320 batalhas como Atacante", "⚽", "vitorias", "", 320, 60, 71, 0, 220, 700, 0, 0},
		{"pos_def_champions", "Muralha da Liga", "Vença 320 batalhas como Defensor", "🛡️", "vitorias", "", 320, 60, 71, 0, 220, 700, 0, 0},
		{"pos_med_champions", "Craque da Liga", "Complete 480 trabalhos como Meia", "🎯", "trabalhos", "", 480, 60, 71, 0, 220, 700, 0, 0},
		{"pos_gk_champions", "Luva de Ouro", "Vença 75 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 75, 60, 71, 0, 220, 700, 0, 0},

		// Seleçoca (nivel 72-84)
		{"pos_ata_selecao", "Artilheiro da Seleçoca", "Vença 400 batalhas como Atacante", "⚽", "vitorias", "", 400, 72, 84, 0, 280, 1000, 0, 0},
		{"pos_def_selecao", "Capitão da Seleçoca", "Vença 400 batalhas como Defensor", "🛡️", "vitorias", "", 400, 72, 84, 0, 280, 1000, 0, 0},
		{"pos_med_selecao", "Camisa 10 da Seleçoca", "Complete 600 trabalhos como Meia", "🎯", "trabalhos", "", 600, 72, 84, 0, 280, 1000, 0, 0},
		{"pos_gk_selecao", "Santo do Gol", "Vença 90 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 90, 72, 84, 0, 280, 1000, 0, 0},

		// Mundialito (nivel 85-99)
		{"pos_ata_copamund", "Artilheiro do Mundo", "Vença 500 batalhas como Atacante", "⚽", "vitorias", "", 500, 85, 99, 0, 350, 1500, 0, 0},
		{"pos_def_copamund", "Melhor Zagueiro do Mundo", "Vença 500 batalhas como Defensor", "🛡️", "vitorias", "", 500, 85, 99, 0, 350, 1500, 0, 0},
		{"pos_med_copamund", "Craque do Mundo", "Complete 750 trabalhos como Meia", "🎯", "trabalhos", "", 750, 85, 99, 0, 350, 1500, 0, 0},
		{"pos_gk_copamund", "Goleiro do Mundo", "Vença 110 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 110, 85, 99, 0, 350, 1500, 0, 0},

		// Bola de Ouro (nivel 100-119)
		{"pos_ata_ballondor", "Bola de Ouro", "Vença 650 batalhas como Atacante", "⚽", "vitorias", "", 650, 100, 119, 0, 450, 2000, 0, 0},
		{"pos_def_ballondor", "Defensor de Ouro", "Vença 650 batalhas como Defensor", "🛡️", "vitorias", "", 650, 100, 119, 0, 450, 2000, 0, 0},
		{"pos_med_ballondor", "Meia de Ouro", "Complete 950 trabalhos como Meia", "🎯", "trabalhos", "", 950, 100, 119, 0, 450, 2000, 0, 0},
		{"pos_gk_ballondor", "Luva de Diamante", "Vença 130 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 130, 100, 119, 0, 450, 2000, 0, 0},

		// Ídolo (nivel 120-149)
		{"pos_ata_idolo", "Ídolo Eterno", "Vença 800 batalhas como Atacante", "⚽", "vitorias", "", 800, 120, 149, 0, 550, 3000, 0, 0},
		{"pos_def_idolo", "Muralha Eterna", "Vença 800 batalhas como Defensor", "🛡️", "vitorias", "", 800, 120, 149, 0, 550, 3000, 0, 0},
		{"pos_med_idolo", "Maestro Imortal", "Complete 1200 trabalhos como Meia", "🎯", "trabalhos", "", 1200, 120, 149, 0, 550, 3000, 0, 0},
		{"pos_gk_idolo", "Mãos Sagradas", "Vença 160 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 160, 120, 149, 0, 550, 3000, 0, 0},

		// Lenda (nivel 150+)
		{"pos_ata_lenda", "Lenda do Gol", "Vença 1000 batalhas como Atacante", "⚽", "vitorias", "", 1000, 150, 999, 0, 700, 5000, 0, 0},
		{"pos_def_lenda", "Lenda da Defesa", "Vença 1000 batalhas como Defensor", "🛡️", "vitorias", "", 1000, 150, 999, 0, 700, 5000, 0, 0},
		{"pos_med_lenda", "Lenda do Meio", "Complete 1500 trabalhos como Meia", "🎯", "trabalhos", "", 1500, 150, 999, 0, 700, 5000, 0, 0},
		{"pos_gk_lenda", "Lenda do Gol Sagrado", "Vença 200 desafios 1v1 como Goleiro", "🧤", "desafios_1v1", "", 200, 150, 999, 0, 700, 5000, 0, 0},
	}
	for _, q := range questsList {
		Conn.Exec(`INSERT INTO quests (id, nome, descricao, icone, tipo, objetivo, nivel_min, nivel_max,
			recompensa_material, recompensa_quantidade, recompensa_xp, recompensa_dinheiro,
			recompensa_energia, recompensa_item_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
			ON CONFLICT (id) DO UPDATE SET
				nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, objetivo=EXCLUDED.objetivo,
				nivel_min=EXCLUDED.nivel_min, nivel_max=EXCLUDED.nivel_max,
				recompensa_xp=EXCLUDED.recompensa_xp, recompensa_dinheiro=EXCLUDED.recompensa_dinheiro,
				recompensa_energia=EXCLUDED.recompensa_energia, recompensa_item_id=EXCLUDED.recompensa_item_id`,
			q.id, q.nome, q.descricao, q.icone, q.tipo, q.objetivo, q.nivelMin, q.nivelMax,
			q.recompensaMaterial, q.recompensaQuantidade, q.recompensaXP, q.recompensaDinheiro,
			q.recompensaEnergia, q.recompensaItemID)
	}

	// Seed config_progressao
	type configSeed struct {
		chave, descricao string
		valor            float64
	}
	configs := []configSeed{
		{"repeticao_limite", "Repetições por dia sem penalidade", 3},
		{"penalidade_xp", "Fator de XP após penalidade (0.80 = 80%)", 0.80},
		{"penalidade_dinheiro", "Fator de dinheiro após penalidade (0.85 = 85%)", 0.85},
		{"variedade_bonus_3", "Bônus de XP com 3 trabalhos diferentes hoje (0.10 = 10%)", 0.10},
		{"variedade_bonus_4", "Bônus de XP com 4 trabalhos diferentes hoje (0.20 = 20%)", 0.20},
		{"variedade_bonus_5", "Bônus de XP com 5+ trabalhos diferentes hoje (0.30 = 30%)", 0.30},
	}
	for _, c := range configs {
		Conn.Exec(`INSERT INTO config_progressao (chave, valor, descricao) VALUES ($1,$2,$3) ON CONFLICT (chave) DO NOTHING`,
			c.chave, c.valor, c.descricao)
	}

	// Seed missoes
	type missaoSeed struct {
		id                                                                                          string
		fase, ordem                                                                                 int
		nome, descricao, icone, tipo                                                                string
		vezesNecessarias, tempoMinutos, custoEnergia, recompensaXP, recompensaDinheiro, recompensaMoedas, nivelLibera int
		requerMissao, dialogoInicio, dialogoFim                                                     string
	}
	missoes := []missaoSeed{
		// Fase 1 — O Sonho
		{"achar_bola", 1, 1, "Achar a bola", "Uma bola velha perdida na rua... é o começo de tudo.", "⚽", "instant", 1, 0, 0, 5, 0, 0, 0, "",
			"Todo craque começa com um sonho... e uma bola perdida na rua.",
			"Você encontrou! Tá meio murcha, mas serve. Agora é só jogar!"},
		{"pedir_mae", 1, 2, "Pedir pra mãe jogar na rua", "Convencer a mãe que já pode sair.", "🏠", "timer", 1, 5, 0, 5, 0, 0, 0, "achar_bola",
			"Mãe, posso ir jogar bola na rua?",
			"Mãe: 'Só depois do meio-dia!' — Mas a ansiedade é grande..."},
		{"chutar_gol", 1, 3, "Chutar no gol", "Seu primeiro chute. O começo da lenda.", "🥅", "instant", 1, 0, 0, 15, 0, 1, 2, "pedir_mae",
			"A rua é o seu primeiro estádio. A parede é o goleiro.",
			"GOOOL! A vizinhança inteira ouviu! Você nasceu pra isso! 🎉"},

		// Fase 2 — O Campinho (Level 2)
		{"montar_traves", 2, 1, "Montar traves de madeira", "Construir as traves do seu campinho.", "🪵", "timer", 1, 5, 0, 10, 0, 0, 0, "chutar_gol",
			"Todo campinho precisa de traves. Hora de construir as suas!",
			"Ficou torta, mas tá valendo! Agora é oficial: você tem um campinho!"},
		{"marcar_campo", 2, 2, "Marcar o campo com gesso", "Fazer as linhas do campo com pó de gesso.", "⬜", "instant", 1, 0, 0, 10, 0, 0, 0, "montar_traves",
			"Um campo de verdade precisa de linhas. Bora desenhar!",
			"Olha que campo bonito! Parece profissional... quase. 😄"},
		{"chamar_amigo", 2, 3, "Chamar um amigo pra jogar", "Convide alguém para uma pelada.", "🤝", "instant", 1, 0, 0, 15, 0, 1, 3, "marcar_campo",
			"Futebol sozinho não tem graça. Hora de chamar reforço!",
			"Seu amigo topou na hora! O campinho agora tem 2 craques! ⚽"},

		// Fase 3 — O Estádio (Level 3)
		{"vender_hotdog", 3, 1, "Vender Hotdog no estádio", "Ganhe dinheiro vendendo dogão!", "🌭", "repetivel", 10, 0, 2, 5, 50, 0, 0, "chamar_amigo",
			"Dia de jogo no estádio! Hora de faturar vendendo hotdog!",
			"10 hotdogs vendidos! Você já é o rei do dogão! 🌭👑"},
		{"ajudar_carros", 3, 2, "Ajudar carros a estacionar", "Guie os motoristas perto do estádio.", "🚗", "repetivel", 15, 0, 3, 4, 30, 0, 0, "chamar_amigo",
			"A rua tá cheia de carro. Bora ganhar uns trocados!",
			"Missão cumprida! Os motoristas agradecem e seu bolso também! 💰"},
		{"ajudar_idosos", 3, 3, "Ajudar idosos atravessar a avenida", "Ajude o pessoal a cruzar a avenida do estádio.", "👴", "repetivel", 15, 0, 4, 7, 40, 0, 0, "chamar_amigo",
			"A avenida é perigosa. Hora de mostrar que craque também tem coração!",
			"Todos seguros! Você ganhou fama no bairro como gente boa! ❤️"},
	}
	for _, ms := range missoes {
		Conn.Exec(`INSERT INTO missoes
			(id, fase, ordem, nome, descricao, icone, tipo, vezes_necessarias, tempo_minutos,
			 custo_energia, recompensa_xp, recompensa_dinheiro, recompensa_moedas, nivel_libera,
			 requer_missao, dialogo_inicio, dialogo_fim)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
			ON CONFLICT (id) DO NOTHING`,
			ms.id, ms.fase, ms.ordem, ms.nome, ms.descricao, ms.icone, ms.tipo,
			ms.vezesNecessarias, ms.tempoMinutos, ms.custoEnergia, ms.recompensaXP,
			ms.recompensaDinheiro, ms.recompensaMoedas, ms.nivelLibera,
			ms.requerMissao, ms.dialogoInicio, ms.dialogoFim)
	}

	// ========================
	// LOGIN STREAK
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS login_streak (
		jogador_id INT PRIMARY KEY REFERENCES jogadores(id),
		dias_seguidos INT DEFAULT 0,
		ultimo_login DATE,
		total_dias INT DEFAULT 0
	)`)

	// ========================
	// SKILL MISSIONS
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS skill_missions (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		tipo VARCHAR(50) NOT NULL,
		alvo INT NOT NULL,
		recompensa_xp INT DEFAULT 0,
		recompensa_moedas INT DEFAULT 0,
		ativo BOOLEAN DEFAULT TRUE
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS skill_progress (
		jogador_id INT REFERENCES jogadores(id),
		mission_id VARCHAR(50) NOT NULL,
		progresso INT DEFAULT 0,
		completada BOOLEAN DEFAULT FALSE,
		PRIMARY KEY (jogador_id, mission_id)
	)`)

	// Seed skill missions
	type skillMission struct {
		id, nome, descricao, icone, tipo string
		alvo, recompensaXP, recompensaMoedas int
		ativo bool
	}
	skillMissions := []skillMission{
		{"sm_combo3", "Combo Triplo", "Faça um combo x3 no MiniGame", "🔥", "COMBO_MATCH3", 3, 30, 1, true},
		{"sm_combo5", "Combo Devastador", "Faça um combo x5 no MiniGame", "💥", "COMBO_MATCH3", 5, 80, 2, true},
		{"sm_combo8", "Combo Lendário", "Faça um combo x8 no MiniGame", "🌟", "COMBO_MATCH3", 8, 200, 5, true},
		{"sm_penalti3", "Cobrador Certeiro", "Acerte 3/5 pênaltis em um desafio", "⚽", "PENALTI_ACERTOS", 3, 30, 1, true},
		{"sm_penalti4", "Cobrador Implacável", "Acerte 4/5 pênaltis", "🎯", "PENALTI_ACERTOS", 4, 80, 2, true},
		{"sm_penalti5", "Cobrador Perfeito", "Acerte 5/5 pênaltis", "👑", "PENALTI_ACERTOS", 5, 200, 5, true},
		{"sm_pvp3", "Imbatível", "Vença 3 combates seguidos", "⚔️", "VITORIA_PVP_STREAK", 3, 50, 1, true},
		{"sm_pvp5", "Invencível", "Vença 5 combates seguidos", "🔥", "VITORIA_PVP_STREAK", 5, 150, 3, true},
		{"sm_pvp10", "Deus do Estádio", "Vença 10 combates seguidos", "👑", "VITORIA_PVP_STREAK", 10, 500, 10, true},
		{"sm_score500", "Pontuador", "Faça 500+ pontos no MiniGame", "🎮", "SCORE_MATCH3", 500, 20, 1, true},
		{"sm_score1000", "Mestre do Match", "Faça 1000+ pontos no MiniGame", "💎", "SCORE_MATCH3", 1000, 60, 2, true},
		{"sm_score2000", "Rei do Match", "Faça 2000+ pontos no MiniGame", "🏆", "SCORE_MATCH3", 2000, 150, 5, true},
	}
	for _, sm := range skillMissions {
		Conn.Exec(`INSERT INTO skill_missions (id, nome, descricao, icone, tipo, alvo, recompensa_xp, recompensa_moedas, ativo)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			ON CONFLICT (id) DO NOTHING`,
			sm.id, sm.nome, sm.descricao, sm.icone, sm.tipo, sm.alvo, sm.recompensaXP, sm.recompensaMoedas, sm.ativo)
	}

	// ========================
	// WEEKLY RANKING
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS weekly_ranking (
		jogador_id INT REFERENCES jogadores(id),
		semana VARCHAR(10) NOT NULL,
		xp_ganho INT DEFAULT 0,
		vitorias_pvp INT DEFAULT 0,
		score_match3 INT DEFAULT 0,
		PRIMARY KEY (jogador_id, semana)
	)`)

	// Migração: pvp_streak em jogadores
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS pvp_streak INT DEFAULT 0`)
	Conn.Exec(`ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS ultima_coleta_patrocinio TIMESTAMP DEFAULT NOW()`)

	// ========================
	// FAMA — atividade diária (para decaimento)
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS fama_atividade (
		jogador_id INT REFERENCES jogadores(id),
		data DATE NOT NULL,
		fez_pvp BOOLEAN DEFAULT FALSE,
		logou BOOLEAN DEFAULT FALSE,
		PRIMARY KEY (jogador_id, data)
	)`)

	// ========================
	// CASAS (passive progression)
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS casas (
		jogador_id INT PRIMARY KEY REFERENCES jogadores(id),
		tipo VARCHAR(20) DEFAULT '',
		ultima_coleta TIMESTAMP DEFAULT NOW()
	)`)

	// ========================
	// EVENTOS TEMPORÁRIOS
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS eventos (
		id SERIAL PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		tipo VARCHAR(50) NOT NULL,
		multiplicador FLOAT DEFAULT 1.0,
		inicio TIMESTAMP NOT NULL,
		fim TIMESTAMP NOT NULL,
		ativo BOOLEAN DEFAULT TRUE
	)`)

	// Limpa eventos expirados
	Conn.Exec(`DELETE FROM eventos WHERE fim < NOW()`)

	// ========================
	// BOLETOS (contas periódicas a cada 2 dias reais)
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS boletos (
		jogador_id INT PRIMARY KEY REFERENCES jogadores(id),
		ultimo_boleto TIMESTAMP DEFAULT NOW(),
		boletos_pagos INT DEFAULT 0
	)`)
	// ========================
	// CDB (investimento bancário)
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS cdb_investimentos (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		valor INT NOT NULL,
		criado_em TIMESTAMP DEFAULT NOW(),
		resgatado BOOLEAN DEFAULT FALSE,
		resgatado_em TIMESTAMP
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS boletos_historico (
		id SERIAL PRIMARY KEY,
		jogador_id INT REFERENCES jogadores(id),
		valor_base INT DEFAULT 0,
		juros INT DEFAULT 0,
		valor_total INT DEFAULT 0,
		dias_atraso INT DEFAULT 0,
		pago_em TIMESTAMP DEFAULT NOW()
	)`)

	// ========================
	// MISSÕES COMBINADAS
	// ========================
	Conn.Exec(`CREATE TABLE IF NOT EXISTS combined_missions (
		id VARCHAR(50) PRIMARY KEY,
		nome VARCHAR(200) NOT NULL,
		descricao TEXT DEFAULT '',
		icone VARCHAR(20) DEFAULT '',
		objetivo1_tipo VARCHAR(50) NOT NULL,
		objetivo1_alvo INT NOT NULL,
		objetivo2_tipo VARCHAR(50) NOT NULL,
		objetivo2_alvo INT NOT NULL,
		objetivo3_tipo VARCHAR(50) DEFAULT '',
		objetivo3_alvo INT DEFAULT 0,
		recompensa_xp INT DEFAULT 0,
		recompensa_dinheiro INT DEFAULT 0,
		recompensa_moedas INT DEFAULT 0,
		ativo BOOLEAN DEFAULT TRUE
	)`)

	Conn.Exec(`CREATE TABLE IF NOT EXISTS combined_progress (
		jogador_id INT REFERENCES jogadores(id),
		mission_id VARCHAR(50) NOT NULL,
		obj1_progresso INT DEFAULT 0,
		obj2_progresso INT DEFAULT 0,
		obj3_progresso INT DEFAULT 0,
		completada BOOLEAN DEFAULT FALSE,
		data DATE DEFAULT CURRENT_DATE,
		PRIMARY KEY (jogador_id, mission_id, data)
	)`)

	// Seed combined missions
	type cmSeed struct {
		id, nome, desc, icone, t1 string
		a1                        int
		t2                        string
		a2                        int
		t3                        string
		a3, xp, din, moedas       int
	}
	combinedMissions := []cmSeed{
		{"cm_pvp_match", "Guerreiro Completo", "Vença 1 PvP + Jogue 1 MiniGame", "⚔️", "PVP_WIN", 1, "MINIGAME_PLAY", 1, "", 0, 100, 200, 1},
		{"cm_trabalho_pvp", "Dia Produtivo", "Complete 3 trabalhos + Vença 1 PvP", "💼", "TRABALHO", 3, "PVP_WIN", 1, "", 0, 80, 150, 0},
		{"cm_penalti_trabalho", "Artilheiro Dedicado", "Acerte 3 pênaltis + Complete 2 trabalhos", "🎯", "PENALTI_GOL", 3, "TRABALHO", 2, "", 0, 120, 100, 1},
		{"cm_full", "Craque do Dia", "1 PvP + 1 MiniGame + 2 Trabalhos", "🏆", "PVP_WIN", 1, "MINIGAME_PLAY", 1, "TRABALHO", 2, 200, 300, 2},
		{"cm_casa_pvp", "Estrategista", "Colete casa + Vença 2 PvP", "🏠", "CASA_COLETA", 1, "PVP_WIN", 2, "", 0, 150, 250, 1},
	}
	for _, cm := range combinedMissions {
		Conn.Exec(`INSERT INTO combined_missions (id, nome, descricao, icone, objetivo1_tipo, objetivo1_alvo, objetivo2_tipo, objetivo2_alvo, objetivo3_tipo, objetivo3_alvo, recompensa_xp, recompensa_dinheiro, recompensa_moedas)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			ON CONFLICT DO NOTHING`,
			cm.id, cm.nome, cm.desc, cm.icone, cm.t1, cm.a1, cm.t2, cm.a2, cm.t3, cm.a3, cm.xp, cm.din, cm.moedas)
	}
}
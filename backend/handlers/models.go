package handlers

// ========================
// ESTRUTURAS DE DADOS
// ========================

type Item struct {
	ID               int    `json:"id"`
	Nome             string `json:"nome"`
	Descricao        string `json:"descricao"`
	Preco            int    `json:"preco"`
	Tipo             string `json:"tipo"` // consumivel, equipamento, mochila
	Icone            string `json:"icone"`
	Raridade         string `json:"raridade"` // comum, raro, epico, lendario
	NivelMin         int    `json:"nivel_min"`
	NivelMax         int    `json:"nivel_max"` // 0 = sem limite
	BonusForca       int    `json:"bonus_forca"`
	BonusVelocidade  int    `json:"bonus_velocidade"`
	BonusHabilidade  int    `json:"bonus_habilidade"`
	BonusSaudeMax    int    `json:"bonus_saude_max"`
	BonusEnergiaMax  int    `json:"bonus_energia_max"`
	BonusVitMax      int    `json:"bonus_vit_max"`
	RecuperaEnergia  int    `json:"recupera_energia"`
	RecuperaSaude    int    `json:"recupera_saude"`
	SlotsMochila     int    `json:"slots_mochila"` // apenas para tipo "mochila"
	CooldownMinutos  int    `json:"cooldown_minutos"`
}

type Trabalho struct {
	ID           string `json:"id"`
	Nome         string `json:"nome"`
	Tier         string `json:"tier"`
	NivelMin     int    `json:"nivel_min"`
	Energia      int    `json:"energia"`
	GanhoMin     int    `json:"ganho_min"`
	GanhoMax     int    `json:"ganho_max"`
	GanhoXP      int    `json:"ganho_xp"`
	RequereItem  int    `json:"requer_item"`
	Icone        string `json:"icone"`
	LimiteDiario int    `json:"limite_diario"`
}

type JogadorData struct {
	ID                         int    `json:"id"`
	Nome                       string `json:"nome"`
	Nivel                      int    `json:"nivel"`
	XP                         int    `json:"xp"`
	XPProximo                  int    `json:"xp_proximo"`
	Energia                    int    `json:"energia"`
	EnergiaMax                 int    `json:"energia_max"`
	Vitalidade                 int    `json:"vitalidade"`
	VitalidadeMax              int    `json:"vitalidade_max"`
	Saude                      int    `json:"saude"`
	SaudeMax                   int    `json:"saude_max"`
	Forca                      int    `json:"forca"`
	Velocidade                 int    `json:"velocidade"`
	Habilidade                 int    `json:"habilidade"`
	DinheiroMao                int    `json:"dinheiro_mao"`
	DinheiroBanco              int    `json:"dinheiro_banco"`
	PontosFama                 int    `json:"pontos_fama"`
	Vitorias                   int    `json:"vitorias"`
	Derrotas                   int    `json:"derrotas"`
	Avatar                     int    `json:"avatar"`
	CapacidadeMochila          int    `json:"capacidade_mochila"`
	Moedas                     int    `json:"moedas"`
	CooldownPremium            bool   `json:"cooldown_premium"`
	Titulo                     string `json:"titulo"`
	AvataresPremium            string `json:"avatares_premium"`
	ItensFama                  string `json:"itens_fama"`
	TutorialStep               int    `json:"tutorial_step"`
	CodigoAmigo                string `json:"codigo_amigo"`
	InventarioPublico          bool   `json:"inventario_publico"`
	Posicao                    string `json:"posicao"`
	Titulos                    string `json:"titulos"`
	Rank                       string `json:"rank"`
	PvpStreak                  int    `json:"pvp_streak"`
	ProximaEnergiaEm           int64  `json:"proxima_energia_em"`
	ProximaVitalidadeEm        int64  `json:"proxima_vitalidade_em"`
	ProximaSaudeEm             int64  `json:"proxima_saude_em"`
	ProximoConsumivelEm        int64  `json:"proximo_consumivel_em"`
	ProximoEnergiaConsumivelEm int64  `json:"proximo_energia_consumivel_em"`
}

type InventarioItem struct {
	ItemID     int   `json:"item_id"`
	Quantidade int   `json:"quantidade"`
	Equipado   bool  `json:"equipado"`
	Item       *Item `json:"item"`
	ProximoEm  int64 `json:"proximo_em"`
}

type Amizade struct {
	ID        int    `json:"id"`
	JogadorID int    `json:"jogador_id"`
	AmigoID   int    `json:"amigo_id"`
	Status    string `json:"status"` // pendente, aceita
	Nome      string `json:"nome"`
	Nivel     int    `json:"nivel"`
	Avatar    int    `json:"avatar"`
	Rank      string `json:"rank"`
}

type PerfilPublico struct {
	ID                  int              `json:"id"`
	Nome                string           `json:"nome"`
	Nivel               int              `json:"nivel"`
	Rank                string           `json:"rank"`
	Avatar              int              `json:"avatar"`
	PontosFama          int              `json:"pontos_fama"`
	Vitorias            int              `json:"vitorias"`
	Derrotas            int              `json:"derrotas"`
	Forca               int              `json:"forca"`
	Velocidade          int              `json:"velocidade"`
	Habilidade          int              `json:"habilidade"`
	Titulo              string           `json:"titulo"`
	CodigoAmigo         string           `json:"codigo_amigo"`
	InventarioPublico   bool             `json:"inventario_publico"`
	Inventario          []InventarioItem `json:"inventario,omitempty"`
	EhAmigo             bool             `json:"eh_amigo"`
	SolicitacaoPendente bool             `json:"solicitacao_pendente"`
}

type CombateResult struct {
	Sucesso         bool         `json:"sucesso"`
	VencedorID      int          `json:"vencedor_id"`
	AtacanteID      int          `json:"atacante_id"`
	DefensorID      int          `json:"defensor_id"`
	DinheiroRoubado int          `json:"dinheiro_roubado"`
	PoderAtacante   int          `json:"poder_atacante"`
	PoderDefensor   int          `json:"poder_defensor"`
	Mensagem        string       `json:"mensagem"`
	Jogador         *JogadorData `json:"jogador"`
}

type TrabalharResponse struct {
	Sucesso               bool         `json:"sucesso"`
	Mensagem              string       `json:"mensagem"`
	Ganhou                int          `json:"ganhou"`
	GanhouXP              int          `json:"ganhou_xp"`
	LevelUp               bool         `json:"level_up"`
	NovoNivel             int          `json:"novo_nivel"`
	Jogador               *JogadorData `json:"jogador"`
	BonusMaestria         int          `json:"bonus_maestria"`
	BonusTier             string       `json:"bonus_tier"`
	BonusVariedadeXP      int          `json:"bonus_variedade_xp"`
	VezesHoje             int          `json:"vezes_hoje"`
	DiferentesHoje        int          `json:"diferentes_hoje"`
	BloqueadoLimite       bool         `json:"bloqueado_limite"`
	FaltaItem             *Item        `json:"falta_item,omitempty"`
}

type ConfigProgressao struct {
	VariedadeBonus3    float64 `json:"variedade_bonus_3"`
	VariedadeBonus4    float64 `json:"variedade_bonus_4"`
	VariedadeBonus5    float64 `json:"variedade_bonus_5"`
}

type ProgressaoHoje struct {
	TrabalhosHoje     map[string]int   `json:"trabalhos_hoje"`
	DiferentesHoje    int              `json:"diferentes_hoje"`
	DiferentesPorTier map[string]int   `json:"diferentes_por_tier"`
	Config            ConfigProgressao `json:"config"`
	BloqueadosHoje    []string         `json:"bloqueados_hoje"`
}

// ========================
// CATÁLOGO DE ITENS
// ========================

// ========================
// CATÁLOGO PREMIUM
// ========================

type ItemPremium struct {
	ID           int    `json:"id"`
	Nome         string `json:"nome"`
	Descricao    string `json:"descricao"`
	Preco        int    `json:"preco"` // em moedas
	Tipo         string `json:"tipo"`  // avatar, titulo, mochila_vip, perk_cooldown
	Icone        string `json:"icone"`
	AvatarID     int    `json:"avatar_id"`
	TituloVal    string `json:"titulo_val"`
	MochilaSlots int    `json:"mochila_slots"`
}


type ItemFama struct {
	ID        string `json:"id"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Preco     int    `json:"preco"`
	FamaGanha int    `json:"fama_ganha"`
	Icone     string `json:"icone"`
	Unico     bool   `json:"unico"`
}


type TaskDiaria struct {
	ID                 string `json:"id"`
	Nome               string `json:"nome"`
	Descricao          string `json:"descricao"`
	Tipo               string `json:"tipo"`
	Objetivo           int    `json:"objetivo"`
	RecompensaDinheiro int    `json:"recompensa_dinheiro"`
	RecompensaXP       int    `json:"recompensa_xp"`
	RecompensaFama     int    `json:"recompensa_fama"`
	Dificuldade        string `json:"dificuldade"`
}



// ========================
// AVATARES
// ========================

type AvatarInfo struct {
	ID    int    `json:"id"`
	Icone string `json:"icone"`
	Tipo  string `json:"tipo"` // "comum" ou "premium"
}


type ForumPost struct {
	ID       int    `json:"id"`
	Nome     string `json:"nome"`
	Nivel    int    `json:"nivel"`
	Titulo   string `json:"titulo"`
	Mensagem string `json:"mensagem"`
	Data     string `json:"data"`
}

// ========================
// MISSÕES / HISTÓRIA
// ========================

type Missao struct {
	ID                 string `json:"id"`
	Fase               int    `json:"fase"`
	Ordem              int    `json:"ordem"`
	Nome               string `json:"nome"`
	Descricao          string `json:"descricao"`
	Icone              string `json:"icone"`
	Tipo               string `json:"tipo"`
	VezesNecessarias   int    `json:"vezes_necessarias"`
	TempoMinutos       int    `json:"tempo_minutos"`
	CustoEnergia       int    `json:"custo_energia"`
	RecompensaXP       int    `json:"recompensa_xp"`
	RecompensaDinheiro int    `json:"recompensa_dinheiro"`
	RecompensaMoedas   int    `json:"recompensa_moedas"`
	NivelLibera        int    `json:"nivel_libera"`
	RequerMissao       string `json:"requer_missao"`
	DialogoInicio      string `json:"dialogo_inicio"`
	DialogoFim         string `json:"dialogo_fim"`
}

type ProgressoMissao struct {
	MissaoID    string `json:"missao_id"`
	VezesFeitas int    `json:"vezes_feitas"`
	Completada  bool   `json:"completada"`
	InicioEm    int64  `json:"inicio_em"`
}

type MissaoComProgresso struct {
	Missao
	VezesFeitas int    `json:"vezes_feitas"`
	Completada  bool   `json:"completada"`
	InicioEm    int64  `json:"inicio_em"`
	Status      string `json:"status"`
}

type MissaoResponse struct {
	Sucesso   bool                `json:"sucesso"`
	Mensagem  string              `json:"mensagem"`
	Missao    *MissaoComProgresso `json:"missao"`
	Jogador   *JogadorData        `json:"jogador"`
	LevelUp   bool                `json:"level_up"`
	NovoNivel int                 `json:"novo_nivel"`
	Dialogo   string              `json:"dialogo"`
}

// ========================
// CAMPINHO & QUESTS
// ========================

type CampinhoNivel struct {
	Nivel      int            `json:"nivel"`
	Nome       string         `json:"nome"`
	Descricao  string         `json:"descricao"`
	Arte       string         `json:"arte"`
	BonusXPPct int            `json:"bonus_xp_pct"`
	Materiais  map[string]int `json:"materiais"`
}

type CampinhoJogador struct {
	Nivel        int            `json:"nivel"`
	UltimoBonus  string         `json:"ultimo_bonus"`
	NivelInfo    *CampinhoNivel `json:"nivel_info"`
	ProximoNivel *CampinhoNivel `json:"proximo_nivel"`
	BonusHoje    bool           `json:"bonus_hoje"`
	BonusXP      int            `json:"bonus_xp"`
}

type Quest struct {
	ID                   string `json:"id"`
	Nome                 string `json:"nome"`
	Descricao            string `json:"descricao"`
	Icone                string `json:"icone"`
	Tipo                 string `json:"tipo"`
	Objetivo             int    `json:"objetivo"`
	NivelMin             int    `json:"nivel_min"`
	NivelMax             int    `json:"nivel_max"`
	RecompensaMaterial   string `json:"recompensa_material"`
	RecompensaQuantidade int    `json:"recompensa_quantidade"`
	RecompensaXP         int    `json:"recompensa_xp"`
	RecompensaDinheiro   int    `json:"recompensa_dinheiro"`
	RecompensaEnergia    int    `json:"recompensa_energia"`
	RecompensaItemID     int    `json:"recompensa_item_id"`
	Progresso            int    `json:"progresso"`
	Completada           bool   `json:"completada"`
}

// ========================
// DESAFIO 1v1
// ========================

type Desafio1v1 struct {
	ID                int    `json:"id"`
	DesafianteID      int    `json:"desafiante_id"`
	DesafiadoID       int    `json:"desafiado_id"`
	GolsDesafiante    int    `json:"gols_desafiante"`
	GolsDesafiado     int    `json:"gols_desafiado"`
	ChutesDesafiante  string `json:"chutes_desafiante"`
	DefesasDesafiante string `json:"defesas_desafiante"`
	ChutesDesafiado   string `json:"chutes_desafiado"`
	DefesasDesafiado  string `json:"defesas_desafiado"`
	VencedorID        int    `json:"vencedor_id"`
	Status            string `json:"status"`
	Data              string `json:"data"`
	NomeDesafiante    string `json:"nome_desafiante"`
	NomeDesafiado     string `json:"nome_desafiado"`
}

type Desafio1v1Response struct {
	Sucesso  bool         `json:"sucesso"`
	Mensagem string       `json:"mensagem"`
	Desafio  *Desafio1v1  `json:"desafio"`
	Jogador  *JogadorData `json:"jogador"`
	LevelUp  bool         `json:"level_up"`
	NovoNivel int         `json:"novo_nivel"`
}

// ========================
// LOGIN STREAK
// ========================

type LoginStreak struct {
	DiasSeguidos int              `json:"dias_seguidos"`
	UltimoLogin  string           `json:"ultimo_login"`
	TotalDias    int              `json:"total_dias"`
	Recompensa   *StreakRecompensa `json:"recompensa,omitempty"`
	JaColetou    bool             `json:"ja_coletou"`
}

type StreakRecompensa struct {
	XP      int    `json:"xp"`
	Energia int    `json:"energia"`
	ItemID  int    `json:"item_id,omitempty"`
	Desc    string `json:"desc"`
}

// ========================
// SKILL MISSIONS
// ========================

type SkillMission struct {
	ID              string `json:"id"`
	Nome            string `json:"nome"`
	Descricao       string `json:"descricao"`
	Icone           string `json:"icone"`
	Tipo            string `json:"tipo"`
	Alvo            int    `json:"alvo"`
	RecompensaXP    int    `json:"recompensa_xp"`
	RecompensaMoedas int   `json:"recompensa_moedas"`
	Progresso       int    `json:"progresso"`
	Completada      bool   `json:"completada"`
}

// ========================
// WEEKLY RANKING
// ========================

type WeeklyEntry struct {
	Posicao    int    `json:"posicao"`
	JogadorID  int    `json:"jogador_id"`
	Nome       string `json:"nome"`
	Nivel      int    `json:"nivel"`
	Avatar     int    `json:"avatar"`
	Valor      int    `json:"valor"`
}

// ========================
// CASAS (passive progression)
// ========================

type Casa struct {
	Tipo            string  `json:"tipo"`
	XPDisponivel    int     `json:"xp_disponivel"`
	EnDisponivel    int     `json:"energia_disponivel"`
	HorasAcumuladas float64 `json:"horas_acumuladas"`
	UltimaColeta    int64   `json:"ultima_coleta"`
}

type CasaConfig struct {
	Tipo     string `json:"tipo"`
	Nome     string `json:"nome"`
	Preco    int    `json:"preco"`
	XPHora   int    `json:"xp_hora"`
	EnQuant  int    `json:"energia_quant"`
	EnIntMin int    `json:"energia_intervalo_min"`
}

// ========================
// EVENTOS TEMPORÁRIOS
// ========================

type Evento struct {
	ID            int     `json:"id"`
	Nome          string  `json:"nome"`
	Descricao     string  `json:"descricao"`
	Tipo          string  `json:"tipo"`
	Multiplicador float64 `json:"multiplicador"`
	Inicio        int64   `json:"inicio"`
	Fim           int64   `json:"fim"`
}

// ========================
// MISSÕES COMBINADAS
// ========================

type CombinedMission struct {
	ID             string `json:"id"`
	Nome           string `json:"nome"`
	Descricao      string `json:"descricao"`
	Icone          string `json:"icone"`
	Obj1Tipo       string `json:"objetivo1_tipo"`
	Obj1Alvo       int    `json:"objetivo1_alvo"`
	Obj2Tipo       string `json:"objetivo2_tipo"`
	Obj2Alvo       int    `json:"objetivo2_alvo"`
	Obj3Tipo       string `json:"objetivo3_tipo"`
	Obj3Alvo       int    `json:"objetivo3_alvo"`
	RecompensaXP   int    `json:"recompensa_xp"`
	RecompensaDin  int    `json:"recompensa_dinheiro"`
	RecompensaMoed int    `json:"recompensa_moedas"`
	Obj1Progresso  int    `json:"obj1_progresso"`
	Obj2Progresso  int    `json:"obj2_progresso"`
	Obj3Progresso  int    `json:"obj3_progresso"`
	Completada     bool   `json:"completada"`
}
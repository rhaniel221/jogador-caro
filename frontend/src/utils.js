export function fmt(v) {
  const n = Number(v || 0)
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const TIER_FATORES_ENERGIA = {
  Garoto: 0.10, Base: 0.15, Amador: 0.22,
  'Série C': 0.28, 'Série B': 0.32, 'Série A': 0.38,
  'Copinha Nacional': 0.42, Continentão: 0.48, Europa: 0.55,
  'Liga dos Craques': 0.62, 'Seleçoca': 0.70, Mundialito: 0.78,
  'Bola de Ouro': 0.82, 'Ídolo': 0.88, Lenda: 0.95,
}

const TIER_BONUS_ENERGIA = {
  Garoto: 0, Base: 10, Amador: 20,
  'Série C': 30, 'Série B': 38, 'Série A': 45,
  'Copinha Nacional': 52, Continentão: 60, Europa: 70,
  'Liga dos Craques': 80, 'Seleçoca': 92, Mundialito: 105,
  'Bola de Ouro': 115, 'Ídolo': 130, Lenda: 150,
}

export function energiaBonusPorTier(tier) {
  return TIER_BONUS_ENERGIA[tier] || 0
}

export function custoEnergiaEscalado(energiaBase, nivel, tier = 'Garoto') {
  const base = Number(energiaBase || 1)
  const lvl = Number(nivel || 1)
  const fatorTier = TIER_FATORES_ENERGIA[tier] || 0.10

  let custo = base + Math.floor(lvl * fatorTier)

  // Ajuste fino para os níveis altos ficarem mais pesados
  if (lvl >= 40) custo += Math.floor((lvl - 40) * 0.12)
  if (lvl >= 70) custo += Math.floor((lvl - 70) * 0.18)
  if (lvl >= 90) custo += Math.floor((lvl - 90) * 0.25)

  // Garantia: trabalhos do tier final no nível 100 gastam no mínimo 80
  if ((tier === 'Estrela' || tier === 'Lenda') && lvl >= 100) {
    custo = Math.max(custo, 80)
  }

  return Math.max(1, Math.round(custo))
}

export function calcularRecompensaTrabalho(trabalho, nivel) {
  if (!trabalho) {
    return {
      ganho_min: 0,
      ganho_max: 0,
      ganho_xp: 0
    }
  }

  const lvl = Number(nivel || 1)

  const ganhoMinBase = Number(trabalho.ganho_min || 0)
  const ganhoMaxBase = Number(trabalho.ganho_max || 0)
  const xpBase = Number(trabalho.ganho_xp || 0)

  // Crescimento suave e equilibrado
  let fatorMin = 1 + (lvl * 0.035)
  let fatorMax = 1 + (lvl * 0.040)
  let bonusXp = Math.floor(lvl * 0.6)

  // Reforço em níveis mais altos
  if (lvl >= 30) {
    fatorMin += 0.08
    fatorMax += 0.10
    bonusXp += 3
  }

  if (lvl >= 60) {
    fatorMin += 0.15
    fatorMax += 0.18
    bonusXp += 6
  }

  if (lvl >= 90) {
    fatorMin += 0.20
    fatorMax += 0.25
    bonusXp += 10
  }

  return {
    ganho_min: Math.round(ganhoMinBase * fatorMin),
    ganho_max: Math.round(ganhoMaxBase * fatorMax),
    ganho_xp: Math.round(xpBase + bonusXp)
  }
}

export function calcNivelMaestria(maestria = 0) {
  const m = Number(maestria || 0)

  let nivel = 1
  let prev = 0
  let next = 10

  if (m >= 10 && m < 25) {
    nivel = 2
    prev = 10
    next = 25
  } else if (m >= 25 && m < 50) {
    nivel = 3
    prev = 25
    next = 50
  } else if (m >= 50 && m < 100) {
    nivel = 4
    prev = 50
    next = 100
  } else if (m >= 100 && m < 200) {
    nivel = 5
    prev = 100
    next = 200
  } else if (m >= 200) {
    nivel = 6
    prev = 200
    next = 200
  }

  return { nivel, prev, next }
}

/**
 * Opcional:
 * use isso quando o jogador mudar de classe
 * para recalcular energia máxima no perfil.
 */
export function calcularEnergiaMaxima(baseEnergia, tier) {
  const base = Number(baseEnergia || 100)
  return base + energiaBonusPorTier(tier)
}

export function calcularBonusVariedade(diferentesHoje, config = {}) {
  const b3 = config.variedade_bonus_3 ?? 0.10
  const b4 = config.variedade_bonus_4 ?? 0.20
  const b5 = config.variedade_bonus_5 ?? 0.30
  if (diferentesHoje >= 5) return b5
  if (diferentesHoje >= 4) return b4
  if (diferentesHoje >= 3) return b3
  return 0
}

export function getRankByLevel(nivel) {
  if (nivel >= 150) return 'Deus do Futebol'
  if (nivel >= 100) return 'Imortal'
  if (nivel >= 75)  return 'Lenda'
  if (nivel >= 60)  return 'Ídolo Nacional'
  if (nivel >= 45)  return 'Estrela'
  if (nivel >= 35)  return 'Craque'
  if (nivel >= 25)  return 'Profissional'
  if (nivel >= 18)  return 'Semi-Pro'
  if (nivel >= 12)  return 'Revelação'
  if (nivel >= 8)   return 'Promessa'
  if (nivel >= 5)   return 'Talento do Bairro'
  if (nivel >= 3)   return 'Garoto de Rua'
  return 'Peladeiro'
}

export function calcFatorMaestria(maestria) {
  if (maestria < 10) return 1.0
  if (maestria < 25) return 0.85
  if (maestria < 50) return 0.70
  if (maestria < 100) return 0.58
  if (maestria < 200) return 0.48
  return 0.40
}

/**
 * Gera descrição dinâmica de um item (string simples pra compatibilidade).
 */
export function gerarDescricaoItem(item) {
  if (!item) return ''
  const p = []
  if (item.recupera_energia > 0) p.push(`+${item.recupera_energia} Energia ⚡`)
  if (item.recupera_saude > 0) p.push(`+${item.recupera_saude} Saúde ❤️`)
  if (item.bonus_forca > 0) p.push(`+${item.bonus_forca} Força 💪`)
  if (item.bonus_velocidade > 0) p.push(`+${item.bonus_velocidade} Vel 🏃`)
  if (item.bonus_habilidade > 0) p.push(`+${item.bonus_habilidade} Hab ⚽`)
  if (item.bonus_saude_max > 0) p.push(`+${item.bonus_saude_max} Saúde Máx`)
  if (item.bonus_energia_max > 0) p.push(`+${item.bonus_energia_max} Energia Máx`)
  if (item.bonus_vit_max > 0) p.push(`+${item.bonus_vit_max} Vit Máx`)
  if (item.slots_mochila > 0) p.push(`${item.slots_mochila} slots 🎒`)
  return p.join(' · ')
}

/**
 * Retorna stats do item separados pra exibição visual detalhada.
 */
export function itemStats(item) {
  if (!item) return { efeitos: [], cooldown: 0, nivel: '' }
  const efeitos = []
  if (item.recupera_energia > 0) efeitos.push({ icon: '⚡', label: 'Energia', val: `+${item.recupera_energia}`, cor: '#2980b9' })
  if (item.recupera_saude > 0) efeitos.push({ icon: '❤️', label: 'Saúde', val: `+${item.recupera_saude}`, cor: '#e74c3c' })
  if (item.bonus_forca > 0) efeitos.push({ icon: '💪', label: 'Força', val: `+${item.bonus_forca}`, cor: '#e67e22' })
  if (item.bonus_velocidade > 0) efeitos.push({ icon: '🏃', label: 'Velocidade', val: `+${item.bonus_velocidade}`, cor: '#3498db' })
  if (item.bonus_habilidade > 0) efeitos.push({ icon: '⚽', label: 'Habilidade', val: `+${item.bonus_habilidade}`, cor: '#2ecc71' })
  if (item.bonus_saude_max > 0) efeitos.push({ icon: '❤️', label: 'Saúde Máx', val: `+${item.bonus_saude_max}`, cor: '#c0392b' })
  if (item.bonus_energia_max > 0) efeitos.push({ icon: '⚡', label: 'Energia Máx', val: `+${item.bonus_energia_max}`, cor: '#2471a3' })
  if (item.bonus_vit_max > 0) efeitos.push({ icon: '💚', label: 'Vitalidade Máx', val: `+${item.bonus_vit_max}`, cor: '#27ae60' })
  if (item.slots_mochila > 0) efeitos.push({ icon: '🎒', label: 'Slots', val: `${item.slots_mochila}`, cor: '#8e44ad' })
  let nivel = ''
  if (item.nivel_min > 1 && item.nivel_max > 0) nivel = `Nv.${item.nivel_min}-${item.nivel_max}`
  else if (item.nivel_min > 1) nivel = `Nv.${item.nivel_min}+`
  return { efeitos, cooldown: item.cooldown_minutos || 0, nivel }
}

// Mantém compatibilidade — versão antiga
export function gerarDescricaoItemLegacy(item) {
  if (!item) return ''
  const p = []
  if (item.recupera_energia > 0) p.push(`Recupera ${item.recupera_energia} de Energia ⚡`)
  if (item.recupera_saude > 0) p.push(`Recupera ${item.recupera_saude} de Saúde ❤️`)
  if (item.bonus_forca > 0) p.push(`+${item.bonus_forca} Força 💪`)
  if (item.bonus_velocidade > 0) p.push(`+${item.bonus_velocidade} Velocidade 🏃`)
  if (item.bonus_habilidade > 0) p.push(`+${item.bonus_habilidade} Habilidade ⚽`)
  if (item.bonus_saude_max > 0) p.push(`+${item.bonus_saude_max} Saúde Máx ❤️`)
  if (item.bonus_energia_max > 0) p.push(`+${item.bonus_energia_max} Energia Máx ⚡`)
  if (item.bonus_vit_max > 0) p.push(`+${item.bonus_vit_max} Vitalidade Máx 💚`)
  if (item.slots_mochila > 0) p.push(`Capacidade: ${item.slots_mochila} slots 🎒`)
  if (item.cooldown_minutos > 0) p.push(`Cooldown: ${item.cooldown_minutos} min ⏱️`)
  if (item.nivel_min > 1 && item.nivel_max > 0) {
    partes.push(`Nível ${item.nivel_min}-${item.nivel_max}`)
  } else if (item.nivel_min > 1) {
    partes.push(`Nível mín: ${item.nivel_min}`)
  }

  return partes.join(' · ')
}
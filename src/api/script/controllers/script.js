'use strict';

/**
 * A set of functions called "actions" for `script`
 */

module.exports = {
  prepareFight: async (ctx) => {
    const { id } = ctx.params

    const stage = await strapi.db.query('api::stage.stage').findOne({ where: { id }, populate: { opponents: { populate: { opponent: true }}, reward: { populate: { items: true }}}})

    // Prepare opponents
    const opponents_id_array = []
    stage.opponents.forEach((x) => {
      for (let i = 0; i < x.quantity; i++) {
        opponents_id_array.push(x.opponent.id)
      }
    })
    const opponents_request = await strapi.db.query('api::opponent.opponent').findMany({ where: { id: opponents_id_array }, populate: true })
    const opponents = []
    for (const id of opponents_id_array) {
      opponents_request.forEach((x) => id === x.id ? opponents.push({ current_heal_point: x.statistics.heal_point, ...x }) : '' )
    }

    // Prepare hero
    const hero = await strapi.db.query('api::hero.hero').findOne({ populate: true })
    hero.current_heal_point = hero.statistics.heal_point

    return { hero, opponents, stage }
  },

  fight: async (ctx) => {
    const data = ctx.request.body

    const { hero, opponents, stage } = data

    const hero_damage = Math.round((hero.statistics.strength * (100 / (100 + opponents[0].statistics.defense))))
    opponents[0].current_heal_point -= Math.round((hero.statistics.strength * (100 / (100 + opponents[0].statistics.defense))))

    const brief = []

    if (opponents[0].current_heal_point <= 0) {
      brief.push({ message: `hero deals ${hero_damage} damage to ${opponents[0].name} and kill it`, color: 'green'})
      opponents.shift()
    } else brief.push({ message: `hero deals ${hero_damage} damage to ${opponents[0].name}`, color: 'yellow'})

    let available_opponents = opponents.filter(x => x.current_heal_point > 0)
    while (available_opponents[0]) {
      const opponent_damage = Math.round((available_opponents[0].statistics.strength * (100 / (100 + hero.statistics.defense))))
      // TODO: add stage opponents_strength notion
      hero.current_heal_point -= Math.round(opponent_damage)
      if (hero.current_heal_point <= 0) {
        brief.push({ message: `${available_opponents[0].name} deals ${opponent_damage} damage to hero and kill it`, color: 'red'})
        available_opponents = []
      } else {
        brief.push({ message: `${available_opponents[0].name} deals ${opponent_damage} damage to hero`, color: 'yellow'})
        available_opponents.shift()
      }
    }
    let reward = {}
    if (hero.current_heal_point > 0 && !opponents.length) {
      reward = await strapi.service('api::script.script').getStageReward(stage, hero)
      console.log('reward.items', reward.items)
      brief.push({ message: `hero gain ${reward.xp} xp, ${reward.money} money${reward.items.length ? ', and drop ' + reward.items : ''}`, color: 'green'})
    }

    return { data, brief, reward }
  }
}

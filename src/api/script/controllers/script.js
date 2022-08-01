'use strict';

/**
 * A set of functions called "actions" for `script`
 */

module.exports = {
  stageFight: async (ctx, next) => {
    try {
      let area_id = parseInt(ctx.params.area)

      const area = await strapi.db.query('api::area.area').findOne({ where: { id: area_id, unlocked: true }, populate: { stages: { populate: { opponents: { populate: { opponent: { populate: { statistics: true }}}}, award: { populate: { items: true }}}}}})

      if (!area) ctx.body = 'area locked or not found'
      else {
        const stage_id = parseInt(ctx.params.stage)
        const stage = area.stages.find(x => x.id === stage_id && x.unlocked === true)

        if (!stage) ctx.body = 'stage locked or not found'
        else {
          const hero = await strapi.db.query('api::hero.hero').findOne({ populate: { statistics: true, resistances: true, weaknesses: true, equipment: true, inventory: true }})

          let hero_damage = 0
          let opponents_damage = 0
          let opponents_total_heal_point = 0

          for (const opponent_group of stage.opponents) {
            hero_damage += (hero.statistics.strength * (100 / (100 + opponent_group.opponent.statistics.defense)))

            const damage = opponent_group.opponent.statistics.strength * stage.opponents_strength
            opponents_damage += (damage * (100 / (100 + hero.statistics.defense))) * opponent_group.quantity
            opponents_total_heal_point += opponent_group.opponent.statistics.heal_point
          }

          if (hero_damage >= opponents_total_heal_point) {
            const dropped_items = []
            for (const item of stage.award.items) {
              const random = Math.floor(Math.random() * 100)
              if (item.drop_rate >= random) {
                dropped_items.push(item.id)
                await strapi.db.query('api::item.item').update({ where: { id: item.id }, data: { inventory_quantity: item.inventory_quantity += 1 }})
              }
            }

            const data = {
              inventory: [ ...hero.inventory.map((item) => item.id), ...dropped_items ],
              collected_xp: hero.collected_xp += stage.award.xp,
              money: hero.money += stage.award.money,
              current_heal_point: Math.round(hero.current_heal_point - opponents_damage) >= 0 ? Math.round(hero.current_heal_point - opponents_damage) : 0,
              level: hero.level
            }

            const { levels } = await strapi.db.query('api::levels-table.levels-table').findOne({ populate: { levels: { populate: { statistics: true }}}})
            const next_level = levels.find(x => x.level === data.level + 1)

            let has_level_up = false
            if (data.collected_xp >= next_level.required_xp) {
              data.collected_xp -= next_level.required_xp
              data.level += 1
              has_level_up = true
            }

            // TODO: promises
            await strapi.db.query('api::hero.hero').update({ where: { id: hero.id }, data })
            await strapi.db.query('api::stage.stage').update({ where: { id: stage_id }, data: { completed: true }})
            if (stage.boss) {
              await strapi.db.query('api::area.area').update({ where: { id: area_id }, data: { completed: true }})
              await strapi.db.query('api::area.area').update({ where: { id: area_id + 1 }, data: { unlocked: true }})
            }
            await strapi.db.query('api::stage.stage').update({ where: { id: stage_id + 1 }, data: { unlocked: true }})

            ctx.body = `Hero wins fight, ${data.current_heal_point} hp left.${ has_level_up ? ` Awesome, Hero rises to level ${data.level} !` : ''}`
          } else ctx.body = 'Opponents wins fight'
        }
      }
    } catch (err) {
      console.log('err', err)
      ctx.body = err
    }
  }
}

'use strict';

/**
 * A set of functions called "actions" for `script`
 */

module.exports = {
  stageFight: async (ctx, next) => {
    try {
      let area_id = parseInt(ctx.params.area)

      const area = await strapi.db.query('api::area.area').findOne({ where: { id: area_id, unlocked: true }, populate: { stages: { populate: { opponents: true, award: { populate: { items: true }}}}}})

      if (!area) ctx.body = 'area locked or not found'
      else {
        const stage_id = parseInt(ctx.params.stage)
        const stage = area.stages.find(x => x.id === stage_id && x.unlocked === true)

        if (!stage) ctx.body = 'stage locked or not found'
        else {
          const hero = await strapi.db.query('api::hero.hero').findOne({ populate: { statistics: true, resistances: true, weaknesses: true, equipment: true, inventory: true }})

          // TODO: fix this to get only stages opponents
          const opponents = await strapi.db.query('api::opponent.opponent').findMany({ id: stage.opponents, populate: { statistics: true, resistances: true, weaknesses: true }})

          let hero_damage = 0
          let opponents_damage = 0
          let opponents_total_heal_point = 0

          for (const opponent of opponents) {
            hero_damage += hero.statistics.strength * (100 / (100 + opponent.statistics.defense))

            const damage = opponent.statistics.strength * stage.opponents_strength
            opponents_damage += damage * (100 / (100 + hero.statistics.defense))
            opponents_total_heal_point += opponent.statistics.heal_point
          }

          if (hero_damage >= opponents_total_heal_point) {
            for (const item of stage.award.items) await strapi.db.query('api::item.item').update({ where: { id: item.id }, data: { inventory_quantity: item.inventory_quantity += 1 }})

            const inventory = [ ...hero.inventory.map((item) => item.id), ...stage.award.items.map((item) => item.id) ]
            const collected_xp = hero.collected_xp += stage.award.xp
            const money = hero.money += stage.award.money

            // TODO: promises
            await strapi.db.query('api::hero.hero').update({ where: { id: hero.id }, data: { money, collected_xp, inventory }})
            await strapi.db.query('api::stage.stage').update({ where: { id: stage_id }, data: { completed: true }})

            if (stage.boss) {
              await strapi.db.query('api::area.area').update({ where: { id: area_id }, data: { completed: true }})
              await strapi.db.query('api::area.area').update({ where: { id: area_id + 1 }, data: { unlocked: true }})
            }

            await strapi.db.query('api::stage.stage').update({ where: { id: stage_id + 1 }, data: { unlocked: true }})

            ctx.body = 'hero wins fight'
          } else ctx.body = 'opponents wins fight'
        }
      }
    } catch (err) {
      console.log('err', err)
      ctx.body = err
    }
  }
}

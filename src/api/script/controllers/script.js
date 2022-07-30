'use strict';

/**
 * A set of functions called "actions" for `script`
 */

module.exports = {
  stageFight: async (ctx, next) => {
    try {
      let area_id = ctx.params.area

      const area = await strapi.db.query('api::area.area').findOne({ where: { id: area_id, unlocked: true }, populate: { stages: { populate: { opponents: true, award: { populate: { items: true } } } } }})

      if (!area) ctx.body = 'area locked or not found'
      else {
        const stage_id = parseInt(ctx.params.stage)
        const stage = area.stages.find(x => x.id === stage_id && x.unlocked === true)

        if (!stage) ctx.body = 'stage locked or not found'
        else {
          const hero = await strapi.db.query('api::hero.hero').findOne({ populate: { properties: { populate: { statistics: true, resistances: true, weaknesses: true }}}})

          const opponents = await strapi.db.query('api::opponent.opponent').findMany({ id: stage.opponents, populate: { properties: { populate: { statistics: true, resistances: true, weaknesses: true }}}})

          let hero_damage = 0
          let opponents_damage = 0
          let opponents_total_heal_point = 0
          for (const opponent of opponents) {
            hero_damage += hero.properties.statistics.strength * (100 / (100 + opponent.properties.statistics.defence))

            const damage = opponent.properties.statistics.strength * stage.opponents_strength
            opponents_damage += damage * (100 / (100 + hero.properties.statistics.defence))
            opponents_total_heal_point += opponent.properties.statistics.max_heal_point
          }

          if (hero_damage >= opponents_total_heal_point) ctx.body = 'hero wins fight'
          else if (opponents_damage >= hero.properties.statistics.max_heal_point) ctx.body = 'opponents wins fight'
          else ctx.body = 'equality'
        }
      }
    } catch (err) {
      console.log('err', err)

      ctx.body = err
    }
  }
};

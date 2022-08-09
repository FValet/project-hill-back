'use strict';

/**
 * script service.
 */

module.exports = () => ({
    async getStageReward(stage) {
        const hero = await strapi.db.query('api::hero.hero').findOne({ populate: { statistics: true, resistances: true, weaknesses: true, equipment: true, inventory: true }})

        // Checks if objects is earned with drop_rate and updates earned objects in database
        const dropped_items = []
        const returned_items = []
        for (const item of stage.reward.items) {
          const random = Math.floor(Math.random() * 100)
          if (item.drop_rate >= random) {
            dropped_items.push(item.id)
            returned_items.push(item.name)
            await strapi.db.query('api::item.item').update({ where: { id: item.id }, data: { inventory_quantity: item.inventory_quantity += 1 }})
          }
        }

        // Prepares rewards for update hero in database
        const data = {
          inventory: [ ...hero.inventory.map((item) => item.id), ...dropped_items ],
          collected_xp: hero.collected_xp += stage.reward.xp,
          money: hero.money += stage.reward.money,
          level: hero.level
        }

        // If collected_xp is >= current_level xp, hero gains a level
        const { levels } = await strapi.db.query('api::levels-table.levels-table').findOne({ populate: { levels: { populate: { statistics: true }}}})
        const next_level = levels.find(x => x.level === data.level)
        let has_level_up = false
        if (data.collected_xp >= next_level.required_xp) {
          data.collected_xp -= next_level.required_xp
          data.level += 1
          has_level_up = true
        }

        // TODO: promises
        await strapi.db.query('api::hero.hero').update({ where: { id: hero.id }, data })
        await strapi.db.query('api::stage.stage').update({ where: { id: stage.id }, data: { completed: true }})
        await strapi.db.query('api::stage.stage').update({ where: { id: stage.id + 1 }, data: { unlocked: true }})
        if (stage.boss) {
          await strapi.db.query('api::area.area').update({ where: { id: area_id }, data: { completed: true }})
          await strapi.db.query('api::area.area').update({ where: { id: area_id + 1 }, data: { unlocked: true }})
        }

        stage.reward.items = returned_items
        stage.reward.has_level_up = has_level_up

        return stage.reward
    }
});

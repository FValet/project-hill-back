module.exports = {
  routes: [
    // prepareFight
    {
      method: 'GET',
      path: '/script/prepare-fight/:id',
      handler: 'script.prepareFight',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/script/fight',
      handler: 'script.fight',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ],
};

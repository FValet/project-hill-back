module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/script/stage-fight/:area/:stage',
      handler: 'script.stageFight',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

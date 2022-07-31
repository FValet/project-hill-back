module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/script/stage-fight/:area/:stage',
      handler: 'script.stageFight',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

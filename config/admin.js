module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'e2cd1017e66cd12cb195eaaf2a6d7979'),
  },
});

export default {
  appName: process.env.WEBSITE_SITE_NAME || '',
  userAssignedClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
  keyVault: {
    uri: process.env.SECRET_KV_URI || '',
    secretKey: {
      username: process.env.SECRET_KEY_USERNAME || '',
      password: process.env.SECRET_KEY_PASSWORD || '',
      apiKey: process.env.SECRET_KEY_APIKEY || '',
    },
  },
  apiKey: {
    rotationThreshold: (process.env.APIKEY_ROTATION_THRESHOLD || 14) as number,
    daysToExpire: (process.env.APIKEY_DAYS_TO_EXPIRE || 300) as number,
  },
  password: {
    rotationThreshold: (process.env.PASSWORD_ROTATION_THRESHOLD || 14) as number,
    daysToExpire: (process.env.PASSWORD_DAYS_TO_EXPIRE || 80) as number,
  },
  dvlaApi: {
    authenticationBaseUri: process.env.DVLA_API_AUTHENTICATION_BASE_URI || '',
  },
};

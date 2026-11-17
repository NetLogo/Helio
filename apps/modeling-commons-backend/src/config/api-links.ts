import env from '#src/config/env.ts';

export function createApiLinks(baseUrl: string) {
  return {
    notificationUnsubscribe: (token: string) => {
      const url = new URL('/api/v1/notification-unsubscribe', baseUrl);
      url.searchParams.set('token', token);
      return url.toString();
    },
  };
}

const apiLinks = createApiLinks(env.auth.url);

export default apiLinks;

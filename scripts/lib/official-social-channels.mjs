import identity from '../../data/llms-identity.json' with { type: 'json' };

// Preserve the existing four-control order; append Instagram. URLs are owned
// exclusively by the approved identity data, not by positional footer arrays.
const platforms = Object.freeze([
  ['linkedin', 'LinkedIn', 'www.linkedin.com', '/company/'],
  ['youtube', 'YouTube', 'www.youtube.com', '/@'],
  ['facebook', 'Facebook', 'www.facebook.com', '/profile.php'],
  ['x', 'X', 'x.com', '/'],
  ['instagram', 'Instagram', 'www.instagram.com', '/'],
]);

export function resolveOfficialSocialChannels(channels) {
  if (!Array.isArray(channels) || channels.length !== platforms.length) {
    throw new Error('Expected exactly five approved corporate social channels.');
  }
  const byPlatform = new Map(channels.map((channel) => [channel.platform, channel]));
  if (byPlatform.size !== platforms.length || new Set(channels.map((channel) => channel.url)).size !== platforms.length) {
    throw new Error('Corporate social platforms and URLs must be unique.');
  }
  return Object.freeze(platforms.map(([key, platform, host, prefix]) => {
    const channel = byPlatform.get(platform);
    if (!channel || channel.ownershipStatus !== 'CONFIRMED_OFFICIAL_ACCOUNT') {
      throw new Error(`${platform}: confirmed corporate ownership is required.`);
    }
    const url = new URL(channel.url);
    if (url.protocol !== 'https:' || url.host !== host || !url.pathname.startsWith(prefix)
        || url.username || url.password || url.hash) {
      throw new Error(`${platform}: unexpected corporate profile URL.`);
    }
    return Object.freeze({ key, platform, url: channel.url });
  }));
}

export const OFFICIAL_SOCIAL_CHANNELS = resolveOfficialSocialChannels(identity.officialSocialChannels);

import { OFFICIAL_SOCIAL_CHANNELS } from './official-social-channels.mjs';

export const COMPANY_IDENTITY = Object.freeze({
  brandName: 'Begapunk',
  legalNameZh: '宁波贝加庞克气动元件有限公司',
  legalNameEn: 'Ningbo Begapunk Pneumatic Components Co., Ltd.',
  alternateNames: Object.freeze([
    'Ningbo Begapunk Pneumatic Components Co., Ltd.',
    'BEGAPUNK',
  ]),
  foundingDate: '2022-04-28',
  uscc: '91330201MABLQR5K7U',
  registrationNumber: '330218000114820',
  organizationCode: 'MABLQR5K-7',
  officialSocialChannels: OFFICIAL_SOCIAL_CHANNELS,
  // Verified third-party marketplace storefronts. They are entity identifiers for the
  // Organization node, not footer social channels.
  marketplaceProfiles: Object.freeze([
    'https://www.made-in-china.com/showroom/5db6f15ec62eb2d2',
  ]),
  brandSocialProfiles: Object.freeze([
    ...OFFICIAL_SOCIAL_CHANNELS.map(({ url }) => url),
    'https://www.made-in-china.com/showroom/5db6f15ec62eb2d2',
  ]),
  // Phase 8 does not authorize changes to the existing LocalBusiness nodes.
  localBusinessSocialProfiles: Object.freeze([
    'https://www.linkedin.com/company/144021127/',
    'https://www.youtube.com/@BEGAPUNKRotaryJointsTV',
    'https://www.facebook.com/profile.php?id=61595481363231',
    'https://x.com/Begapunk728',
  ]),
  person: Object.freeze({
    name: 'GuangCheng Cao',
    idFragment: 'person-g-c-cao',
    jobTitles: Object.freeze({
      en: 'Operations & Engineering Manager',
      de: 'Betriebs- und Engineering-Manager',
      fr: 'Responsable opérations et ingénierie',
      ja: 'オペレーション・エンジニアリング責任者',
      ru: 'Менеджер по операциям и инженерии',
    }),
    sameAs: Object.freeze([
      'https://www.linkedin.com/in/guangcheng-cao/',
    ]),
  }),
  registeredAddress: Object.freeze({
    addressZh: '浙江省宁波市杭州湾新区庵东镇邮电路665号（邮编 315327）',
    addressEn: 'No. 665 Youdian Road, Andong Town, Hangzhou Bay New Area, Ningbo, Zhejiang 315327, China',
    streetAddress: 'No. 665 Youdian Road, Andong Town',
    addressLocality: 'Hangzhou Bay New Area, Ningbo',
    addressRegion: 'Zhejiang',
    postalCode: '315327',
    addressCountry: 'CN',
  }),
  identifiers: Object.freeze([
    Object.freeze({
      '@type': 'PropertyValue',
      propertyID: 'Unified Social Credit Code',
      value: '91330201MABLQR5K7U',
    }),
    Object.freeze({
      '@type': 'PropertyValue',
      propertyID: 'Business Registration Number',
      value: '330218000114820',
    }),
    Object.freeze({
      '@type': 'PropertyValue',
      propertyID: 'Organization Code',
      value: 'MABLQR5K-7',
    }),
  ]),
});

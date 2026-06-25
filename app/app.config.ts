export default defineAppConfig({
  title: 'glsoft.ai',
  email: '104@david888.com',
  github: 'https://github.com/tbdavid2019/sinkurl',
  twitter: 'https://x.com/oobwei',
  telegram: 'https://t.me/a6a7a8a9abc',
  discord: 'https://discord.gg/9BCGcgCWpj',
  blog: 'https://blog.david888.com',
  description: '短網址',
  image: 'https://blog.david888.com/banner.png',
  company: {
    name: '資旅軟體開發有限公司',
    nameEnglish: 'glsoft.ai / 維護者信箱 104@david888.com',
    taxId: '90867427',
    representative: 'HUNG FUNG CHAK',
    address: '臺北市信義區松德路171號9樓之2',
    addressEnglish: '9 F.-2, No. 171, Songde Rd., Xinyi Dist., Taipei City 110030, Taiwan (R.O.C.)',
  },
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})

/**
 * Club shop products — statically scraped from 11teamsports product pages.
 * Prices/availability can change over time; re-scrape and update this file
 * when needed (not a CMS collection by design). Images are downloaded and
 * served locally from /assets/shop to avoid hotlink/bot protection.
 */
export type ShopProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  url: string;
};

export const clubShopUrl =
  'https://www.11teamsports.com/ch-de/clubshop/hnk-kroatien-schwyz/';

export const shopProducts: ShopProduct[] = [
  {
    slug: 'academy-25-trainingsjacke',
    name: 'Nike Academy 25 Trainingsjacke Rot F657',
    price: 'CHF 54.75',
    image: '/assets/shop/academy-25-trainingsjacke.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-academy-25-trainingsjacke-rot-f657-team-21439',
  },
  {
    slug: 'academy-25-drill-top',
    name: 'Nike Academy 25 Drill Top Sweatshirt Rot F657',
    price: 'CHF 54.75',
    image: '/assets/shop/academy-25-drill-top.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-academy-25-drill-top-sweatshirt-rot-f657-team-21431',
  },
  {
    slug: 'park-26-hoody',
    name: 'Nike Park 26 Hoody Rot F657',
    price: 'CHF 52.45',
    image: '/assets/shop/park-26-hoody.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-park-26-hoody-rot-f657-team-26112',
  },
  {
    slug: 'academy-25-trainingshose',
    name: 'Nike Academy 25 Trainingshose Schwarz F010',
    price: 'CHF 32.20',
    image: '/assets/shop/academy-25-trainingshose.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-academy-25-trainingshose-schwarz-f010-10322871',
  },
  {
    slug: 'park-26-kapuzenjacke-damen',
    name: 'Nike Park 26 Kapuzenjacke Damen Rot F657',
    price: 'CHF 55.70',
    image: '/assets/shop/park-26-kapuzenjacke-damen.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-park-26-kapuzenjacke-damen-rot-f657-team-26075',
  },
  {
    slug: 'park-20-fleece-kapuzenjacke-damen',
    name: 'Nike Park 20 Fleece Kapuzenjacke Damen Rot F657',
    price: 'CHF 57.00',
    image: '/assets/shop/park-20-fleece-kapuzenjacke-damen.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-park-20-fleece-kapuzenjacke-damen-rot-f657-team-21496',
  },
  {
    slug: 'academy-team-rucksack',
    name: 'Nike Academy Team Rucksack Rot F657',
    price: 'CHF 31.00',
    image: '/assets/shop/academy-team-rucksack.jpg',
    url: 'https://www.11teamsports.com/ch-de/p/nike-academy-team-rucksack-rot-f657-team-21515',
  },
];

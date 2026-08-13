/**
 * Club shop products — data lives in shop.data.json so the monthly
 * refresh GitHub Action (.github/workflows/refresh-shop.yml) can rewrite
 * prices/images without touching code. Images are downloaded and served
 * locally from /assets/shop to avoid hotlink/bot protection.
 *
 * To refresh manually: run the "Refresh shop data" workflow (Actions tab),
 * or re-run the scraper (scripts/refresh-shop.mjs).
 */
import shopData from './shop.data.json';

export type ShopProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  url: string;
};

export const clubShopUrl: string = shopData.clubShopUrl;
export const shopProducts: ShopProduct[] = shopData.products;

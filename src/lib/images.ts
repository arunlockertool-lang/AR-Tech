import heroStudioImg from '../assets/images/hero_artech_studio_1794739493386.jpg';
import ecommerceImg from '../assets/images/template_ecommerce_preview_1794739492951.jpg';
import agencyBusinessImg from '../assets/images/template_agency_business_1794739493194.jpg';
import restaurantImg from '../assets/images/template_restaurant_food_1794739493436.jpg';
import educationPortfolioImg from '../assets/images/template_education_portfolio_1794739494873.jpg';
import dashboardImg from '../assets/images/template_saas_dashboard_1794739495115.jpg';

export const HERO_STUDIO_IMAGE = heroStudioImg;

export const TEMPLATE_CATEGORY_IMAGES: Record<string, string> = {
  'E-commerce Website': ecommerceImg,
  'Portfolio Website': educationPortfolioImg,
  'Business Website': agencyBusinessImg,
  'Education Website': educationPortfolioImg,
  'Restaurant Website': restaurantImg,
  'Agency Website': agencyBusinessImg,
  'Blog Website': heroStudioImg,
  'Landing Page': agencyBusinessImg,
  'Personal Website': educationPortfolioImg,
  'Dashboard UI': dashboardImg,
};

export function resolveTemplateImage(category: string, imageUrl?: string): string {
  if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('http') || imageUrl.startsWith('/assets'))) {
    return imageUrl;
  }
  if (imageUrl && imageUrl.includes('ecommerce')) return ecommerceImg;
  if (imageUrl && imageUrl.includes('restaurant')) return restaurantImg;
  if (imageUrl && imageUrl.includes('dashboard')) return dashboardImg;
  if (imageUrl && imageUrl.includes('education')) return educationPortfolioImg;
  if (imageUrl && imageUrl.includes('agency')) return agencyBusinessImg;
  if (imageUrl && imageUrl.includes('hero')) return heroStudioImg;
  return TEMPLATE_CATEGORY_IMAGES[category] || agencyBusinessImg;
}

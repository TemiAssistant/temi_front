// src/services/api.js
/**
 * API 클라이언트 - 기존 products.py API 구조에 맞춤
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 에러 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const productAPI = {
  /**
   * 전체 상품 개수 조회
   * GET /api/products/count
   */
  getProductCount: async () => {
    return await apiClient.get('/products/count');
  },

  /**
   * 필터 옵션 조회
   * GET /api/products/filters/options
   * 반환: { brands, categories, sub_categories, skin_types, price_ranges }
   */
  getFilterOptions: async () => {
    return await apiClient.get('/products/filters/options');
  },

  /**
   * 전체 상품 목록 조회
   * GET /api/products
   * @param {number} limit - 조회할 최대 개수
   * @param {number} offset - 시작 위치
   */
  getAllProducts: async (limit = 100, offset = 0) => {
    return await apiClient.get('/products', {
      params: { limit, offset }
    });
  },

  /**
   * 빠른 검색 (상품명, 브랜드)
   * GET /api/products/search/quick
   * @param {string} query - 검색어
   * @param {number} limit - 조회할 최대 개수
   */
  quickSearch: async (query, limit = 100) => {
    return await apiClient.get('/products/search/quick', {
      params: { 
        q: query,  // 주의: 'q' 파라미터 사용
        limit 
      }
    });
  },

  /**
   * 고급 검색 (다중 필터 지원)
   * GET /api/products/search
   * @param {Object} params - 검색 파라미터
   * 예: {
   *   query: "토너",
   *   category: "대_스킨케어",
   *   sub_category: "스킨/토너",
   *   brand: "토리든",
   *   min_price: 10000,
   *   max_price: 30000,
   *   skin_type: "모든 피부",
   *   in_stock: true,
   *   sort_by: "popularity",
   *   page: 1,
   *   page_size: 20
   * }
   */
  searchProducts: async (params) => {
    return await apiClient.get('/products/search', { params });
  },

  /**
   * 카테고리별 상품 조회
   * GET /api/products/category/{category}
   * @param {string} category - 카테고리명
   * @param {number} limit - 조회할 최대 개수
   */
  getProductsByCategory: async (category, limit = 20) => {
    return await apiClient.get(`/products/category/${encodeURIComponent(category)}`, {
      params: { limit }
    });
  },

  /**
   * 브랜드별 상품 조회
   * GET /api/products/brand/{brand}
   * @param {string} brand - 브랜드명
   * @param {number} limit - 조회할 최대 개수
   */
  getProductsByBrand: async (brand, limit = 20) => {
    return await apiClient.get(`/products/brand/${encodeURIComponent(brand)}`, {
      params: { limit }
    });
  },

  /**
   * 인기 상품 조회
   * GET /api/products/recommendations/popular
   * @param {number} limit - 조회할 최대 개수
   */
  getPopularProducts: async (limit = 10) => {
    return await apiClient.get('/products/recommendations/popular', {
      params: { limit }
    });
  },

  /**
   * 상품 추천
   * POST /api/products/recommendations
   * @param {Object} request - 추천 요청
   */
  getRecommendations: async (request) => {
    return await apiClient.post('/products/recommendations', request);
  },

  /**
   * 특정 상품 조회
   * GET /api/products/{product_id}
   * @param {string} productId - 상품 ID
   */
  getProductById: async (productId) => {
    return await apiClient.get(`/products/${productId}`);
  },

  /**
   * 카테고리 목록 조회
   * GET /api/products/categories
   */
  getCategories: async () => {
    return await apiClient.get('/products/categories');
  },

  /**
   * 서브카테고리 목록 조회
   * GET /api/products/sub-categories
   * @param {string} category - 특정 카테고리의 서브카테고리만 조회 (선택)
   */
  getSubCategories: async (category = null) => {
    const params = category ? { category } : {};
    return await apiClient.get('/products/sub-categories', { params });
  },

  /**
   * 브랜드 목록 조회
   * GET /api/products/brands
   */
  getBrands: async () => {
    return await apiClient.get('/products/brands');
  },
};

export default apiClient;
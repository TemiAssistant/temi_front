// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 상품 API
export const productAPI = {
  // 상품 개수 조회
  getProductCount: () => 
    api.get('/api/products/count'),

  // 👇 새로 추가: 필터 옵션 조회
  getFilterOptions: () => 
    api.get('/api/products/filters/options'),

  // 전체 상품 조회
  getAllProducts: (limit) => 
    api.get(`/api/products?limit=${limit || 1000}`),

  // 상품 상세 조회
  getProduct: (productId) => 
    api.get(`/api/products/${productId}`),

  // 빠른 검색
  quickSearch: (query, limit) => 
    api.get(`/api/products/search/quick?q=${encodeURIComponent(query)}&limit=${limit || 100}`),

  // 👇 새로 추가: 필터별 검색
  searchByFilter: (filterType, filterValue, limit) => 
    api.get(`/api/products/search/quick?q=${encodeURIComponent(filterValue)}&limit=${limit || 100}`),

  // 복합 검색
  search: (params) => 
    api.post('/api/products/search', params),

  // 카테고리 목록
  getCategories: () => 
    api.get('/api/products/categories'),

  // 브랜드 목록
  getBrands: () => 
    api.get('/api/products/brands'),

  // 인기 상품
  getPopularProducts: (limit = 10) => 
    api.get(`/api/products/recommendations/popular?limit=${limit}`),
};

export default api;
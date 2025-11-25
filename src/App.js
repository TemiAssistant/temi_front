// src/App.js
/**
 * 올리브영 재고 관리 시스템
 * 기존 products.py API 구조에 맞춰 수정됨
 */
import React, { useState, useEffect } from 'react';
import { productAPI } from './services/api';
import './App.css';

const DEFAULT_FETCH_LIMIT = 150;
const MAX_FETCH_LIMIT = 1000;
const BRAND_CATEGORY_LIMIT = 200;
const MAX_SEARCH_PAGE_SIZE = 100;
const MAX_QUICK_SEARCH_LIMIT = 50;

const normalizeFilterOptions = (filters = {}) => {
  const categories = filters.categories || filters.first_categories || [];
  const subCategories = filters.sub_categories || filters.mid_categories || [];
  const skinTypes = filters.skin_types || filters.spec || [];
  const priceRanges = filters.price_ranges || (
    filters.price_range ? [filters.price_range] : []
  );
  return {
    brands: filters.brands || [],
    categories,
    sub_categories: subCategories,
    skin_types: skinTypes,
    price_ranges: priceRanges
  };
};

function App() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [productCount, setProductCount] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  // 필터 옵션 (API 응답 구조에 맞춤)
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    categories: [],
    sub_categories: [],
    skin_types: [],
    price_ranges: []
  });

  const [activeFilterType, setActiveFilterType] = useState('brands');
  const [showAllFilters, setShowAllFilters] = useState(false);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  // 선택된 필터들
  const [selectedFilters, setSelectedFilters] = useState({
    brands: [],
    categories: [],
    sub_categories: [],
    skin_types: []
  });

  // 가격 범위
  const [priceRange, setPriceRange] = useState({
    min: null,
    max: null
  });

  // 정렬 옵션
  const [sortBy, setSortBy] = useState('popularity');
  const [fetchLimit, setFetchLimit] = useState(DEFAULT_FETCH_LIMIT);

  const calculateFetchLimit = (count) => {
    const base = count && count > 0 ? count : DEFAULT_FETCH_LIMIT;
    return Math.min(Math.max(base, DEFAULT_FETCH_LIMIT), MAX_FETCH_LIMIT);
  };

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      let dynamicLimit = fetchLimit;

      // 상품 개수 조회
      const countResponse = await productAPI.getProductCount();
      if (countResponse.data.success) {
        const { total_count, active_count, inactive_count } = countResponse.data;
        setProductCount({
          total: total_count || 0,
          active: active_count || 0,
          inactive: inactive_count || 0
        });
        const computedLimit = calculateFetchLimit(active_count || total_count);
        dynamicLimit = computedLimit;
        setFetchLimit(computedLimit);
      }

      // 필터 옵션 조회
      const filterResponse = await productAPI.getFilterOptions();
      if (filterResponse.data.success) {
        const normalizedFilters = normalizeFilterOptions(filterResponse.data.filters || {});
        setFilterOptions(normalizedFilters);
        const apiPriceRange = filterResponse.data.filters?.price_range;
        if (apiPriceRange?.min !== undefined && apiPriceRange?.max !== undefined) {
          setPriceRange(prev => ({
            min: prev.min ?? apiPriceRange.min,
            max: prev.max ?? apiPriceRange.max
          }));
        }
      }

      // 전체 상품 조회
      const safeLimit = Math.max(1, dynamicLimit || DEFAULT_FETCH_LIMIT);
      const productsResponse = await productAPI.getAllProducts(safeLimit, 0);
      const productsData = productsResponse.data || [];
      setAllProducts(productsData);
      setTotalItems(productsData.length);
      setProducts(productsData.slice(0, itemsPerPage));
      setCurrentPage(1);

    } catch (err) {
      setError('상품을 불러오는데 실패했습니다. FastAPI 서버가 실행 중인지 확인하세요.');
      console.error('초기화 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const limitToUse = Math.max(1, fetchLimit || DEFAULT_FETCH_LIMIT);
      const response = await productAPI.getAllProducts(limitToUse, 0);
      const productsData = response.data || [];
      
      setAllProducts(productsData);
      setTotalItems(productsData.length);
      setProducts(productsData.slice(0, itemsPerPage));
      setCurrentPage(1);
      setSearchQuery('');
      
      // 필터 초기화
      setSelectedFilters({
        brands: [],
        categories: [],
        sub_categories: [],
        skin_types: []
      });
      setPriceRange({ min: null, max: null });

    } catch (err) {
      setError('상품을 불러오는데 실패했습니다.');
      console.error('API 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const quickLimit = Math.max(
        1,
        Math.min(fetchLimit, MAX_QUICK_SEARCH_LIMIT)
      );
      const response = await productAPI.quickSearch(
        searchQuery,
        quickLimit
      );
      const productsData = response.data || [];
      
      setAllProducts(productsData);
      setTotalItems(productsData.length);
      setProducts(productsData.slice(0, itemsPerPage));
      setCurrentPage(1);

    } catch (err) {
      setError('검색에 실패했습니다.');
      console.error('검색 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  // 단일 필터 빠른 적용 (카테고리, 브랜드 등)
  const fetchFallbackProducts = async (filterType, value) => {
    const fallbackParams = {
      page: 1,
      page_size: Math.max(1, Math.min(fetchLimit, MAX_SEARCH_PAGE_SIZE)),
      sort_by: sortBy
    };

    if (filterType === 'brands') {
      fallbackParams.brand = value;
    } else if (filterType === 'categories') {
      fallbackParams.category = value;
    } else if (filterType === 'sub_categories') {
      fallbackParams.sub_category = value;
    } else if (filterType === 'skin_types') {
      fallbackParams.skin_type = value;
    } else {
      return null;
    }

    try {
      const fallbackResponse = await productAPI.searchProducts(fallbackParams);
      return fallbackResponse.data?.products || fallbackResponse.data || [];
    } catch (fallbackError) {
      console.error('필터 검색 보조 API 에러:', fallbackError);
      return null;
    }
  };

  const handleQuickFilter = async (filterType, value) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      const directFetchLimit = Math.max(1, Math.min(fetchLimit, BRAND_CATEGORY_LIMIT));
      if (filterType === 'brands') {
        response = await productAPI.getProductsByBrand(value, directFetchLimit);
      } else if (filterType === 'categories') {
        response = await productAPI.getProductsByCategory(value, directFetchLimit);
      } else {
        // 일반 검색 API 사용
        const params = {
          [filterType === 'sub_categories' ? 'sub_category' : 
           filterType === 'skin_types' ? 'skin_type' : filterType]: value,
          page_size: Math.max(1, Math.min(fetchLimit, MAX_SEARCH_PAGE_SIZE))
        };
        response = await productAPI.searchProducts(params);
      }

      let productsData = response.data.products || response.data || [];
      if ((!productsData || productsData.length === 0) &&
          ['brands', 'categories', 'sub_categories', 'skin_types'].includes(filterType)) {
        const fallbackData = await fetchFallbackProducts(filterType, value);
        if (Array.isArray(fallbackData)) {
          productsData = fallbackData;
        }
      }
      setAllProducts(productsData);
      setTotalItems(productsData.length);
      setProducts(productsData.slice(0, itemsPerPage));
      setCurrentPage(1);
      setShowAllFilters(false);

    } catch (err) {
      if (err?.response?.status === 404) {
        console.warn('필터 결과 없음:', value);
        setAllProducts([]);
        setProducts([]);
        setTotalItems(0);
        setCurrentPage(1);
        setShowAllFilters(false);
        setError(null);
      } else {
        setError('필터 검색에 실패했습니다.');
        console.error('필터 검색 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // 다중 필터 적용
  const applyMultipleFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      // 선택된 필터가 없으면 전체 상품 로드
      const hasFilters = 
        Object.values(selectedFilters).some(arr => arr.length > 0) ||
        priceRange.min !== null ||
        priceRange.max !== null;

      if (!hasFilters) {
        loadProducts();
        return;
      }

      // API 파라미터 구성
      const params = {
        page: 1,
        page_size: Math.max(1, Math.min(fetchLimit, MAX_SEARCH_PAGE_SIZE)),
        sort_by: sortBy
      };

      // 브랜드 필터 (첫 번째만 사용 - API가 단일 값만 받음)
      if (selectedFilters.brands.length > 0) {
        params.brand = selectedFilters.brands[0];
      }

      // 카테고리 필터
      if (selectedFilters.categories.length > 0) {
        params.category = selectedFilters.categories[0];
      }

      // 서브카테고리 필터
      if (selectedFilters.sub_categories.length > 0) {
        params.sub_category = selectedFilters.sub_categories[0];
      }

      // 피부타입 필터
      if (selectedFilters.skin_types.length > 0) {
        params.skin_type = selectedFilters.skin_types[0];
      }

      // 가격 범위
      if (priceRange.min !== null) {
        params.min_price = priceRange.min;
      }
      if (priceRange.max !== null) {
        params.max_price = priceRange.max;
      }

      const response = await productAPI.searchProducts(params);
      const productsData = response.data.products || [];
      
      setAllProducts(productsData);
      setTotalItems(response.data.total || productsData.length);
      setProducts(productsData.slice(0, itemsPerPage));
      setCurrentPage(1);

    } catch (err) {
      setError('필터 적용에 실패했습니다.');
      console.error('다중 필터 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  // 필터 토글
  const toggleFilter = (filterType, value) => {
    setSelectedFilters(prev => {
      const current = prev[filterType];
      const isSelected = current.includes(value);
      
      return {
        ...prev,
        [filterType]: isSelected 
          ? current.filter(item => item !== value)
          : [...current, value]
      };
    });
  };

  // 특정 필터 타입 초기화
  const clearFilterType = (filterType) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: []
    }));
  };

  // 모든 필터 초기화
  const clearAllFilters = () => {
    setSelectedFilters({
      brands: [],
      categories: [],
      sub_categories: [],
      skin_types: []
    });
    setPriceRange({ min: null, max: null });
    loadProducts();
  };

  const changeFilterType = (type) => {
    setActiveFilterType(type);
  };

  // 현재 필터 옵션 가져오기
  const getCurrentFilterOptions = () => {
    const selected = filterOptions[activeFilterType];
    if (!selected) return [];
    return Array.isArray(selected) ? selected : [];
  };

  // 필터 타입 이름
  const getFilterTypeName = (type = activeFilterType) => {
    const map = {
      brands: '브랜드',
      categories: '카테고리',
      sub_categories: '서브카테고리',
      skin_types: '피부타입'
    };
    return map[type] || type;
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setProducts(allProducts.slice(startIndex, endIndex));
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (startPage === 1) endPage = Math.min(totalPages, 5);
      if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);

      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }

    return pages;
  };

  // 선택된 필터 개수
  const getSelectedFilterCount = () => {
    return Object.values(selectedFilters).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <div className="header-logo">
            <div className="logo-icon">🌿</div>
            <div className="logo-text">
              <h1>OLIVE YOUNG</h1>
              <p>재고 관리 시스템</p>
            </div>
          </div>
          <div className="header-badge">Staff Dashboard</div>
        </div>
      </header>

      <main className="App-main">
        {!loading && !error && productCount.total > 0 && (
          <div className="stats-dashboard">
            <div className="stat-item">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{productCount.total}</div>
                <div className="stat-label">전체 상품</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{productCount.active}</div>
                <div className="stat-label">활성 상품</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">⏸️</div>
              <div className="stat-content">
                <div className="stat-value">{productCount.inactive}</div>
                <div className="stat-label">비활성 상품</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">🔍</div>
              <div className="stat-content">
                <div className="stat-value">{totalItems}</div>
                <div className="stat-label">검색 결과</div>
              </div>
            </div>
          </div>
        )}

        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="상품명, 브랜드를 검색하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="search-button" onClick={handleSearch}>검색</button>
            <button className="reset-button" onClick={loadProducts}>전체보기</button>
          </div>

          {/* 필터 타입 선택 */}
          <div className="filter-type-selector">
            <span className="filter-type-label">필터 기준:</span>
            {['brands', 'categories', 'sub_categories', 'skin_types'].map((key) => (
              <button
                key={key}
                className={`filter-type-btn ${activeFilterType === key ? 'active' : ''}`}
                onClick={() => changeFilterType(key)}
              >
                {getFilterTypeName(key)}
                {selectedFilters[key] && selectedFilters[key].length > 0 && (
                  <span className="filter-count-badge">{selectedFilters[key].length}</span>
                )}
              </button>
            ))}
          </div>

          {/* 정렬 옵션 */}
          <div className="sort-selector">
            <span className="sort-label">정렬:</span>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popularity">인기순</option>
              <option value="price_low">낮은 가격순</option>
              <option value="price_high">높은 가격순</option>
              <option value="recent">최신순</option>
              <option value="discount">할인율순</option>
            </select>
          </div>

          {/* 빠른 검색 태그 */}
          <div className="quick-search-tags">
            <span className="quick-search-label">빠른 검색:</span>
            {getCurrentFilterOptions().slice(0, 10).map(option => (
              <button 
                key={option} 
                className={`quick-tag ${selectedFilters[activeFilterType]?.includes(option) ? 'selected' : ''}`}
                onClick={() => handleQuickFilter(activeFilterType, option)}
              >
                {option}
              </button>
            ))}
            {getCurrentFilterOptions().length > 10 && (
              <button className="more-filters-btn" onClick={() => setShowAllFilters(true)}>
                +{getCurrentFilterOptions().length - 10}개 더보기
              </button>
            )}
          </div>

          {/* 선택된 필터 표시 */}
          {getSelectedFilterCount() > 0 && (
            <div className="selected-filters-section">
              <div className="selected-filters-header">
                <span className="selected-filters-label">
                  선택된 필터 ({getSelectedFilterCount()}개)
                </span>
                <button className="clear-all-btn" onClick={clearAllFilters}>
                  전체 해제
                </button>
              </div>
              <div className="selected-filters-tags">
                {Object.entries(selectedFilters).map(([type, values]) => (
                  values.length > 0 && (
                    <div key={type} className="filter-group">
                      <span className="filter-group-label">{getFilterTypeName(type)}:</span>
                      {values.map(value => (
                        <button 
                          key={value} 
                          className="selected-filter-tag"
                          onClick={() => toggleFilter(type, value)}
                        >
                          {value} ✕
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
              <button className="apply-filters-btn" onClick={applyMultipleFilters}>
                필터 적용하기
              </button>
            </div>
          )}
        </div>

        {/* 필터 모달 */}
        {showAllFilters && (
          <div className="modal-overlay" onClick={() => setShowAllFilters(false)}>
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="filter-modal-header">
                <h3>전체 {getFilterTypeName()} 목록</h3>
                <button className="modal-close-btn" onClick={() => setShowAllFilters(false)}>✕</button>
              </div>
              <div className="filter-modal-content">
                <div className="filter-grid">
                  {getCurrentFilterOptions().map(item => (
                    <button 
                      key={item} 
                      className={`filter-grid-item ${selectedFilters[activeFilterType]?.includes(item) ? 'selected' : ''}`}
                      onClick={() => handleQuickFilter(activeFilterType, item)}
                    >
                      {item}
                      {selectedFilters[activeFilterType]?.includes(item) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-modal-footer">
                총 {getCurrentFilterOptions().length}개의 {getFilterTypeName()}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>상품을 불러오는 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>❌ {error}</p>
            <button onClick={initializeApp}>다시 시도</button>
          </div>
        )}

        {!loading && !error && (
          <div className="products">
            <div className="products-header">
              <h2>전체 상품</h2>
              <div className="products-header-info">
                <span className="product-count">{totalItems}개</span>
                <span className="page-info">
                  {totalItems > 0 && <>페이지 {currentPage} / {totalPages}</>}
                </span>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="empty"><p>검색 결과가 없습니다</p></div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map(product => {
                    const productId = product.product_id || product.goodsNo || product.id;
                    const displayPrice = product.price_cur || product.price || 0;
                    const originalPrice = product.price_org || product.original_price || 0;
                    const discountRate = originalPrice > displayPrice 
                      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
                      : 0;
                    // Normalize stock info since API returns an object { current, threshold, unit_weight }
                    const stockInfo = product.stock;
                    const currentStockValue = (typeof stockInfo === 'object' && stockInfo !== null)
                      ? stockInfo.current
                      : stockInfo;
                    const parsedStockValue = typeof currentStockValue === 'number'
                      ? currentStockValue
                      : parseInt(currentStockValue, 10);
                    const hasValidStock = Number.isFinite(parsedStockValue);
                    const isLowStock = hasValidStock && parsedStockValue <= 10;
                    const stockDisplay = hasValidStock
                      ? parsedStockValue
                      : (currentStockValue ?? '정보 없음');

                    return (
                      <div key={productId} className="product-card">
                        <div className="product-image-wrapper">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="product-image" />
                          ) : (
                            <div className="product-image-placeholder">💄</div>
                          )}
                        </div>
                        <div className="product-content">
                          <div className="product-header">
                            <span className="brand">{product.brand}</span>
                            {discountRate > 0 && <span className="discount">{discountRate}%</span>}
                          </div>
                          <h3 className="product-name">{product.name}</h3>
                          <p className="category">
                            {product.first_category || product.category || '카테고리 없음'}
                            {product.mid_category && ` > ${product.mid_category}`}
                            {product.sub_category && ` > ${product.sub_category}`}
                          </p>
                          <div className="price-section">
                            <span className="price">{displayPrice.toLocaleString()}원</span>
                            {originalPrice > displayPrice && (
                              <span className="original-price">{originalPrice.toLocaleString()}원</span>
                            )}
                          </div>
                          <div className="stock-section">
                            <span className={isLowStock ? 'stock-low' : 'stock-ok'}>
                              📦 재고 {stockDisplay}
                            </span>
                            {product.spec && (
                              <span className="spec-tag">
                                👤 {product.spec}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="pagination-btn" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>⟨⟨</button>
                    <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>⟨</button>
                    {getPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>⟩</button>
                    <button className="pagination-btn" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>⟩⟩</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-logo">🌿 OLIVE YOUNG</div>
          <p className="footer-text">건강한 아름다움을 위한 스마트 재고 관리 시스템</p>
          <div className="footer-tip">💡 Tip: FastAPI 서버(http://localhost:8000)가 실행 중이어야 합니다</div>
        </div>
      </footer>
    </div>
  );
}

export default App;

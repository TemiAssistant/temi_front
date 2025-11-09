// src/App.js - 페이지네이션 추가
import React, { useState, useEffect } from 'react';
import { productAPI } from './services/api';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // 👈 추가: 전체 상품 저장
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [productCount, setProductCount] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    categories: [],
    sub_categories: [],
    tags: []
  });

  const [activeFilterType, setActiveFilterType] = useState('brands');
  const [showAllFilters, setShowAllFilters] = useState(false);

  // 👇 추가: 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 페이지당 10개

  useEffect(() => {
    initializeApp();
  }, []);

  // 👇 추가: 페이지 변경 시 자동 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      const countResponse = await productAPI.getProductCount();
      const { total_count, active_count, inactive_count } = countResponse.data;
      
      setProductCount({
        total: total_count,
        active: active_count,
        inactive: inactive_count
      });

      const filterResponse = await productAPI.getFilterOptions();
      setFilterOptions(filterResponse.data);

      console.log('📊 필터 옵션 로드:', filterResponse.data);

      const productsResponse = await productAPI.getAllProducts(active_count || 1000);
      setAllProducts(productsResponse.data); // 👈 수정: 전체 상품 저장
      
      // 👈 추가: 첫 페이지 상품만 표시
      setProducts(productsResponse.data.slice(0, itemsPerPage));
      setCurrentPage(1);

      console.log(`✅ 상품 ${productsResponse.data.length}개 로드 완료`);

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
      
      const limit = productCount.active > 0 ? productCount.active : 1000;
      const response = await productAPI.getAllProducts(limit);
      
      setAllProducts(response.data); // 👈 수정
      setProducts(response.data.slice(0, itemsPerPage)); // 👈 추가
      setCurrentPage(1); // 👈 추가: 첫 페이지로
      setSearchQuery('');
      
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
      
      const limit = productCount.active > 0 ? productCount.active : 100;
      const response = await productAPI.quickSearch(searchQuery, limit);
      
      setAllProducts(response.data); // 👈 수정
      setProducts(response.data.slice(0, itemsPerPage)); // 👈 추가
      setCurrentPage(1); // 👈 추가
      
    } catch (err) {
      setError('검색에 실패했습니다.');
      console.error('검색 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = async (filterValue) => {
    try {
      setLoading(true);
      setError(null);
      setSearchQuery(filterValue);
      
      const limit = productCount.active > 0 ? productCount.active : 100;
      const response = await productAPI.searchByFilter(activeFilterType, filterValue, limit);
      
      setAllProducts(response.data); // 👈 수정
      setProducts(response.data.slice(0, itemsPerPage)); // 👈 추가
      setCurrentPage(1); // 👈 추가
      
      console.log(`🔍 필터 검색: ${filterValue} (${response.data.length}개 발견)`);
      
      setShowAllFilters(false);
      
    } catch (err) {
      setError('필터 검색에 실패했습니다.');
      console.error('필터 검색 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeFilterType = (type) => {
    setActiveFilterType(type);
  };

  const getCurrentFilterOptions = () => {
    switch (activeFilterType) {
      case 'brands':
        return filterOptions.brands;
      case 'categories':
        return filterOptions.categories;
      case 'sub_categories':
        return filterOptions.sub_categories;
      case 'tags':
        return filterOptions.tags;
      default:
        return [];
    }
  };

  const getFilterTypeName = () => {
    switch (activeFilterType) {
      case 'brands':
        return '브랜드';
      case 'categories':
        return '카테고리';
      case 'sub_categories':
        return '서브카테고리';
      case 'tags':
        return '태그';
      default:
        return '';
    }
  };

  // 👇 추가: 페이지네이션 관련 함수
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setProducts(allProducts.slice(startIndex, endIndex));
  };

  const totalPages = Math.ceil(allProducts.length / itemsPerPage);

  // 👇 추가: 페이지 번호 배열 생성 (최대 5개 표시)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // 전체 페이지가 5개 이하면 모두 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 기준으로 앞뒤 2개씩
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      
      // 시작이 1이면 끝을 5로
      if (startPage === 1) {
        endPage = Math.min(totalPages, 5);
      }
      
      // 끝이 마지막이면 시작을 조정
      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - 4);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
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
          <div className="header-badge">
            Staff Dashboard
          </div>
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
                <div className="stat-value">{allProducts.length}</div> {/* 👈 수정 */}
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
            <button className="search-button" onClick={handleSearch}>
              검색
            </button>
            <button className="reset-button" onClick={loadProducts}>
              전체보기
            </button>
          </div>

          <div className="filter-type-selector">
            <span className="filter-type-label">필터 기준:</span>
            <button 
              className={`filter-type-btn ${activeFilterType === 'brands' ? 'active' : ''}`}
              onClick={() => changeFilterType('brands')}
            >
              브랜드
            </button>
            <button 
              className={`filter-type-btn ${activeFilterType === 'categories' ? 'active' : ''}`}
              onClick={() => changeFilterType('categories')}
            >
              카테고리
            </button>
            <button 
              className={`filter-type-btn ${activeFilterType === 'sub_categories' ? 'active' : ''}`}
              onClick={() => changeFilterType('sub_categories')}
            >
              서브카테고리
            </button>
            <button 
              className={`filter-type-btn ${activeFilterType === 'tags' ? 'active' : ''}`}
              onClick={() => changeFilterType('tags')}
            >
              태그
            </button>
          </div>

          <div className="quick-search-tags">
            <span className="quick-search-label">빠른 검색:</span>
            {getCurrentFilterOptions().slice(0, 10).map(option => (
              <button 
                key={option} 
                className="quick-tag"
                onClick={() => handleFilterClick(option)}
              >
                {option}
              </button>
            ))}
            {getCurrentFilterOptions().length > 10 && (
              <button 
                className="more-filters-btn"
                onClick={() => setShowAllFilters(true)}
              >
                +{getCurrentFilterOptions().length - 10}개 더보기
              </button>
            )}
          </div>
        </div>

        {showAllFilters && (
          <div className="modal-overlay" onClick={() => setShowAllFilters(false)}>
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="filter-modal-header">
                <h3>전체 {getFilterTypeName()} 목록</h3>
                <button 
                  className="modal-close-btn"
                  onClick={() => setShowAllFilters(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="filter-modal-content">
                <div className="filter-grid">
                  {getCurrentFilterOptions().map(option => (
                    <button 
                      key={option}
                      className="filter-grid-item"
                      onClick={() => handleFilterClick(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-modal-footer">
                <div className="filter-count">
                  총 {getCurrentFilterOptions().length}개의 {getFilterTypeName()}
                </div>
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
                <span className="product-count">{allProducts.length}개</span> {/* 👈 수정 */}
                <span className="page-info">
                  {allProducts.length > 0 && (
                    <>페이지 {currentPage} / {totalPages}</>
                  )}
                </span>
              </div>
            </div>
            
            {products.length === 0 ? (
              <div className="empty">
                <p>검색 결과가 없습니다</p>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map(product => (
                    <div key={product.product_id} className="product-card">
                      <div className="product-image-placeholder">
                        💄
                      </div>

                      <div className="product-content">
                        <div className="product-header">
                          <span className="brand">{product.brand}</span>
                          {product.discount_rate > 0 && (
                            <span className="discount">{product.discount_rate}%</span>
                          )}
                        </div>
                        
                        <h3 className="product-name">{product.name}</h3>
                        <p className="category">{product.category}</p>
                        
                        <div className="price-section">
                          <span className="price">
                            {product.price.toLocaleString()}원
                          </span>
                          {product.discount_rate > 0 && (
                            <span className="original-price">
                              {product.original_price.toLocaleString()}원
                            </span>
                          )}
                        </div>
                        
                        <div className="stock-section">
                          <span className={
                            product.stock.current <= product.stock.threshold 
                              ? 'stock-low' 
                              : 'stock-ok'
                          }>
                            📦 재고 {product.stock.current}개
                          </span>
                          <span className="location">📍 {product.location.zone}</span>
                        </div>
                        
                        {product.tags && product.tags.length > 0 && (
                          <div className="tags">
                            {product.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="tag">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 👇 추가: 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      ⟨⟨
                    </button>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ⟨
                    </button>

                    {getPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      ⟩
                    </button>

                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      ⟩⟩
                    </button>
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
          <p className="footer-text">
            건강한 아름다움을 위한 스마트 재고 관리 시스템
          </p>
          <div className="footer-tip">
            💡 Tip: FastAPI 서버(http://localhost:8000)가 실행 중이어야 합니다
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
// 프롬프트 에디터 애플리케이션 클래스
class PromptEditorApp {
    constructor() {
        this.blockManager = new BlockManagerClass();
        this.isInitialized = false;
        this.panelStates = {
            sidebar: false,
            preview: false
        };
    }

    // 애플리케이션 초기화
    init() {
        if (this.isInitialized) return;
        
        window.blockManager = this.blockManager;
        
        if (!this.blockManager.init()) {
            console.error('BlockManager 초기화 실패');
            return;
        }
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.addAnimationStyles();
        this.handleResize();
        
        this.isInitialized = true;
        console.log('프롬프트 에디터가 초기화되었습니다. - 최적화 버전');
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 프리셋 버튼 이벤트
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagName = e.currentTarget.getAttribute('data-tag');
                this.addPresetBlock(tagName);
            });
        });

        this.initPanelSystem();
        this.initInlineBlockAdd();

        // 헤더 버튼 이벤트
        const clearAllBtn = document.getElementById('clearAllBtn');
        const copyBtnHeader = document.getElementById('copyBtnHeader');
        const copyBtnPreview = document.getElementById('copyBtn');
        const addBlockBtn = document.getElementById('addBlockBtn');

        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.blockManager.clearProject());
        if (copyBtnHeader) copyBtnHeader.addEventListener('click', () => this.copyToClipboard());
        if (copyBtnPreview) copyBtnPreview.addEventListener('click', () => this.copyToClipboard());
        if (addBlockBtn) addBlockBtn.addEventListener('click', () => this.showInlineBlockAdd());

        // 윈도우 리사이즈 이벤트
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    // 인라인 블록 추가 시스템 초기화
    initInlineBlockAdd() {
        const inlineAddContainer = document.getElementById('inlineBlockAdd');
        const inlineAddInput = document.getElementById('inlineAddInput');
        const inlineAddConfirm = document.getElementById('inlineAddConfirm');
        const inlineAddCancel = document.getElementById('inlineAddCancel');
        
        if (!inlineAddContainer || !inlineAddInput || !inlineAddConfirm || !inlineAddCancel) return;

        inlineAddConfirm.addEventListener('click', () => this.confirmInlineBlockAdd());
        inlineAddCancel.addEventListener('click', () => this.hideInlineBlockAdd());

        inlineAddInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirmInlineBlockAdd();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hideInlineBlockAdd();
            }
        });

        document.addEventListener('click', (e) => {
            if (!inlineAddContainer.contains(e.target) && 
                !e.target.closest('#addBlockBtn') && 
                inlineAddContainer.style.display === 'block') {
                this.hideInlineBlockAdd();
            }
        });
    }

    // 인라인 블록 추가 필드 표시
    showInlineBlockAdd() {
        const inlineAddContainer = document.getElementById('inlineBlockAdd');
        const inlineAddInput = document.getElementById('inlineAddInput');
        const BLOCK_FOCUS_DELAY = 100;
        
        if (!inlineAddContainer || !inlineAddInput) return;

        inlineAddContainer.style.display = 'block';
        
        setTimeout(() => {
            inlineAddInput.focus();
        }, BLOCK_FOCUS_DELAY);
    }

    // 인라인 블록 추가 확인
    confirmInlineBlockAdd() {
        const inlineAddInput = document.getElementById('inlineAddInput');
        const value = inlineAddInput.value.trim();
        
        if (value) {
            this.blockManager.addBlock(value.toLowerCase());
            inlineAddInput.value = '';
            this.hideInlineBlockAdd();
            showNotification(`"${value}" 블록이 추가되었습니다!`, 'success');
        }
    }

    // 인라인 블록 추가 필드 숨기기
    hideInlineBlockAdd() {
        const inlineAddContainer = document.getElementById('inlineBlockAdd');
        const inlineAddInput = document.getElementById('inlineAddInput');
        
        if (inlineAddContainer) inlineAddContainer.style.display = 'none';
        if (inlineAddInput) {
            inlineAddInput.value = '';
            inlineAddInput.blur();
        }
    }

    // 패널 시스템 초기화
    initPanelSystem() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const floatingPreviewBtn = document.getElementById('floatingPreviewBtn');
        const previewCloseBtn = document.getElementById('previewCloseBtn');
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');
        const previewArea = document.getElementById('previewArea');

        if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => this.togglePanel('sidebar'));
        if (floatingPreviewBtn) floatingPreviewBtn.addEventListener('click', () => this.togglePanel('preview'));
        if (previewCloseBtn) previewCloseBtn.addEventListener('click', () => this.closePanel('preview'));
        if (overlay) overlay.addEventListener('click', () => this.closeAllPanels());

        this.initSwipeGestures(sidebar, previewArea);
    }

    // 패널 토글
    togglePanel(panelType) {
        this.panelStates[panelType] ? this.closePanel(panelType) : this.openPanel(panelType);
    }

    // 패널 열기
    openPanel(panelType) {
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');
        const previewArea = document.getElementById('previewArea');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const floatingPreviewBtn = document.getElementById('floatingPreviewBtn');
        
        Object.keys(this.panelStates).forEach(type => {
            if (type !== panelType && this.panelStates[type]) this.closePanel(type, false);
        });

        this.panelStates[panelType] = true;
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';

        if (panelType === 'sidebar') {
            sidebar.classList.add('panel-open');
            hamburgerBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else if (panelType === 'preview') {
            previewArea.classList.add('panel-open');
            floatingPreviewBtn.classList.add('active');
            floatingPreviewBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    }

    // 패널 닫기
    closePanel(panelType, hideOverlay = true) {
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');
        const previewArea = document.getElementById('previewArea');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const floatingPreviewBtn = document.getElementById('floatingPreviewBtn');

        this.panelStates[panelType] = false;

        if (panelType === 'sidebar') {
            sidebar.classList.remove('panel-open');
            hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else if (panelType === 'preview') {
            previewArea.classList.remove('panel-open');
            floatingPreviewBtn.classList.remove('active');
            floatingPreviewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }

        const OVERLAY_TRANSITION_DURATION = 300;
        if (hideOverlay && !Object.values(this.panelStates).some(state => state)) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.style.display = 'none', OVERLAY_TRANSITION_DURATION);
            document.body.style.overflow = '';
        }
    }

    // 모든 패널 닫기
    closeAllPanels() {
        Object.keys(this.panelStates).forEach(panelType => {
            if (this.panelStates[panelType]) this.closePanel(panelType, false);
        });

        const OVERLAY_TRANSITION_DURATION = 300;
        const overlay = document.getElementById('overlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', OVERLAY_TRANSITION_DURATION);
        document.body.style.overflow = '';
    }

    // 스와이프 제스처 초기화
    initSwipeGestures(sidebar, previewArea) {
        let startX = 0;
        let startY = 0;
        const SWIPE_THRESHOLD = 100;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };

        if (sidebar) {
            sidebar.addEventListener('touchstart', handleTouchStart);
            sidebar.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = Math.abs(startY - endY);
                if (diffX > SWIPE_THRESHOLD && diffX > diffY) this.closePanel('sidebar');
            });
        }

        if (previewArea) {
            previewArea.addEventListener('touchstart', handleTouchStart);
            previewArea.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = Math.abs(startY - endY);
                if (diffX > SWIPE_THRESHOLD && diffX > diffY) this.closePanel('preview');
            });
        }
    }

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllPanels();
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.blockManager.clearProject();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.copyToClipboard();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();

                // 활성화된 입력 필드가 없을 때만 복사 기능 실행
                if (document.activeElement.tagName.toLowerCase() !== 'textarea') {
                    this.copyToClipboard();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                e.preventDefault();
                this.togglePanel('sidebar');
            }

            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                this.togglePanel('preview');
            }
        });
    }

    // 애니메이션 스타일 추가
    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutToRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
            
            .block-entering {
                animation: slideIn 0.4s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    // 프리셋 블록 추가
    addPresetBlock(tagName) {
        if (!TAG_PRESETS[tagName]) {
            console.error(`Unknown preset: ${tagName}`);
            return;
        }
        
        this.blockManager.addBlock(tagName);
        
        // 피드백 효과
        const presetBtn = document.querySelector(`[data-tag="${tagName}"]`);
        if (presetBtn) {
            presetBtn.style.transform = 'scale(0.95)';
            setTimeout(() => presetBtn.style.transform = '', 150);
        }

        // 모바일에서 블록 추가 후 사이드바 자동 닫기
        const SIDEBAR_CLOSE_DELAY = 800;
        if (window.innerWidth <= 768) {
            setTimeout(() => this.closePanel('sidebar'), SIDEBAR_CLOSE_DELAY);
        }
    }

    // 클립보드에 복사
    copyToClipboard() {
        const xmlContent = this.blockManager.generateXML();
        if (!xmlContent.trim()) {
            showNotification('복사할 내용이 없습니다.', 'error');
            return;
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(xmlContent).then(() => {
                showNotification('프롬프트가 클립보드에 복사되었습니다!', 'success');
                
                // 버튼 피드백
                const buttons = [document.getElementById('copyBtnHeader'), document.getElementById('copyBtn')];
                buttons.forEach(btn => {
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
                        btn.disabled = true;
                        
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.disabled = false;
                        }, 2000);
                    }
                });
                
            }).catch(err => {
                console.error('클립보드 복사 실패:', err);
                showNotification('클립보드 복사에 실패했습니다.', 'error');
            });
        } else {
            showNotification('이 브라우저에서는 클립보드 복사가 지원되지 않습니다.', 'error');
        }
    }

    // 윈도우 리사이즈 처리
    handleResize() {
        const width = window.innerWidth;
        if (width < 768) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
            this.closeAllPanels();
        }
    }
}

// DOM이 로드되면 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    const app = new PromptEditorApp();
    app.init();
    window.PromptEditor = app;
    console.log('애플리케이션 로드 완료 - 최종 수정 버전');
});
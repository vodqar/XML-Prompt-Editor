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
        
        this.renderPresets(); // ✨ 프리셋 버튼 동적 생성 (개선됨)
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.addAnimationStyles();
        this.handleResize();
        
        this.isInitialized = true;
        console.log('프롬프트 에디터가 초기화되었습니다. - v2.1 (자동완성 기능 추가)');
    }

    // ✨ 프리셋 버튼 동적 렌더링 (개선된 버전)
    renderPresets() {
        const sidebar = document.getElementById('sidebar');
        const creditsSection = sidebar.querySelector('.credits-section');
        
        if (!sidebar || !creditsSection) {
            console.error("사이드바 또는 크레딧 섹션을 찾을 수 없습니다.");
            return;
        }

        // 기존 프리셋 카테고리들 삭제
        sidebar.querySelectorAll('.preset-category, .preset-divider').forEach(el => el.remove());

        // TAG_PRESETS 배열을 기반으로 카테고리와 버튼 생성
        TAG_PRESETS.forEach(category => {
            // 구분선 생성
            const divider = document.createElement('div');
            divider.className = 'preset-divider';
            sidebar.insertBefore(divider, creditsSection);

            // 카테고리 컨테이너 생성
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'preset-category';
            
            // 카테고리 제목 생성
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.title;
            categoryContainer.appendChild(categoryTitle);

            // 버튼 컨테이너 생성
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'preset-buttons';

            // 각 프리셋에 대한 버튼 생성
            category.presets.forEach(preset => {
                const button = document.createElement('button');
                button.className = 'preset-btn';
                button.setAttribute('data-tag', preset.key);
                button.title = preset.description;
                button.innerHTML = `<i class="${preset.icon}"></i> ${preset.name}`;
                buttonsContainer.appendChild(button);
            });

            categoryContainer.appendChild(buttonsContainer);
            sidebar.insertBefore(categoryContainer, creditsSection);
        });
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // ✨ 이벤트 위임을 사용하여 동적으로 생성된 버튼 처리
        document.getElementById('sidebar').addEventListener('click', (e) => {
            const presetBtn = e.target.closest('.preset-btn');
            if (presetBtn) {
                const tagName = presetBtn.getAttribute('data-tag');
                this.addPresetBlock(tagName);
            }
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

    // --- ✨ 새로운 메서드: 자동완성을 위한 모든 태그 목록 반환 ---
    getAllTags() {
        const presetTags = TAG_PRESETS.flatMap(category => category.presets.map(p => p.key));
        const customTags = this.blockManager.blocks.map(b => b.tagName);
        return [...new Set([...presetTags, ...customTags])].sort();
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
            @keyframes slideInFromRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes slideOutToRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
            .block-entering { animation: slideIn 0.4s ease-out; }
        `;
        document.head.appendChild(style);
    }

    // 프리셋 블록 추가
    addPresetBlock(tagName) {
        const allPresets = TAG_PRESETS.flatMap(category => category.presets);
        const preset = allPresets.find(p => p.key === tagName);

        if (!preset) {
            console.error(`Unknown preset: ${tagName}`);
            return;
        }
        
        this.blockManager.addBlock(tagName);
        
        const presetBtn = document.querySelector(`[data-tag="${tagName}"]`);
        if (presetBtn) {
            presetBtn.style.transform = 'scale(0.95)';
            setTimeout(() => presetBtn.style.transform = '', 150);
        }

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
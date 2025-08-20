/**
 * ===================================================================
 * XML 프롬프트 에디터 - 메인 애플리케이션 로직
 * ===================================================================
 * 이 파일은 UI 이벤트 처리, 뷰 전환, 패널 관리 등 
 * 애플리케이션의 전반적인 동작을 제어합니다.
 */
class PromptEditorApp {
    constructor() {
        this.blockManager = new BlockManagerClass();
        this.isInitialized = false;
        this.panelStates = {
            sidebar: false,
        };
        this.currentView = 'edit';
    }

    init() {
        if (this.isInitialized) return;
        
        window.blockManager = this.blockManager;
        
        if (!this.blockManager.init()) {
            console.error('BlockManager 초기화 실패');
            return;
        }
        
        this.renderPresets();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.addAnimationStyles();
        this.handleResize();
        
        this.isInitialized = true;
        console.log('프롬프트 에디터가 초기화되었습니다. (헤더 통합 메뉴)');
    }

    renderPresets() {
        const sidebar = document.getElementById('sidebar');
        const creditsSection = sidebar.querySelector('.credits-section');
        
        if (!sidebar || !creditsSection) {
            console.error("사이드바 또는 크레딧 섹션을 찾을 수 없습니다.");
            return;
        }

        sidebar.querySelectorAll('.preset-category, .preset-divider').forEach(el => el.remove());

        TAG_PRESETS.forEach(category => {
            const divider = document.createElement('div');
            divider.className = 'preset-divider';
            sidebar.insertBefore(divider, creditsSection);

            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'preset-category';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = i18n.t(category.titleKey);
            categoryContainer.appendChild(categoryTitle);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'preset-buttons';

            category.presets.forEach(preset => {
                const button = document.createElement('button');
                button.className = 'preset-btn';
                button.setAttribute('data-tag', preset.key);
                button.title = i18n.t(preset.descriptionKey);
                button.innerHTML = `<i class="${preset.icon}"></i> ${i18n.t(preset.nameKey)}`;
                buttonsContainer.appendChild(button);
            });

            categoryContainer.appendChild(buttonsContainer);
            sidebar.insertBefore(categoryContainer, creditsSection);
        });
    }

    setupEventListeners() {
        const langBtn = document.getElementById('langBtn');
        const langDropdown = document.getElementById('langDropdown');

        if(langBtn && langDropdown) {
            langBtn.addEventListener('click', () => {
                langDropdown.classList.toggle('show');
            });

            langDropdown.addEventListener('click', async (e) => {
                e.preventDefault();
                const target = e.target.closest('.lang-option');
                if (target) {
                    const selectedLang = target.getAttribute('data-lang');
                    if (selectedLang !== i18n.currentLang) {
                        await i18n.loadLanguage(selectedLang);
                        i18n.updateContent();
                        this.renderPresets();
                        this.blockManager.renderAllBlocks();
                        this.switchView(this.currentView, true);
                    }
                    langDropdown.classList.remove('show');
                }
            });

            window.addEventListener('click', (e) => {
                if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                    langDropdown.classList.remove('show');
                }
            });
        }

        document.getElementById('sidebar').addEventListener('click', (e) => {
            const presetBtn = e.target.closest('.preset-btn');
            if (presetBtn) {
                const tagName = presetBtn.getAttribute('data-tag');
                this.addPresetBlock(tagName);
            }
        });

        const viewEditBtn = document.getElementById('view-edit-btn');
        const viewPreviewBtn = document.getElementById('view-preview-btn');
        if (viewEditBtn && viewPreviewBtn) {
            viewEditBtn.addEventListener('click', () => this.switchView('edit'));
            viewPreviewBtn.addEventListener('click', () => this.switchView('preview'));
        }

        this.initPanelSystem();
        this.initInlineBlockAdd();

        const clearAllBtn = document.getElementById('clearAllBtn');
        const copyBtnHeader = document.getElementById('copyBtnHeader');
        const addBlockBtn = document.getElementById('addBlockBtn');

        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.blockManager.clearProject());
        if (copyBtnHeader) copyBtnHeader.addEventListener('click', () => this.copyToClipboard());
        if (addBlockBtn) addBlockBtn.addEventListener('click', () => this.showInlineBlockAdd());

        window.addEventListener('resize', () => {
            this.handleResize();
            this.switchView(this.currentView, true);
        });
    }

    switchView(viewName, forceUpdate = false) {
        if (this.currentView === viewName && !forceUpdate) return;
        this.currentView = viewName;

        const viewEditBtn = document.getElementById('view-edit-btn');
        const viewPreviewBtn = document.getElementById('view-preview-btn');
        const editView = document.getElementById('edit-view');
        const previewView = document.getElementById('preview-view');
        const switcherBg = document.querySelector('.switcher-background');

        viewEditBtn.classList.remove('active');
        viewPreviewBtn.classList.remove('active');
        editView.classList.remove('active');
        previewView.classList.remove('active');

        if (viewName === 'edit') {
            viewEditBtn.classList.add('active');
            editView.classList.add('active');
            switcherBg.style.width = `${viewEditBtn.offsetWidth}px`;
            switcherBg.style.transform = `translateX(0)`;
        } else {
            viewPreviewBtn.classList.add('active');
            previewView.classList.add('active');
            switcherBg.style.width = `${viewPreviewBtn.offsetWidth}px`;
            switcherBg.style.transform = `translateX(${viewEditBtn.offsetWidth}px)`;
        }
    }
    
    initPanelSystem() {
        const menuBtn = document.getElementById('headerMenuBtn');
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');

        if (menuBtn) menuBtn.addEventListener('click', () => this.togglePanel('sidebar'));
        if (overlay) overlay.addEventListener('click', () => this.closeAllPanels());
        this.initSwipeGestures(sidebar);
    }

    togglePanel(panelType) {
        if (this.panelStates[panelType]) {
            this.closePanel(panelType);
        } else {
            this.openPanel(panelType);
        }
    }

    openPanel(panelType) {
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.getElementById('headerMenuBtn');

        this.panelStates[panelType] = true;
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';

        if (panelType === 'sidebar') {
            sidebar.classList.add('panel-open');
            if(menuBtn) menuBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    }

    closePanel(panelType, hideOverlay = true) {
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.getElementById('headerMenuBtn');

        this.panelStates[panelType] = false;

        if (panelType === 'sidebar') {
            sidebar.classList.remove('panel-open');
            if(menuBtn) menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }

        if (hideOverlay && !Object.values(this.panelStates).some(state => state)) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.style.display = 'none', 300);
            document.body.style.overflow = '';
        }
    }

    closeAllPanels() {
        if (this.panelStates.sidebar) {
            this.closePanel('sidebar');
        }
    }

    initSwipeGestures(sidebar) {
        let startX = 0; let startY = 0; const SWIPE_THRESHOLD = 100;
        const handleTouchStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
        if (sidebar) {
            sidebar.addEventListener('touchstart', handleTouchStart);
            sidebar.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX; const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX; const diffY = Math.abs(startY - endY);
                if (diffX > SWIPE_THRESHOLD && diffX > diffY) this.closePanel('sidebar');
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllPanels();
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); this.blockManager.clearProject(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.copyToClipboard(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); this.copyToClipboard(); }
            if ((e.ctrlKey || e.metaKey) && e.key === '1') { e.preventDefault(); this.togglePanel('sidebar'); }
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                const nextView = this.currentView === 'edit' ? 'preview' : 'edit';
                this.switchView(nextView);
            }
        });
    }

    copyToClipboard() {
        const xmlContent = this.blockManager.generateXML();
        if (!xmlContent.trim()) {
            showNotification(i18n.t('notification_copy_empty'), 'error');
            return;
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(xmlContent).then(() => {
                showNotification(i18n.t('notification_copy_success'), 'success');
                const copyBtn = document.getElementById('copyBtnHeader');
                if (copyBtn) {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<i class="fas fa-check"></i> ${i18n.t('copied_button_text')}`;
                    copyBtn.disabled = true;
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.disabled = false;
                    }, 2000);
                }
            }).catch(err => {
                console.error('클립보드 복사 실패:', err);
                showNotification(i18n.t('notification_copy_failed'), 'error');
            });
        } else {
            showNotification(i18n.t('notification_clipboard_unsupported'), 'error');
        }
    }
    
    getAllTags() {
        const presetTags = TAG_PRESETS.flatMap(category => category.presets.map(p => p.key));
        const customTags = this.blockManager.blocks.map(b => b.tagName);
        return [...new Set([...presetTags, ...customTags])].sort();
    }

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

    confirmInlineBlockAdd() {
        const inlineAddInput = document.getElementById('inlineAddInput');
        const value = inlineAddInput.value.trim();
        
        if (value) {
            this.blockManager.addBlock(value.toLowerCase());
            inlineAddInput.value = '';
            this.hideInlineBlockAdd();
            const message = i18n.t('notification_block_added').replace('{tagName}', value);
            showNotification(message, 'success');
        }
    }

    hideInlineBlockAdd() {
        const inlineAddContainer = document.getElementById('inlineBlockAdd');
        const inlineAddInput = document.getElementById('inlineAddInput');
        
        if (inlineAddContainer) inlineAddContainer.style.display = 'none';
        if (inlineAddInput) {
            inlineAddInput.value = '';
            inlineAddInput.blur();
        }
    }
    
    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes slideOutToRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
            .block-entering { animation: slideIn 0.4s ease-out; }
        `;
        document.head.appendChild(style);
    }

    addPresetBlock(tagName) {
        this.blockManager.addBlock(tagName);
        const presetBtn = document.querySelector(`[data-tag="${tagName}"]`);
        if (presetBtn) {
            presetBtn.style.transform = 'scale(0.95)';
            setTimeout(() => presetBtn.style.transform = '', 150);
        }
        const SIDEBAR_CLOSE_DELAY = 800;
        if (window.innerWidth <= 768) {
            this.closePanel('sidebar');
        }
    }

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

document.addEventListener('DOMContentLoaded', async () => {
    await i18n.init();
    
    const app = new PromptEditorApp();
    app.init();
    window.PromptEditor = app;

    setTimeout(() => {
        app.switchView('edit', true);
    }, 0);
});

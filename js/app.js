/**
 * ===================================================================
 * XML 프롬프트 에디터 - 메인 애플리케이션 로직
 * ===================================================================
 * 이 파일은 UI 이벤트 처리, 뷰 전환, 패널 및 모달 관리 등 
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
        // 언어 선택 이벤트 리스너
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

        // 사이드바 프리셋 클릭 이벤트
        document.getElementById('sidebar').addEventListener('click', (e) => {
            const presetBtn = e.target.closest('.preset-btn');
            if (presetBtn) {
                const tagName = presetBtn.getAttribute('data-tag');
                this.addPresetBlock(tagName);
            }
        });

        // 뷰 스위처 이벤트 리스너
        const viewEditBtn = document.getElementById('view-edit-btn');
        const viewPreviewBtn = document.getElementById('view-preview-btn');
        if (viewEditBtn && viewPreviewBtn) {
            viewEditBtn.addEventListener('click', () => this.switchView('edit'));
            viewPreviewBtn.addEventListener('click', () => this.switchView('preview'));
        }

        // 가져오기 모달 이벤트 리스너
        this.setupImportModalListeners();

        // 패널 및 인라인 블록 추가 초기화
        this.initPanelSystem();
        this.initInlineBlockAdd();

        // 헤더 버튼 이벤트
        const clearAllBtn = document.getElementById('clearAllBtn');
        const copyBtnHeader = document.getElementById('copyBtnHeader');
        const addBlockBtn = document.getElementById('addBlockBtn');

        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.blockManager.clearProject());
        if (copyBtnHeader) copyBtnHeader.addEventListener('click', () => this.copyToClipboard());
        if (addBlockBtn) addBlockBtn.addEventListener('click', () => this.showInlineBlockAdd());

        // 창 크기 변경 이벤트
        window.addEventListener('resize', () => {
            this.handleResize();
            this.switchView(this.currentView, true);
        });
        // --- 헤더 버튼 리스너 ---
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('aiGenerateBtn')?.addEventListener('click', () => this.openAiModal());
        document.getElementById('importBtn')?.addEventListener('click', () => this.openImportModal());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.blockManager.clearProject());
        document.getElementById('copyBtnHeader')?.addEventListener('click', () => this.copyToClipboard());
        
        // --- 에디터 헤더 리스너 ---
        document.getElementById('addBlockBtn')?.addEventListener('click', () => this.showInlineBlockAdd());
        document.getElementById('view-edit-btn')?.addEventListener('click', () => this.switchView('edit'));
        document.getElementById('view-preview-btn')?.addEventListener('click', () => this.switchView('preview'));

        // --- 기타 UI 리스너 ---
        this.setupLanguageSwitcher();
        this.setupKeyboardShortcuts();
    }

    // --- 모달 공통 로직 ---
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.innerHTML = ''; }, 200);
        }
    }

    // --- 설정 모달 관련 함수 ---
    openSettingsModal() {
        const modalHtml = `
            <div class="modal-content" style="max-width: 700px;">
                <header class="modal-header">
                    <h3 class="modal-title" data-i18n-key="settings_modal_title"></h3>
                    <button class="modal-close-btn">&times;</button>
                </header>
                <div class="settings-modal-layout">
                    <aside class="settings-sidebar">
                        <button class="settings-tab active" data-tab="api">API</button>
                    </aside>
                    <main class="settings-content">
                        <div class="settings-view active" data-view="api">
                            <label for="apiKeyInput" class="modal-label" data-i18n-key="settings_api_key_label"></label>
                            <input type="password" id="apiKeyInput" class="modal-textarea" style="height: auto; font-family: sans-serif;" data-i18n-key="settings_api_key_placeholder" data-i18n-target="placeholder">
                            <p class="modal-feedback" data-i18n-key="settings_api_key_description"></p>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="link" data-i18n-key="settings_api_key_link"></a>
                        </div>
                    </main>
                </div>
                 <footer class="modal-footer">
                    <button class="btn btn-primary" data-action="save" data-i18n-key="settings_button_save"></button>
                </footer>
            </div>
        `;
        const modal = document.getElementById('settingsModal');
        modal.innerHTML = modalHtml;
        i18n.updateContent();

        const apiKeyInput = modal.querySelector('#apiKeyInput');
        apiKeyInput.value = this.apiKey;

        modal.querySelector('.modal-close-btn').addEventListener('click', () => this.closeModal('settingsModal'));
        modal.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.apiKey = apiKeyInput.value.trim();
            localStorage.setItem('gemini_api_key', this.apiKey);
            showNotification(i18n.t('notification_api_key_saved'), 'success');
            this.closeModal('settingsModal');
        });
        
        modal.classList.add('show');
    }

    // --- AI 생성 모달 관련 함수 ---
    openAiModal() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        const modal = document.getElementById('aiModal');
        
        const keyNeededView = `
            <div class="ai-modal-view active">
                <div class="modal-body" style="align-items: center; text-align: center; justify-content: center;">
                    <i class="fas fa-key" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                    <h3 class="modal-title" data-i18n-key="ai_modal_activate_title"></h3>
                    <p class="modal-label" data-i18n-key="ai_modal_activate_desc"></p>
                </div>
                <footer class="modal-footer" style="justify-content: center;">
                     <button class="btn btn-secondary" data-action="close" data-i18n-key="ai_modal_activate_later"></button>
                     <button class="btn btn-primary" data-action="go-settings" data-i18n-key="ai_modal_activate_button"></button>
                </footer>
            </div>`;

        const generateView = `
            <div class="ai-modal-view active">
                <header class="modal-header">
                    <h3 class="modal-title" data-i18n-key="ai_modal_title"></h3>
                    <button class="modal-close-btn">&times;</button>
                </header>
                <div class="modal-body">
                    <label for="aiPromptInput" class="modal-label" data-i18n-key="ai_modal_input_label"></label>
                    <textarea id="aiPromptInput" class="modal-textarea" placeholder="..."></textarea>
                    <!-- 아래 경고 문구 P 태그를 추가합니다. -->
                    <p class="modal-warning" data-i18n-key="ai_modal_alpha_warning"></p>
                </div>
                <footer class="modal-footer">
                    <a href="#" class="link" data-action="go-settings" data-i18n-key="ai_modal_change_key_link"></a>
                    <div class="modal-actions">
                         <button class="btn btn-primary" data-action="generate">
                            <i class="fas fa-magic-wand-sparkles"></i>
                            <span data-i18n-key="ai_generate_button"></span>
                         </button>
                    </div>
                </footer>
            </div>`;

        modal.innerHTML = `<div class="modal-content">${this.apiKey ? generateView : keyNeededView}</div>`;
        i18n.updateContent();
        this.setupAiModalListeners();
        modal.classList.add('show');
    }

    setupAiModalListeners() {
        const modal = document.getElementById('aiModal');
        if (!modal) return;

        modal.querySelector('.modal-close-btn')?.addEventListener('click', () => this.closeModal('aiModal'));
        modal.querySelector('[data-action="close"]')?.addEventListener('click', () => this.closeModal('aiModal'));
        modal.querySelector('[data-action="go-settings"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('aiModal');
            this.openSettingsModal();
        });
        modal.querySelector('[data-action="generate"]')?.addEventListener('click', (e) => this.handleAiGeneration(e.currentTarget));
    }

    async handleAiGeneration(generateBtn) {
        const promptInput = document.getElementById('aiPromptInput');
        const userPrompt = promptInput.value.trim();
        if (!userPrompt) return;

        if (!this.apiKey) {
            showNotification(i18n.t('notification_api_key_missing'), 'error');
            this.closeModal('aiModal');
            this.openSettingsModal();
            return;
        }

        const originalBtnContent = generateBtn.innerHTML;
        generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-i18n-key="ai_modal_button_generating"></span>`;
        i18n.updateContent();
        generateBtn.disabled = true;
        promptInput.disabled = true;

        const systemPrompt = `
<role>
당신은 OpenAI, Anthropic 등 선두적인 LLM 기업의 프롬프트 엔지니어링을 담당하는 시니어 엔지니어입니다.
</role>

<instructions>
- 사용자의 질문을 해체하여 문맥과 궁극적인 목표를 파악합니다.
- 파악한 결과를 <available_tags>에 정의된 XML 태그를 사용해 구조화된 프롬프트로 재구성합니다.
- 모든 태그를 사용해야할 의무는 없습니다. 필요한 태그만 사용할 수 있도록 합니다.
- 그러나 <role> 태그는 반드시 사용하여야합니다.
- 사용자가 입력한 언어에 맞춰서 프롬프트를 작성합니다.
</instructions>

<available_tags>
- <role>: AI의 역할이나 직업을 지정할 때 사용합니다. (예: "당신은 변호사입니다.")
- <instructions>: 구체적인 작업 지시나 단계를 명시할 때 사용합니다.
- <context>: 작업에 필요한 배경 정보나 상황을 설명할 때 사용합니다.
- <examples>: AI에게 보여줄 입출력 예시를 제공할 때 사용합니다.
- <document>: 분석할 긴 문서나 데이터를 감쌀 때 사용합니다.
- <data>: 표, CSV 등 구조화된 데이터를 제공할 때 사용합니다.
- <thinking>: AI에게 단계별로 생각하도록 유도할 때 사용합니다.
- <answer>: AI가 최종 답변을 작성할 공간을 지정할 때 사용합니다.
- <formatting>: 출력물의 스타일 예시를 제공할 때 사용합니다.
- <constraints>: 길이, 어조, 금지사항 등 제약 조건을 명시할 때 사용합니다.
- <output>: 최종 출력물에 대한 구체적인 요구사항을 명시할 때 사용합니다.
</available_tags>

<context>
사용자의 요청이 단순하고 하나의 지시로 이루어져 있다면, 전체 내용을 <instructions> 태그 안에 넣으세요.
</context>

<examples>
사용자 입력: "이 글을 5살 아이도 이해할 수 있게 친절한 선생님 말투로 요약해줘."
당신이 생성해야 할 XML:
<role>당신은 친절한 선생님입니다.</role>
<instructions>주어진 글을 요약합니다.</instructions>
<constraints>5살 아이도 이해할 수 있는 수준으로 작성해야 합니다.</constraints>

사용자 입력: "너는 셰익스피어야. '영원한 사랑'을 주제로 짧은 시를 써줘. 소네트 형식으로."
당신이 생성해야 할 XML:
<role>당신은 셰익스피어입니다.</role>
<instructions>'영원한 사랑'을 주제로 짧은 시를 작성합니다.</instructions>
<formatting>소네트 형식</formatting>
</examples>

<constraints>
절대 XML 구조 외의 다른 설명이나 대화, 답변을 해서는 안 됩니다. 오직 XML 코드만 출력해야 합니다. 당신의 유일한 임무는 지시에 따라 프롬프트를 재구성하는 것 뿐입니다.
</constraints>

<thinking>
[모든 과정은 차근차근(Step by step) 생각하세요.]
</thinking>
`;
        
        const fullPrompt = `${systemPrompt}\n\n사용자 입력: "${userPrompt}"\n당신이 생성해야 할 XML:`;

        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API 요청에 실패했습니다.');
            }

            const data = await response.json();
            const xmlResult = data.candidates[0].content.parts[0].text;
            
            this.blockManager.importFromXML(xmlResult, 'replace');
            this.closeModal('aiModal');

        } catch (error) {
            console.error("AI Generation Error:", error);
            showNotification(error.message || i18n.t('notification_ai_error'), 'error');
        } finally {
            generateBtn.innerHTML = originalBtnContent;
            generateBtn.disabled = false;
            if(promptInput) promptInput.disabled = false;
        }
    }

    // --- 가져오기 모달 관련 함수 ---
    setupImportModalListeners() {
        const importBtn = document.getElementById('importBtn');
        const closeImportModalBtn = document.getElementById('closeImportModalBtn');
        const cancelImportBtn = document.getElementById('cancelImportBtn');
        const applyImportBtn = document.getElementById('applyImportBtn');
        const importModal = document.getElementById('importModal');
        const xmlInput = document.getElementById('xmlInput');
        const validationFeedback = document.getElementById('validationFeedback');

        if (importBtn) importBtn.addEventListener('click', () => this.openImportModal());
        if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', () => this.closeImportModal());
        if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => this.closeImportModal());
        if (importModal) {
            importModal.addEventListener('click', (e) => {
                if (e.target === importModal) this.closeImportModal();
            });
        }

        // 실시간 유효성 검사
        if (xmlInput) {
            xmlInput.addEventListener('input', () => {
                const text = xmlInput.value.trim();
                if (text.startsWith('<') && text.endsWith('>')) {
                    validationFeedback.textContent = i18n.t('import_validation_valid');
                    validationFeedback.style.color = 'green';
                    applyImportBtn.disabled = false;
                } else if (text === '') {
                    validationFeedback.textContent = '';
                    applyImportBtn.disabled = true;
                } else {
                    validationFeedback.textContent = i18n.t('import_validation_invalid');
                    validationFeedback.style.color = 'red';
                    applyImportBtn.disabled = true;
                }
            });
        }
        
        // 적용 버튼 클릭 이벤트
        if (applyImportBtn) {
            applyImportBtn.addEventListener('click', () => {
                const xmlText = xmlInput.value;
                const option = document.querySelector('input[name="import-option"]:checked').value;
                
                try {
                    const count = this.blockManager.importFromXML(xmlText, option);
                    if (count > 0) {
                        const message = i18n.t('notification_import_success').replace('{count}', count);
                        showNotification(message, 'success');
                    }
                    this.closeImportModal();
                } catch (error) {
                    showNotification(i18n.t('notification_import_error'), 'error');
                    console.error("Import Error:", error);
                }
            });
        }
    }

    openImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) modal.classList.add('show');
    }

    closeImportModal() {
        const modal = document.getElementById('importModal');
        const textarea = document.getElementById('xmlInput');
        const feedback = document.getElementById('validationFeedback');
        const applyBtn = document.getElementById('applyImportBtn');
        
        if (modal) modal.classList.remove('show');
        if (textarea) textarea.value = '';
        if (feedback) feedback.textContent = '';
        if (applyBtn) applyBtn.disabled = true;
    }

    // --- 뷰 전환 함수 ---
    switchView(viewName) {
        // forceUpdate 파라미터는 더 이상 필요 없으므로 제거했습니다.
        if (this.currentView === viewName) return;
        this.currentView = viewName;

        const viewEditBtn = document.getElementById('view-edit-btn');
        const viewPreviewBtn = document.getElementById('view-preview-btn');
        const editView = document.getElementById('edit-view');
        const previewView = document.getElementById('preview-view');
        
        // 핸들(.switcher-background)을 제어하는 코드는 모두 삭제합니다.
        // const switcherBg = document.querySelector('.switcher-background');

        // 모든 뷰와 버튼에서 active 클래스 제거
        viewEditBtn.classList.remove('active');
        viewPreviewBtn.classList.remove('active');
        editView.classList.remove('active');
        previewView.classList.remove('active');

        // 선택된 뷰와 버튼에만 active 클래스 추가
        if (viewName === 'edit') {
            viewEditBtn.classList.add('active');
            editView.classList.add('active');
        } else {
            viewPreviewBtn.classList.add('active');
            previewView.classList.add('active');
        }
    }
    
    // --- 패널 관리 함수 ---
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

    // --- 기타 유틸리티 함수 ---
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
    // i18n을 먼저 초기화해서 언어 파일을 불러오고 화면 텍스트를 세팅합니다.
    await i18n.init();
    
    // 언어 세팅이 완료된 후, 기존 애플리케이션 로직을 실행합니다.
    const app = new PromptEditorApp();
    app.init();
    window.PromptEditor = app;

    // --- 스위처 핸들 버그 최종 수정 ---
    // 웹 폰트(Noto Sans KR)가 모두 로드되었는지 확인하고,
    // 로드가 완료되면 스위처의 너비를 재계산합니다.
    // document.fonts.ready는 모든 폰트 로딩이 끝났을 때를 알려주는 확실한 방법입니다.
    document.fonts.ready.then(() => {
        app.switchView('edit', true);
    });
});
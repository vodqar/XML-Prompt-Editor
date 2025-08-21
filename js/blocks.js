// 블록 관리 클래스
class PromptBlock {
    constructor(tagName, content = '', id = null) {
        this.id = id || this.generateId();
        this.tagName = tagName;
        this.content = content;
        
        // 이 블록이 어떤 프리셋에 해당하는지 찾습니다. (없을 수도 있습니다)
        const allPresets = TAG_PRESETS.flatMap(category => category.presets);
        this.preset = allPresets.find(p => p.key === tagName) || null;

        // 자동완성 기능의 상태를 관리하는 객체입니다.
        this.autocomplete = {
            active: false,      // 자동완성 창이 활성화되었는지 여부
            triggerIndex: -1,   // 자동완성이 시작된 텍스트 위치 (예: '<'의 위치)
            activeIndex: -1,    // 현재 하이라이트된 추천 항목의 인덱스
            suggestions: [],    // 추천 목록 배열
            element: null       // 자동완성 창의 HTML 요소
        };
    }

    generateId() {
        return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 이 블록에 해당하는 HTML 요소를 생성합니다.
    createElement() {
        const blockElement = document.createElement('div');
        blockElement.className = 'prompt-block';
        blockElement.setAttribute('data-block-id', this.id);

        const icon = this.preset ? `<i class="${this.preset.icon}"></i>` : '<i class="fas fa-tag"></i>';
        
        // 1. i18n을 통해 placeholder 텍스트를 가져옵니다.
        const placeholderText = this.preset ? i18n.t(this.preset.placeholderKey) : i18n.t('default_block_placeholder');
        // 2. 텍스트 안의 \n(줄바꿈 문자)을 HTML placeholder가 인식하는 &#10;으로 변경합니다.
        const placeholder = placeholderText.replace(/\\n/g, '&#10;');
        
        const templatesHTML = this.createTemplatesHTML();


        blockElement.innerHTML = `
            <div class="block-header">
                <div class="block-tag">
                    ${icon}
                    <span>&lt;${this.tagName}&gt;</span>
                </div>
                <div class="block-actions">
                    <button class="block-btn move" title="Move"><i class="fas fa-grip-vertical"></i></button>
                    <button class="block-btn delete" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="block-content">
                ${templatesHTML}
                <textarea placeholder="${placeholder}" rows="4">${this.content}</textarea>
            </div>
        `;
        // 생성된 HTML 요소에 필요한 이벤트들을 연결합니다.
        this.attachEventListeners(blockElement);
        return blockElement;
    }

    // 프리셋에 정의된 템플릿 버튼들의 HTML을 생성합니다.
    createTemplatesHTML() {
        if (!this.preset || !this.preset.promptTemplates) return '';
        // ✨ 변경점: labelKey를 사용해 버튼 이름을 가져옵니다.
        const buttonsHTML = this.preset.promptTemplates.map((template, index) => 
            `<button class="template-btn" data-template-index="${index}">${i18n.t(template.labelKey)}</button>`
        ).join('');
        return `<div class="template-container">${buttonsHTML}</div>`;
    }

    // HTML 요소에 각종 이벤트 리스너를 연결합니다.
    attachEventListeners(element) {
        const textarea = element.querySelector('textarea');
        const deleteBtn = element.querySelector('.block-btn.delete');

        // 텍스트 입력, 키보드 입력, 포커스 아웃 이벤트를 감지합니다.
        textarea.addEventListener('input', (e) => this.handleTextareaInput(e, false));
        textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
        textarea.addEventListener('blur', () => this.hideAutocomplete());
        
        deleteBtn.addEventListener('click', () => window.blockManager.removeBlock(this.id));
        
        const templateContainer = element.querySelector('.template-container');
        if (templateContainer) {
            templateContainer.addEventListener('click', (e) => this.handleTemplateClick(e));
        }
    }

    // 템플릿 버튼을 클릭했을 때의 동작을 처리합니다.
    handleTemplateClick(e) {
        const clickedBtn = e.target.closest('.template-btn');
        if (!clickedBtn) return;

        const textarea = clickedBtn.closest('.block-content').querySelector('textarea');
        const templateContainer = clickedBtn.parentElement;
        const allowMultiple = this.preset.allowMultiple || false;

        if (allowMultiple) {
            clickedBtn.classList.toggle('active');
            
            const activeTemplates = Array.from(templateContainer.querySelectorAll('.template-btn.active'))
                .map(btn => {
                    const index = parseInt(btn.dataset.templateIndex);
                    return i18n.t(this.preset.promptTemplates[index].valueKey);
                });
            
            textarea.value = activeTemplates.join('\n\n---\n\n');
        } else {
            const isActive = clickedBtn.classList.contains('active');
            templateContainer.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
            
            if (isActive) {
                textarea.value = '';
            } else {
                clickedBtn.classList.add('active');
                const index = parseInt(clickedBtn.dataset.templateIndex);
                textarea.value = i18n.t(this.preset.promptTemplates[index].valueKey);
            }
        }
        
        this.handleTextareaInput({ target: textarea }, true);
        textarea.focus();
    }
    
    // 사용자가 텍스트를 입력할 때마다 호출됩니다.
    handleTextareaInput(e, isTemplateClick = false) {
        this.content = e.target.value;
        this.autoResize(e);
        window.blockManager.updatePreview();

        // 자동완성 기능을 활성화할지 결정하는 로직입니다.
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = this.content.substring(0, cursorPos);
        // 사용자가 '<' 다음에 영문/숫자를 입력하는 패턴을 찾습니다.
        const triggerMatch = textBeforeCursor.match(/<([a-zA-Z0-9]*)$/);

        if (triggerMatch) {
            this.autocomplete.active = true;
            this.autocomplete.triggerIndex = triggerMatch.index;
            const query = triggerMatch[1];
            this.showAutocomplete(query, e.target);
        } else {
            this.hideAutocomplete();
        }

        // 사용자가 직접 타이핑한 경우, 활성화된 템플릿 버튼의 하이라이트를 해제합니다.
        if (!isTemplateClick && !this.preset.allowMultiple) {
            const blockElement = document.querySelector(`[data-block-id="${this.id}"]`);
            if(blockElement) {
                blockElement.querySelectorAll('.template-btn.active').forEach(btn => btn.classList.remove('active'));
            }
        }
    }

    // 텍스트 내용에 따라 입력창의 높이를 자동으로 조절합니다.
    autoResize(e) {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }

    // 이 블록의 내용을 XML 형식으로 변환합니다.
    toXML() {
        if (!this.content.trim()) return `<${this.tagName}></${this.tagName}>`;
        return `<${this.tagName}>\n${this.content}\n</${this.tagName}>`;
    }

    // --- 자동완성 기능 관련 메서드들 ---
    showAutocomplete(query, textarea) {
        const allTags = window.PromptEditor.getAllTags();
        const suggestions = allTags.filter(tag => tag.startsWith(query.toLowerCase()));
        this.autocomplete.suggestions = suggestions;
        if (suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }
        if (!this.autocomplete.element) {
            this.autocomplete.element = document.createElement('div');
            this.autocomplete.element.className = 'autocomplete-suggestions';
            const parentBlock = document.querySelector(`[data-block-id="${this.id}"]`);
            parentBlock.appendChild(this.autocomplete.element);
        }
        this.autocomplete.element.innerHTML = suggestions.map((tag, index) =>
            `<div data-index="${index}">${tag}</div>`
        ).join('');
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
        const lines = textarea.value.substring(0, this.autocomplete.triggerIndex).split('\n').length;
        const top = textarea.offsetTop + (lines * lineHeight) + 5;
        const left = textarea.offsetLeft + 10;
        this.autocomplete.element.style.top = `${top}px`;
        this.autocomplete.element.style.left = `${left}px`;
        this.autocomplete.activeIndex = 0;
        this.autocomplete.element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const target = e.target.closest('div[data-index]');
            if (target) {
                this.selectAutocomplete(parseInt(target.dataset.index), textarea);
            }
        });
    }
    hideAutocomplete() {
        if (this.autocomplete.element) {
            this.autocomplete.element.remove();
            this.autocomplete.element = null;
        }
        this.autocomplete.active = false;
        this.autocomplete.activeIndex = -1;
    }
    handleKeyDown(e) {
        if (!this.autocomplete.active) return;
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
            e.preventDefault();
        }
        switch(e.key) {
            case 'ArrowDown':
                this.autocomplete.activeIndex = (this.autocomplete.activeIndex + 1) % this.autocomplete.suggestions.length;
                this.updateActiveSuggestion();
                break;
            case 'ArrowUp':
                this.autocomplete.activeIndex = (this.autocomplete.activeIndex - 1 + this.autocomplete.suggestions.length) % this.autocomplete.suggestions.length;
                this.updateActiveSuggestion();
                break;
            case 'Enter':
            case 'Tab':
                if (this.autocomplete.activeIndex !== -1) {
                    this.selectAutocomplete(this.autocomplete.activeIndex, e.target);
                }
                break;
            case 'Escape':
                this.hideAutocomplete();
                break;
        }
    }
    updateActiveSuggestion() {
        if (!this.autocomplete.element) return;
        const suggestions = this.autocomplete.element.querySelectorAll('div');
        suggestions.forEach((div, index) => {
            div.classList.toggle('active', index === this.autocomplete.activeIndex);
        });
        suggestions[this.autocomplete.activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
    selectAutocomplete(index, textarea) {
        const selectedTag = this.autocomplete.suggestions[index];
        const textBefore = this.content.substring(0, this.autocomplete.triggerIndex);
        const textAfter = this.content.substring(textarea.selectionStart);
        const newContent = `${textBefore}<${selectedTag}>`;
        textarea.value = newContent + textAfter;
        this.content = textarea.value;
        const newCursorPos = newContent.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        this.hideAutocomplete();
        window.blockManager.updatePreview();
    }
}

class BlockManagerClass {
    constructor() {
        this.blocks = [];
        this.container = null;
        this.previewElement = null;
        this.emptyState = null;
    }
    init() {
        this.container = document.getElementById('blockContainer');
        this.previewElement = document.getElementById('previewCode');
        this.emptyState = document.getElementById('emptyState');
        if (!this.container || !this.previewElement || !this.emptyState) {
            console.error('필수 DOM 요소를 찾을 수 없습니다.');
            return false;
        }
        this.updateDisplay();
		new Sortable(this.container, {
			animation: 150,
			handle: '.block-header',
            filter: '.block-actions', 
			onEnd: (evt) => {
				const movedItem = this.blocks.splice(evt.oldIndex, 1)[0];
				this.blocks.splice(evt.newIndex, 0, movedItem);
				this.updatePreview();
			}
		});
        return true;
    }
    addBlock(tagName, content = '') {
        const block = new PromptBlock(tagName, content);
        this.blocks.push(block);
        this.renderBlock(block);
        this.updateDisplay();
        setTimeout(() => {
            const element = this.container.querySelector(`[data-block-id="${block.id}"] textarea`);
            if (element) element.focus();
        }, 100);
    }
    removeBlock(blockId) {
        const index = this.blocks.findIndex(block => block.id === blockId);
        if (index === -1) return;
        const element = this.container.querySelector(`[data-block-id="${blockId}"]`);
        if (!element) return;
        const BLOCK_SCALE_DURATION = 300;
        const BLOCK_HEIGHT_DURATION = 350;
        element.classList.add('block-removing');
        element.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        setTimeout(() => {
            const currentHeight = element.offsetHeight;
            const currentMargin = parseInt(getComputedStyle(element).marginBottom) || 0;
            element.style.height = currentHeight + 'px';
            element.style.marginBottom = currentMargin + 'px';
            element.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                element.style.transition = 'height 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), margin-bottom 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)';
                element.style.height = '0px';
                element.style.marginBottom = '0px';
            });
            setTimeout(() => {
                this.blocks.splice(index, 1);
                element.remove();
                this.updateDisplay();
            }, BLOCK_HEIGHT_DURATION);
        }, BLOCK_SCALE_DURATION);
    }
    renderBlock(block) {
        const element = block.createElement();
        const BLOCK_ENTER_ANIMATION_DURATION = 500;
        element.classList.add('block-entering');
        this.container.appendChild(element);
        setTimeout(() => {
            element.classList.remove('block-entering');
        }, BLOCK_ENTER_ANIMATION_DURATION);
    }
    renderAllBlocks() {
        this.container.innerHTML = '';
        this.blocks.forEach(block => this.renderBlock(block));
    }
    updateDisplay() {
        if (this.blocks.length === 0) {
            this.emptyState.style.display = 'block';
            this.container.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.container.style.display = 'flex';
        }
        this.updatePreview();
    }
    updatePreview() {
        const xmlOutput = this.generateXML();
        this.previewElement.textContent = xmlOutput;
    }
    generateXML() {
        if (this.blocks.length === 0) return '';
        return this.blocks.map(block => block.toXML()).join('\n\n');
    }
    clearProject() {
        // ✨ 변경점: confirm 메시지를 i18n 함수로 가져옵니다.
        if (this.blocks.length > 0 && !confirm(i18n.t('confirm_clear_all'))) {
            return;
        }
        this.blocks = [];
        this.container.innerHTML = '';
        this.updateDisplay();
    }
}

/**
 * 화면 상단 중앙에 캡슐 형태의 알림을 표시합니다.
 * @param {string} message - 표시할 메시지
 * @param {string} [type='info'] - 알림 종류 ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // 이전 알림이 있다면 즉시 제거하여 중복을 방지합니다.
    const existingNotification = document.querySelector('.notification-capsule');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 새로운 알림 요소를 생성합니다.
    const notification = document.createElement('div');
    notification.className = `notification-capsule ${type}`; // 종류에 맞는 CSS 클래스 부여

    // 알림 종류에 따라 적절한 아이콘을 추가합니다.
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-times-circle"></i>';
    }
    notification.innerHTML = `${icon} <span>${message}</span>`;

    // body에 알림을 추가하고, 'slide-in' 애니메이션을 실행합니다.
    document.body.appendChild(notification);
    
    // 강제로 리플로우를 발생시켜 애니메이션이 확실히 동작하도록 합니다.
    void notification.offsetWidth; 
    
    notification.classList.add('show');

    // 2.5초 후에 'slide-out' 애니메이션을 실행하고 DOM에서 제거합니다.
    setTimeout(() => {
        notification.classList.remove('show');
        
        // 사라지는 애니메이션이 끝난 후 요소를 완전히 제거합니다.
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 2500);
}
